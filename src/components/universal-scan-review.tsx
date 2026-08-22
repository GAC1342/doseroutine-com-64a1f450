/**
 * Category-aware review for a scanned product.
 *
 * One scan can be a cereal box, a magnesium bottle or a blister pack, and each
 * needs a different confirmation screen: food shows macros and logs a meal,
 * supplements show the Supplement Facts rows and add to the stack, medications
 * show strength and lot/expiry and never pretend to have calories.
 */
import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Minus, PencilLine, Pill, Plus, ShieldAlert, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { reportBarcodeCorrection } from "@/lib/universal-barcode.functions";
import {
  parseServingUnits,
  scaleNutrition,
  sourceLabel,
  type ProductCategory,
  type UniversalProduct,
} from "@/lib/universal-product";
import { applyOptimisticMealTotals } from "@/lib/optimistic-meal-totals";
import { hapticSuccess } from "@/lib/haptics";
import { focusSafetyOnIngredient, normalizeIngredientQuery } from "@/lib/interaction-focus";
import { userFacingErrorMessage } from "@/lib/error-classify";

type Props = {
  product: UniversalProduct;
  mealType?: string;
  onSaved: () => void;
  onCancel: () => void;
};

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  food: "Food",
  supplement: "Supplement",
  medication: "Medication",
  other: "Product",
};

function confidenceChip(confidence: number) {
  if (confidence >= 0.8)
    return { label: "High confidence", className: "bg-primary/15 text-primary" };
  if (confidence >= 0.55)
    return {
      label: "Medium confidence",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    };
  return { label: "Low confidence — check it", className: "bg-destructive/15 text-destructive" };
}

