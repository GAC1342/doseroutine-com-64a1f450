import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, Sparkles, Barcode, ScanText, Info } from "lucide-react";
import { foodPortionsFor } from "@/lib/food-db.functions";
import {
  FOOD_SOURCE_COPY,
  FOOD_SOURCE_LABELS,
  roundMacro,
  type FoodDataSource,
  type MealItem,
} from "@/lib/meal-nutrition";
import { formatGrams, parsePortionGrams, visualHintFor } from "@/lib/portion-units";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SOURCE_ICON: Record<FoodDataSource, typeof Database> = {
  barcode: Barcode,
  label: ScanText,
  database: Database,
  usda: Database,
  ai: Sparkles,
};

/** How much to trust each source, in plain language. */
const SOURCE_TRUST: Record<FoodDataSource, string> = {
  barcode: "Highest accuracy — exact published values.",
  label: "High accuracy — read straight off the printed panel.",
  database: "Good accuracy — real measured data, portion is the estimate.",
  usda: "Good accuracy — lab-measured USDA data, portion is the estimate.",
  ai: "Rough estimate — check the numbers before saving.",
};

/** Rescale an item's macros to a new gram weight. */
export function rescaleItemToGrams(item: MealItem, grams: number): Partial<MealItem> {
  const current = Number(item.grams) > 0 ? Number(item.grams) : parsePortionGrams(item.portion);
  if (!current || current <= 0 || !Number.isFinite(grams) || grams <= 0) return {};
  const f = grams / current;
  const micro = (value: number | null | undefined) =>
    value == null ? value : roundMacro(value * f);
  return {
    grams: roundMacro(grams),
    calories: roundMacro(item.calories * f, "kcal"),
    protein_g: roundMacro(item.protein_g * f),
    carbs_g: roundMacro(item.carbs_g * f),
    fat_g: roundMacro(item.fat_g * f),
    fiber_g: micro(item.fiber_g),
    sugar_g: micro(item.sugar_g),
    sodium_mg: item.sodium_mg == null ? item.sodium_mg : Math.round(item.sodium_mg * f),
    satfat_g: micro(item.satfat_g),
  };
}

/** Extended nutrition line, only for the fields the source actually published. */
function extendedNutrition(item: MealItem): string | null {
  const parts: string[] = [];
  if (item.fiber_g != null) parts.push(`${roundMacro(item.fiber_g)} g fiber`);
  if (item.sugar_g != null) parts.push(`${roundMacro(item.sugar_g)} g sugars`);
  if (item.satfat_g != null) parts.push(`${roundMacro(item.satfat_g)} g sat fat`);
  if (item.sodium_mg != null) parts.push(`${Math.round(item.sodium_mg)} mg sodium`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Provenance row under each scanned item: a tappable badge saying where the
 * numbers came from, plus one-tap household portions that rescale the macros.
 */
export function FoodPortionPicker({
  item,
  onChange,
  onPortionPick,
}: {
  item: MealItem;
  onChange: (patch: Partial<MealItem>) => void;
  /** Fired when a household-portion chip rescales the item, for analytics. */
  onPortionPick?: (picked: { label: string; grams: number; fromGrams: number | null }) => void;
}) {
  const fetchPortions = useServerFn(foodPortionsFor);
  const foodId = item.foodId ?? null;
  const { data: portions = [] } = useQuery({
    queryKey: ["food-portions", foodId],
    queryFn: () => fetchPortions({ data: { foodId: foodId! } }),
    enabled: Boolean(foodId),
    staleTime: 60 * 60 * 1000,
  });

  const source: FoodDataSource = item.dataSource ?? "ai";
  const Icon = SOURCE_ICON[source];
  const grams = Number(item.grams) > 0 ? Number(item.grams) : parsePortionGrams(item.portion);
  const hint = grams ? visualHintFor(grams, item.name) : null;
  const isGuess = source === "ai";
  const extended = extendedNutrition(item);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Where the numbers for ${item.name || "this item"} came from: ${FOOD_SOURCE_LABELS[source]}`}
              className={`tap-target inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                isGuess
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-primary/40 bg-primary/10 text-primary"
              }`}
            >
              <Icon className="h-3 w-3" />
              {FOOD_SOURCE_LABELS[source]}
              <Info className="h-3 w-3 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 text-xs">
            <p className="text-sm font-semibold">{FOOD_SOURCE_LABELS[source]}</p>
            <p className="mt-1 text-muted-foreground">{FOOD_SOURCE_COPY[source]}</p>
            <p
              className={`mt-2 ${isGuess ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
            >
              {SOURCE_TRUST[source]}
            </p>
            {item.sourceName ? (
              <p className="mt-2 border-t border-border pt-2">
                <span className="text-muted-foreground">Matched to </span>
                <span className="font-medium">{item.sourceName}</span>
              </p>
            ) : null}
            {item.sourceBasis ? (
              <p className="mt-1 text-muted-foreground tabular-nums">{item.sourceBasis}</p>
            ) : null}
            {grams ? (
              <p className="mt-1 text-muted-foreground tabular-nums">
                Scaled to {formatGrams(grams)}
                {hint ? ` (about ${hint})` : ""}.
              </p>
            ) : null}
            {extended ? (
              <p className="mt-2 border-t border-border pt-2 text-muted-foreground tabular-nums">
                Also in this portion: {extended}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Anything you edit here is saved as your number and used to improve future scans.
            </p>
          </PopoverContent>
        </Popover>
        {grams ? (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatGrams(grams)}
            {hint ? ` · ${hint}` : ""}
          </span>
        ) : null}
        {extended ? (
          <span className="w-full text-[10px] text-muted-foreground tabular-nums">{extended}</span>
        ) : null}
      </div>

      {portions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {portions.map((portion) => {
            const active = grams !== null && Math.abs(grams - portion.grams) < 0.5;
            return (
              <button
                key={portion.label}
                type="button"
                onClick={() => {
                  onChange({
                    ...rescaleItemToGrams(item, portion.grams),
                    portion: portion.label,
                  });
                  onPortionPick?.({
                    label: portion.label,
                    grams: portion.grams,
                    fromGrams: grams,
                  });
                }}
                className={`tap-target rounded-full border px-2.5 py-1 text-[11px] ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                }`}
                title={portion.referenceHint ?? undefined}
              >
                {portion.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
