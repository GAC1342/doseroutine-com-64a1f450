/**
 * Quick Add Meal — Screen 2 "Review".
 *
 * Everything on this screen recomputes on the client: changing grams rescales
 * that row from its per-100 g values and the sticky totals follow instantly,
 * with no server round-trip. The only network calls are food search (cache
 * first, then USDA) and the final save.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { compressDataUrlForUpload, dataUrlToBlob } from "@/lib/image-downscale";
import { searchFoodDatabase, type FoodSearchResult } from "@/lib/food-db.functions";
import { applyOptimisticMealTotals } from "@/lib/optimistic-meal-totals";
import { hapticSuccess, hapticTap } from "@/lib/haptics";
import type { AnalyzeMealResult } from "@/lib/analyze-meal.server";
import { cn } from "@/lib/utils";
import { userFacingErrorMessage } from "@/lib/error-classify";

export type ReviewItem = {
  key: string;
  name: string;
  grams: number;
  /** Portion multipliers scale against the grams the analyzer first proposed. */
  baseGrams: number;
  per100: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };
  confidence: number;
  source: string;
  foodId?: string | null;
};

const PORTION_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const round = (n: number) => Math.round(Number.isFinite(n) ? n : 0);
const per100Of = (value: number, grams: number) => (grams > 0 ? (value / grams) * 100 : 0);

export function itemsFromAnalysis(result: AnalyzeMealResult): ReviewItem[] {
  return result.items.map((item, index) => ({
    key: `${index}-${item.name}`,
    name: item.name,
    grams: item.grams,
    baseGrams: item.grams,
    per100: {
      calories: per100Of(item.calories, item.grams),
      protein_g: per100Of(item.protein_g, item.grams),
      carbs_g: per100Of(item.carbs_g, item.grams),
      fat_g: per100Of(item.fat_g, item.grams),
      fiber_g: per100Of(item.fiber_g, item.grams),
    },
    confidence: item.confidence,
    source: item.nutrition_source,
  }));
}

export function macrosFor(item: ReviewItem) {
  const f = item.grams / 100;
  return {
    calories: round(item.per100.calories * f),
    protein_g: round(item.per100.protein_g * f),
    carbs_g: round(item.per100.carbs_g * f),
    fat_g: round(item.per100.fat_g * f),
    fiber_g: round(item.per100.fiber_g * f),
  };
}