export function UniversalScanReview({ product, mealType = "snack", onSaved, onCancel }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const submitCorrection = useServerFn(reportBarcodeCorrection);

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState<ProductCategory>(product.category);
  const [servings, setServings] = useState(1);
  const [saving, setSaving] = useState(false);

  const chip = confidenceChip(product.confidence);
  const units = useMemo(() => parseServingUnits(product.serving.size), [product.serving.size]);
  const totals = useMemo(
    () => scaleNutrition(product.nutrition_per_serving, servings),
    [product.nutrition_per_serving, servings],
  );
  const hasMacros = totals.calories != null || totals.protein_g != null;

  /** The name the interactions checker should search for. */
  const activeIngredient = useMemo(() => {
    const candidate =
      product.medication?.active_ingredients?.[0]?.name ??
      product.medication?.generic_name ??
      product.ingredients[0]?.name ??
      name;
    return normalizeIngredientQuery(candidate);
  }, [name, product.ingredients, product.medication]);

  const checkInteractions = useCallback(() => {
    focusSafetyOnIngredient(activeIngredient);
    void navigate({ to: "/safety" });
  }, [activeIngredient, navigate]);

  const rememberCorrection = useCallback(
    async (field: string, oldValue: string | null, newValue: string) => {
      if (!product.code || oldValue === newValue) return;
      try {
        await submitCorrection({ data: { code: product.code, field, oldValue, newValue } });
      } catch {
        // A correction is a nicety — never block the save on it.
      }
    },
    [product.code, submitCorrection],
  );

  const logAsFood = useCallback(async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("You need to be signed in.");
      const label = name.trim().slice(0, 80) || "Scanned item";
      const { error } = await supabase.from("meals").insert({
        user_id: uid,
        label,
        name: label,
        meal_slot: mealType,
        meal_type: mealType,
        source: "barcode",
        ai_confidence: chip.label.split(" ")[0]?.toLowerCase() ?? "medium",
        ai_items: [
          {
            name: label,
            portion: `${servings} × ${product.serving.size ?? "serving"}`,
            calories: totals.calories ?? 0,
            protein_g: totals.protein_g ?? 0,
            carbs_g: totals.carbs_g ?? 0,
            fat_g: totals.fat_g ?? 0,
            dataSource: product.source,
          },
        ] as unknown as never,
        est_calories: product.nutrition_per_serving.calories ?? 0,
        est_protein_g: product.nutrition_per_serving.protein_g ?? 0,
        est_carbs_g: product.nutrition_per_serving.carbs_g ?? 0,
        est_fat_g: product.nutrition_per_serving.fat_g ?? 0,
        adj_calories: totals.calories ?? 0,
        adj_protein_g: totals.protein_g ?? 0,
        adj_carbs_g: totals.carbs_g ?? 0,
        adj_fat_g: totals.fat_g ?? 0,
        fiber_g: totals.fiber_g ?? 0,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
      applyOptimisticMealTotals(qc, {
        calories: totals.calories ?? 0,
        protein_g: totals.protein_g ?? 0,
        carbs_g: totals.carbs_g ?? 0,
        fat_g: totals.fat_g ?? 0,
      });
      void qc.invalidateQueries({ queryKey: ["today-meals"] });
      void qc.invalidateQueries({ queryKey: ["macro-progress"] });
      void hapticSuccess();
      void rememberCorrection("name", product.name, name.trim());
      toast.success(`Added · ${totals.calories ?? 0} kcal`);
      onSaved();
    } catch (err) {
      toast.error(userFacingErrorMessage(err, "Could not log that product."));
    } finally {
      setSaving(false);
    }
  }, [
    chip.label,
    mealType,
    name,
    onSaved,
    product.name,
    product.nutrition_per_serving,
    product.serving.size,
    product.source,
    qc,
    rememberCorrection,
    servings,
    totals,
  ]);

  const addToStack = useCallback(async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("You need to be signed in.");
      const first = product.ingredients[0];
      const strength = product.medication?.active_ingredients?.[0]?.strength ?? null;
      const notes = [
        `Scanned barcode ${product.code}`,
        product.brand ? `Brand: ${product.brand}` : null,
        strength ? `Strength: ${strength}` : null,
        product.gs1?.lot ? `Lot: ${product.gs1.lot}` : null,
        product.gs1?.expiry ? `Expires: ${product.gs1.expiry}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const { error } = await supabase.from("user_compounds").insert({
        user_id: uid,
        custom_name: name.trim().slice(0, 120) || "Scanned product",
        custom_category: category === "medication" ? "medication" : "supplement",
        is_prescription: category === "medication",
        dose_amount: first?.amount ?? 1,
        dose_unit: (first?.unit ?? "mg").toLowerCase() === "iu" ? "iu" : "mg",
        frequency: "daily",
        times_of_day: ["08:00"],
        active: true,
        notes: notes.slice(0, 500),
      });
      if (error) throw error;
      try {
        const { generateScheduleForCurrentUser } = await import("@/lib/schedule");
        await generateScheduleForCurrentUser(7);
      } catch {
        // Schedule regeneration is best-effort.
      }
      void qc.invalidateQueries({ queryKey: ["stack"] });
      void hapticSuccess();
      void rememberCorrection("name", product.name, name.trim());
      if (category !== product.category) {
        void rememberCorrection("category", product.category, category);
      }
      toast.success(`${name.trim() || "Product"} added to your stack`);
      onSaved();
    } catch (err) {
      toast.error(userFacingErrorMessage(err, "Could not add that to your stack."));
    } finally {
      setSaving(false);
    }
  }, [
    category,
    name,
    onSaved,
    product.brand,
    product.category,
    product.code,
    product.gs1,
    product.ingredients,
    product.medication,
    product.name,
    qc,
    rememberCorrection,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            title={product.name}
            width={72}
            height={72}
            loading="lazy"
            className="h-18 w-18 shrink-0 rounded-lg object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <label htmlFor="scan-name" className="sr-only">
            Product name
          </label>
          <Input
            id="scan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-base font-medium"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{CATEGORY_LABEL[category]}</Badge>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chip.className}`}>
              {chip.label}
            </span>
            <span className="text-xs text-muted-foreground">{sourceLabel(product.source)}</span>
          </div>
        </div>
      </div>

      {product.unreadable && product.unreadable.length > 0 && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          We couldn't read {product.unreadable.join(", ")} on that label. Fill it in yourself before
          saving.
        </p>
      )}

      {category !== "medication" && hasMacros && (
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Servings</p>
              <p className="text-xs text-muted-foreground">
                {product.serving.size ?? `${units.count} ${units.noun}`} per serving
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="One serving fewer"
                onClick={() => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 2) / 2))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-sm font-semibold">{servings}</span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="One serving more"
                onClick={() => setServings((s) => Math.min(20, Math.round((s + 0.5) * 2) / 2))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            {[
              ["kcal", totals.calories],
              ["Protein", totals.protein_g],
              ["Carbs", totals.carbs_g],
              ["Fat", totals.fat_g],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md bg-muted/60 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold">{value == null ? "—" : value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {category === "supplement" && product.ingredients.length > 0 && (
        <div className="rounded-lg border">
          <p className="border-b px-3 py-2 text-sm font-medium">Supplement Facts</p>
          <ul className="divide-y text-sm">
            {product.ingredients.map((ing, i) => (
              <li
                key={`${ing.name}-${i}`}
                className="flex items-baseline justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate">{ing.name}</span>
                  {ing.blend && ing.blend.length > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      {ing.blend.join(", ")}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {ing.amount != null ? `${ing.amount}${ing.unit ? ` ${ing.unit}` : ""}` : "—"}
                  {ing.percent_dv != null ? ` · ${ing.percent_dv}% DV` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {category === "medication" && product.medication && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">
            {product.medication.generic_name ?? product.medication.brand_name ?? name}
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {product.medication.active_ingredients.map((a, i) => (
              <li key={`${a.name}-${i}`}>
                {a.name}
                {a.strength ? ` — ${a.strength}` : ""}
              </li>
            ))}
            {product.medication.dosage_form && <li>Form: {product.medication.dosage_form}</li>}
            {product.medication.route && <li>Route: {product.medication.route}</li>}
            {product.medication.rx_or_otc && <li>{product.medication.rx_or_otc}</li>}
            {product.gs1?.lot && <li>Lot {product.gs1.lot}</li>}
            {product.gs1?.expiry && <li>Expires {product.gs1.expiry}</li>}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Medications aren't logged as calories. Adding this to your stack lets DoseRoutine check
            it against everything else you take.
          </p>
          {activeIngredient && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={checkInteractions}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Check interactions with {activeIngredient}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["food", "supplement", "medication"] as ProductCategory[]).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={category === option ? "default" : "outline"}
            onClick={() => setCategory(option)}
          >
            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
            {CATEGORY_LABEL[option]}
          </Button>
        ))}
      </div>

      {category !== "food" && (
        <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          Product details come from public product databases and, where a label was photographed,
          from automated text reading — so they can be wrong or out of date. Always check the
          printed label, and speak to a doctor or pharmacist before starting, stopping or changing
          anything you take. DoseRoutine is a tracking tool and does not give medical advice.
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        {category === "food" ? (
          <Button
            type="button"
            className="flex-1"
            onClick={() => void logAsFood()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UtensilsCrossed className="mr-2 h-4 w-4" />
            )}
            Add to today
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1"
            onClick={() => void addToStack()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Pill className="mr-2 h-4 w-4" />
            )}
            Add to stack
          </Button>
        )}
      </div>
    </div>
  );
}
