import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Barcode, Camera, Loader2, PencilLine, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MealReviewSheet, type MealDraft } from "@/components/meal-review-sheet";
import { FoodProductSearch } from "@/components/food-product-search";
import { MealHowToCard } from "@/components/meal-howto-card";
import { MacroGoalsCard } from "@/components/macro-goals-card";
import { MacroProgress } from "@/components/macro-progress";
import { MealPhotoExpiryBanner, MealPhotoStorageCard } from "@/components/meal-photo-storage-card";

import { scanMealInput, lookupFoodLabel } from "@/lib/meal-scan.functions";
import { scanBarcodeFromImage } from "@/lib/barcode-scanner";
import { fileToDownscaledDataUrl } from "@/lib/image-downscale";
import {
  MEAL_SLOT_LABELS,
  emptyItem,
  roundTotals,
  totalsFor,
  type FoodLabelMatch,
  type MealItem,
  type MealSlot,
} from "@/lib/meal-nutrition";

export const Route = createFileRoute("/_authenticated/food")({
  validateSearch: (search: Record<string, unknown>): { day?: string } => ({
    day:
      typeof search.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.day)
        ? search.day
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Food & Macros — DoseRoutine" },
      {
        name: "description",
        content:
          "Scan a meal photo or a barcode to log calories, protein, carbs and fat — review and edit every number before it is saved.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FoodPage,
});

type MealRow = {
  id: string;
  label: string | null;
  meal_slot: string | null;
  source: string | null;
  notes: string | null;
  barcode: string | null;
  storage_path: string | null;
  ai_confidence: string | null;
  ai_items: unknown;
  logged_at: string;
  adj_calories: number | null;
  adj_protein_g: number | null;
  adj_carbs_g: number | null;
  adj_fat_g: number | null;
  est_calories: number | null;
  est_protein_g: number | null;
  est_carbs_g: number | null;
  est_fat_g: number | null;
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function macro(row: MealRow, key: "calories" | "protein_g" | "carbs_g" | "fat_g") {
  const adjusted = row[`adj_${key}` as const];
  const estimated = row[`est_${key}` as const];
  return Number(adjusted ?? estimated ?? 0);
}

function FoodPage() {
  const search = Route.useSearch();
  const [day, setDay] = useState(search.day ?? todayKey);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Photo estimate parked while the user looks for the right published label. */
  const [pendingPhoto, setPendingPhoto] = useState<{
    estimate: Awaited<ReturnType<typeof scanMealInput>>;
    imageDataUrl: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const analyze = useServerFn(scanMealInput);
  const lookup = useServerFn(lookupFoodLabel);

  const mealsQuery = useQuery({
    queryKey: ["meals", day],
    queryFn: async () => {
      const start = new Date(`${day}T00:00:00`).toISOString();
      const end = new Date(`${day}T23:59:59.999`).toISOString();
      const { data, error } = await supabase
        .from("meals")
        .select(
          "id,label,meal_slot,source,notes,barcode,storage_path,ai_confidence,ai_items,logged_at,adj_calories,adj_protein_g,adj_carbs_g,adj_fat_g,est_calories,est_protein_g,est_carbs_g,est_fat_g",
        )
        .gte("logged_at", start)
        .lte("logged_at", end)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MealRow[];
    },
  });

  const meals = useMemo(() => mealsQuery.data ?? [], [mealsQuery.data]);
  const dayTotals = useMemo(
    () =>
      roundTotals(
        totalsFor(
          meals.map((row) => ({
            name: row.label ?? "Meal",
            portion: "",
            calories: macro(row, "calories"),
            protein_g: macro(row, "protein_g"),
            carbs_g: macro(row, "carbs_g"),
            fat_g: macro(row, "fat_g"),
          })),
        ),
      ),
    [meals],
  );

  function openPhotoDraft(
    estimate: Awaited<ReturnType<typeof scanMealInput>>,
    imageDataUrl?: string | null,
  ) {
    setDraft({
      label: estimate.label,
      items: estimate.items,
      confidence: estimate.confidence,
      note: estimate.note,
      source: estimate.readFrom === "barcode" ? "barcode" : "photo",
      barcode: estimate.barcode ?? null,
      readFrom: estimate.readFrom ?? "visual",
      photoDataUrl: imageDataUrl ?? null,
    });
    setSheetOpen(true);
  }

  /** Use a searched product's published panel instead of a guess. */
  function useProductMatch(match: FoodLabelMatch) {
    if (!match.perServing) return;
    setSearchOpen(false);
    setDraft({
      label: (match.brand ? `${match.brand} ${match.name}` : match.name).slice(0, 80),
      items: [match.perServing],
      confidence: "high",
      note:
        match.basis === "100g"
          ? "Published values are per 100 g — adjust the portion to match what you ate."
          : "Published per-serving values from the product label.",
      source: "barcode",
      barcode: match.barcode || null,
      readFrom: "barcode",
      photoDataUrl: pendingPhoto?.imageDataUrl ?? null,
    });
    setPendingPhoto(null);
    setSheetOpen(true);
  }

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      // Barcode first: if the photo shows a readable barcode we can skip the
      // guesswork entirely and use the manufacturer's published panel.
      const detected = await scanBarcodeFromImage(file).catch(() => null);
      const imageDataUrl = await fileToDownscaledDataUrl(file);
      const estimate = await analyze({ data: { imageDataUrl, barcode: detected } });
      return { estimate, imageDataUrl };
    },
    onSuccess: ({ estimate, imageDataUrl }) => {
      // A barcode was seen but no manufacturer panel came back: let the user pick
      // the right product before we settle for the OCR/visual read.
      if (estimate.barcode && estimate.readFrom !== "barcode") {
        setPendingPhoto({ estimate, imageDataUrl });
        setSearchQuery(estimate.label ?? "");
        setSearchOpen(true);
        return;
      }
      openPhotoDraft(estimate, imageDataUrl);
    },
    onError: (err) =>
      toast.error("Could not read that photo", {
        description: err instanceof Error ? err.message : "Try again with better lighting.",
      }),
  });

  const barcodeMutation = useMutation({
    mutationFn: async (code: string) => lookup({ data: { barcode: code } }),
    onSuccess: (result) => {
      if (!result.found || !result.perServing) {
        toast.error("No nutrition panel found for that barcode", {
          description: "Search the product by name to use its published label.",
        });
        setPendingPhoto(null);
        setSearchQuery("");
        setSearchOpen(true);
        return;
      }
      setDraft({
        label: result.brand ? `${result.brand} ${result.name}` : result.name,
        items: [result.perServing],
        confidence: "high",
        note:
          result.basis === "100g"
            ? "Published values are per 100 g — adjust the portion to match what you ate."
            : "Published per-serving values from the product label.",
        source: "barcode",
        barcode: barcode.trim(),
        readFrom: "barcode",
      });
      setSheetOpen(true);
    },
    onError: () => toast.error("Barcode lookup failed. Try again."),
  });

  function editMeal(row: MealRow) {
    const savedItems = Array.isArray(row.ai_items) ? (row.ai_items as MealItem[]) : [];
    const items =
      savedItems.length > 0
        ? savedItems
        : [
            {
              ...emptyItem(row.label ?? "Meal"),
              calories: macro(row, "calories"),
              protein_g: macro(row, "protein_g"),
              carbs_g: macro(row, "carbs_g"),
              fat_g: macro(row, "fat_g"),
            },
          ];
    const logged = new Date(row.logged_at);
    setDraft({
      id: row.id,
      label: row.label ?? "Meal",
      items,
      confidence: (row.ai_confidence as MealDraft["confidence"]) ?? null,
      note: row.notes ?? "",
      source: (row.source as MealDraft["source"]) ?? "manual",
      barcode: row.barcode,
      storagePath: row.storage_path,
      slot: (row.meal_slot ?? "other") as MealSlot,
      time: `${String(logged.getHours()).padStart(2, "0")}:${String(logged.getMinutes()).padStart(2, "0")}`,
      estimateItems: [
        {
          name: row.label ?? "Meal",
          portion: "",
          calories: Number(row.est_calories ?? 0),
          protein_g: Number(row.est_protein_g ?? 0),
          carbs_g: Number(row.est_carbs_g ?? 0),
          fat_g: Number(row.est_fat_g ?? 0),
        },
      ],
    });
    setSheetOpen(true);
  }

  async function deleteMeal(id: string) {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete that meal");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["meals"] });
    void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
    void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
  }

  const busy = photoMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Food &amp; macros</h1>
          <p className="text-sm text-muted-foreground">
            Scan, review, then save — nothing is logged until you approve it.
          </p>
        </div>
        <Input
          type="date"
          aria-label="Day"
          value={day}
          onChange={(e) => setDay(e.target.value || todayKey())}
          className="w-auto"
        />
      </header>

      <MealHowToCard className="mt-4" />

      <section className="mt-4 rounded-2xl bg-card p-4">
        <h2 className="text-sm font-semibold">Add a meal</h2>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) photoMutation.mutate(file);
          }}
        />
        <Button
          type="button"
          size="lg"
          className="mt-3 h-14 w-full text-base"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Camera className="mr-2 h-5 w-5" />
          )}
          {busy ? "Reading your photo…" : "Add my meal"}
        </Button>
        <p aria-live="polite" className="mt-2 text-center text-xs text-muted-foreground">
          {busy
            ? "Looking for a barcode, then reading the food and its calories…"
            : "Opens your camera. We read what it is plus calories, protein, carbs and fat — you check it, then save."}
        </p>

        <details className="group mt-3 rounded-xl border border-border p-3">
          <summary className="tap-target cursor-pointer list-none text-sm font-medium text-muted-foreground">
            More ways to add a meal
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            No photo? Type a barcode number, search a product by name, or enter the numbers
            yourself.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft({
                  label: "",
                  items: [emptyItem()],
                  confidence: null,
                  note: "",
                  source: "manual",
                });
                setSheetOpen(true);
              }}
            >
              <PencilLine className="mr-2 h-4 w-4" />
              Enter by hand
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingPhoto(null);
                setSearchQuery("");
                setSearchOpen(true);
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              Search a product
            </Button>
            <div className="flex gap-2 sm:col-span-2">
              <Input
                inputMode="numeric"
                placeholder="Barcode number"
                aria-label="Food barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                aria-label="Look up barcode"
                disabled={barcodeMutation.isPending || barcode.trim().length < 8}
                onClick={() => barcodeMutation.mutate(barcode.trim())}
              >
                {barcodeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Barcode className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </details>

        <p className="mt-3 text-xs text-muted-foreground">
          Photo estimates are a starting point, not a lab measurement. Check the portion and edit
          anything that looks off before saving.
        </p>
      </section>

      <MealPhotoExpiryBanner className="mt-4" />

      <MacroGoalsCard />

      <MacroProgress day={day} className="mt-4" />

      <MealPhotoStorageCard className="mt-4" />

      <section className="mt-4 rounded-2xl bg-card p-4">
        <h2 className="text-sm font-semibold">Day total</h2>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          {[
            ["Calories", `${dayTotals.calories}`],
            ["Protein", `${dayTotals.protein_g}g`],
            ["Carbs", `${dayTotals.carbs_g}g`],
            ["Fat", `${dayTotals.fat_g}g`],
          ].map(([name, value]) => (
            <div key={name}>
              <div className="text-lg font-semibold tabular-nums">{value}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {name}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-2">
        {mealsQuery.isPending ? (
          <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Loading meals…
          </div>
        ) : meals.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Nothing logged for this day yet.
          </div>
        ) : (
          meals.map((row) => (
            <article key={row.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{row.label ?? "Meal"}</div>
                <div className="text-xs text-muted-foreground">
                  {MEAL_SLOT_LABELS[(row.meal_slot ?? "other") as MealSlot]} ·{" "}
                  {new Date(row.logged_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  · {Math.round(macro(row, "calories"))} kcal ·{" "}
                  {Math.round(macro(row, "protein_g"))}g protein
                </div>
              </div>
              <button
                type="button"
                aria-label={`Edit ${row.label ?? "meal"}`}
                onClick={() => editMeal(row)}
                className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <PencilLine className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${row.label ?? "meal"}`}
                onClick={() => void deleteMeal(row.id)}
                className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          ))
        )}
      </section>

      <FoodProductSearch
        open={searchOpen}
        onOpenChange={(next) => {
          setSearchOpen(next);
          if (!next) setPendingPhoto(null);
        }}
        initialQuery={searchQuery}
        onPick={useProductMatch}
        {...(pendingPhoto
          ? {
              onSkip: () => {
                setSearchOpen(false);
                openPhotoDraft(pendingPhoto.estimate, pendingPhoto.imageDataUrl);
                setPendingPhoto(null);
              },
              skipLabel: "Use photo estimate",
            }
          : {})}
      />

      <MealReviewSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        draft={draft}
        dayKey={day}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["meals"] });
          void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
          void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
        }}
      />
    </div>
  );
}