export function totalsFor(items: ReviewItem[]) {
  return items.reduce(
    (acc, item) => {
      const m = macrosFor(item);
      return {
        calories: acc.calories + m.calories,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
        fiber_g: acc.fiber_g + m.fiber_g,
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );
}

/** Confidence bands the user sees, per the scanner spec. */
export function confidenceChip(value: number): { label: string; tone: string } {
  if (value >= 0.8)
    return {
      label: "High",
      tone: "bg-[color:var(--severity-synergy)]/15 text-[color:var(--severity-synergy)]",
    };
  if (value >= 0.6)
    return {
      label: "Medium — check portions",
      tone: "bg-[color:var(--severity-caution)]/15 text-[color:var(--severity-caution)]",
    };
  return {
    label: "Low — please adjust",
    tone: "bg-[color:var(--severity-avoid)]/15 text-[color:var(--severity-avoid)]",
  };
}

type Props = {
  result: AnalyzeMealResult;
  photoDataUrl: string | null;
  mealType: string;
  /** How the meal was captured: photo | barcode | text. */
  source?: string;
  /** When set, the sheet edits that existing meal row instead of adding one. */
  mealId?: string | null;
  onSaved: () => void;
  onRetry: () => void;
  onClose: () => void;
};

export function QuickMealReview({
  result,
  photoDataUrl,
  mealType,
  source = "photo",
  mealId = null,
  onSaved,
  onRetry,
  onClose,
}: Props) {
  const qc = useQueryClient();
  const search = useServerFn(searchFoodDatabase);
  const editing = Boolean(mealId);

  const [name, setName] = useState(result.meal_name);
  const [items, setItems] = useState<ReviewItem[]>(() => itemsFromAnalysis(result));
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ mode: "add" | "swap"; key?: string } | null>(null);

  const totals = useMemo(() => totalsFor(items), [items]);
  const chip = confidenceChip(result.confidence);

  const setGrams = useCallback((key: string, grams: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, grams: Math.max(0, Math.round(grams)) } : item,
      ),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    hapticTap();
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const applyFood = useCallback(
    (food: FoodSearchResult) => {
      const grams = food.defaultPortionG > 0 ? food.defaultPortionG : 100;
      setItems((prev) => {
        const next: ReviewItem = {
          key: picker?.key ?? `food-${food.id}-${Date.now()}`,
          name: food.name,
          grams,
          baseGrams: grams,
          per100: {
            calories: food.kcal100,
            protein_g: food.protein100,
            carbs_g: food.carbs100,
            fat_g: food.fat100,
            fiber_g: 0,
          },
          confidence: 1,
          source: food.source,
          foodId: food.id,
        };
        if (picker?.mode === "swap" && picker.key) {
          return prev.map((item) => (item.key === picker.key ? { ...next, key: item.key } : item));
        }
        return [...prev, next];
      });
      setPicker(null);
    },
    [picker],
  );

  const save = useCallback(async () => {
    if (saving || items.length === 0) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("You need to be signed in.");

      let storagePath: string | null = null;
      // Editing keeps the photo already in storage; only fresh captures upload.
      if (photoDataUrl && !editing && photoDataUrl.startsWith("data:")) {
        try {
          const path = `${uid}/${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage
            .from("meal-photos")
            .upload(path, dataUrlToBlob(await compressDataUrlForUpload(photoDataUrl)), {
              contentType: "image/jpeg",
            });
          if (!error) storagePath = path;
        } catch {
          // A failed photo upload must never lose the macros already reviewed.
        }
      }

      const payload = {
        user_id: uid,
        label: name.trim().slice(0, 80) || "Meal",
        name: name.trim().slice(0, 80) || "Meal",
        meal_slot: mealType,
        meal_type: mealType,
        source,
        ai_confidence: chip.label.split(" ")[0]?.toLowerCase() ?? "medium",
        health_score: result.health_score,
        ai_items: items.map((item) => ({
          name: item.name,
          portion: `${item.grams} g`,
          grams: item.grams,
          ...macrosFor(item),
          dataSource: item.source,
          foodId: item.foodId ?? null,
        })) as unknown as never,
        est_calories: result.totals.calories,
        est_protein_g: result.totals.protein_g,
        est_carbs_g: result.totals.carbs_g,
        est_fat_g: result.totals.fat_g,
        adj_calories: totals.calories,
        adj_protein_g: totals.protein_g,
        adj_carbs_g: totals.carbs_g,
        adj_fat_g: totals.fat_g,
        fiber_g: totals.fiber_g,
        storage_path: storagePath,
        photo_url: result.photo_url ?? null,
        notes: result.notes || null,
        was_adjusted: totals.calories !== result.totals.calories,
        logged_at: new Date().toISOString(),
      };

      if (mealId) {
        const {
          user_id: _uid,
          storage_path: _sp,
          photo_url: _pu,
          logged_at: _at,
          est_calories: _ec,
          est_protein_g: _ep,
          est_carbs_g: _ecar,
          est_fat_g: _ef,
          ...update
        } = payload;
        const { error } = await supabase.from("meals").update(update).eq("id", mealId);
        if (error) throw error;
        void qc.invalidateQueries({ queryKey: ["macro-progress"] });
        toast.success(`Updated · ${totals.calories} kcal`);
      } else {
        const { error } = await supabase.from("meals").insert(payload);
        if (error) throw error;
        applyOptimisticMealTotals(qc, totals);
        toast.success(`Added · ${totals.calories} kcal`);
      }

      void qc.invalidateQueries({ queryKey: ["today-meals"] });
      void hapticSuccess();
      onSaved();
    } catch (err) {
      toast.error(userFacingErrorMessage(err, "Could not save that meal."));
    } finally {
      setSaving(false);
    }
  }, [
    chip.label,
    editing,
    items,
    mealId,
    mealType,
    name,
    onSaved,
    photoDataUrl,
    qc,
    result,
    saving,
    source,
    totals,
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 pb-40">
        <div className="flex items-start gap-3 pt-1">
          {photoDataUrl ? (
            <img
              src={photoDataUrl}
              alt="Your meal"
              title="Your meal"
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="quick-meal-name">
              Meal name
            </label>
            <Input
              id="quick-meal-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 font-display text-base font-semibold"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", chip.tone)}
                aria-label={`Confidence ${chip.label}`}
              >
                {chip.label}
              </span>
              {result.health_score !== null && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Health {result.health_score}/10
                </span>
              )}
            </div>
          </div>
        </div>

        {result.notes && <p className="mt-3 text-sm text-muted-foreground">{result.notes}</p>}

        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <ItemRow
              key={item.key}
              item={item}
              onGrams={(grams) => setGrams(item.key, grams)}
              onRemove={() => removeItem(item.key)}
              onRename={() => setPicker({ mode: "swap", key: item.key })}
            />
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={() => setPicker({ mode: "add" })}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Add item
        </Button>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/95 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur">
        <p className="mb-1 text-center text-sm font-semibold text-foreground">
          🔥 {totals.calories} kcal · P {totals.protein_g}g · C {totals.carbs_g}g · F {totals.fat_g}
          g
        </p>
        <p className="mb-2 text-center text-[11px] leading-snug text-muted-foreground">
          Estimated from your photo or description — adjust the portions if they look off.
        </p>

        <Button
          type="button"
          className="h-12 w-full text-base"
          disabled={saving || items.length === 0}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {editing ? "Save changes" : "Add to today"}
        </Button>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 w-full text-center text-sm text-muted-foreground underline underline-offset-4"
        >
          {editing ? "Cancel" : "Not food? Try again"}
        </button>
      </div>

      {picker && (
        <FoodPicker
          mode={picker.mode}
          onPick={applyFood}
          onClose={() => setPicker(null)}
          search={search}
        />
      )}

      <button type="button" className="sr-only" onClick={onClose}>
        Close review
      </button>
    </div>
  );
}

function ItemRow({
  item,
  onGrams,
  onRemove,
  onRename,
}: {
  item: ReviewItem;
  onGrams: (grams: number) => void;
  onRemove: () => void;
  onRename: () => void;
}) {
  const macros = macrosFor(item);
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);

  return (
    <li className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-[color:var(--severity-avoid)]/15 text-[color:var(--severity-avoid)]">
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <div
        className="relative rounded-2xl border border-border bg-card p-3 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(event) => {
          startX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchMove={(event) => {
          if (startX.current === null) return;
          const dx = (event.touches[0]?.clientX ?? 0) - startX.current;
          setOffset(Math.min(0, Math.max(-110, dx)));
        }}
        onTouchEnd={() => {
          if (offset < -70) onRemove();
          setOffset(0);
          startX.current = null;
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onRename}
            className="min-w-0 flex-1 text-left font-medium text-foreground underline-offset-4 hover:underline"
          >
            {item.name}
          </button>
          <span className="shrink-0 text-sm font-semibold text-foreground">
            {macros.calories} kcal
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9"
            aria-label={`Decrease ${item.name} by 10 grams`}
            onClick={() => onGrams(item.grams - 10)}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-[68px] text-center text-sm font-semibold tabular-nums">
            {item.grams} g
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9"
            aria-label={`Increase ${item.name} by 10 grams`}
            onClick={() => onGrams(item.grams + 10)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.name}`}
            className="ml-auto tap-target text-muted-foreground hover:text-[color:var(--severity-avoid)]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          role="group"
          aria-label={`Portion size for ${item.name}`}
          className="mt-2 grid grid-cols-6 gap-1"
        >
          {PORTION_STEPS.map((step) => {
            const grams = Math.round(item.baseGrams * step);
            const active = grams === item.grams;
            return (
              <button
                key={step}
                type="button"
                aria-pressed={active}
                onClick={() => onGrams(grams)}
                className={cn(
                  "rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {step}×
              </button>
            );
          })}
        </div>
      </div>
    </li>
  );
}

function FoodPicker({
  mode,
  onPick,
  onClose,
  search,
}: {
  mode: "add" | "swap";
  onPick: (food: FoodSearchResult) => void;
  onClose: () => void;
  search: (args: { data: { query: string } }) => Promise<FoodSearchResult[]>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (value: string) => {
      setQuery(value);
      if (value.trim().length < 2) {
        setResults([]);
        return;
      }
      setBusy(true);
      try {
        setResults(await search({ data: { query: value } }));
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    },
    [search],
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          autoFocus
          value={query}
          placeholder={mode === "swap" ? "Swap for…" : "Search foods"}
          onChange={(event) => void run(event.target.value)}
          className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
        />
        <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {busy && <p className="py-4 text-sm text-muted-foreground">Searching…</p>}
        {!busy && query.trim().length >= 2 && results.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No matches yet — try another name.</p>
        )}
        <ul className="flex flex-col">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => onPick(food)}
                className="w-full border-b border-border/60 py-3 text-left"
              >
                <span className="block font-medium text-foreground">{food.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {food.brand ? `${food.brand} · ` : ""}
                  {Math.round(food.kcal100)} kcal / 100 g · {food.source}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
