/**
 * One normalized shape for every scanned product — food, supplement or
 * medication — plus the pure helpers the UI and the server both need.
 *
 * Client-safe: no network, no secrets.
 */

export type ProductCategory = "food" | "supplement" | "medication" | "other";

export type ProductSource =
  | "cache"
  | "openfoodfacts"
  | "dsld"
  | "openfda"
  | "healthcanada"
  | "usda"
  | "upcitemdb"
  | "label_ocr";

export type ProductIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
  percent_dv: number | null;
  form: string | null;
  /** Sub-ingredients of a proprietary blend, when the label lists them. */
  blend?: string[];
};

export type ProductNutrition = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
};

export type ProductMedication = {
  ndc: string | null;
  generic_name: string | null;
  brand_name: string | null;
  active_ingredients: { name: string; strength: string | null }[];
  dosage_form: string | null;
  route: string | null;
  rx_or_otc: string | null;
  labeler: string | null;
  directions: string | null;
};

export type UniversalProduct = {
  code: string;
  code_type: string;
  category: ProductCategory;
  name: string;
  brand: string | null;
  image_url: string | null;
  source: ProductSource;
  confidence: number;
  serving: {
    size: string | null;
    grams: number | null;
    servings_per_container: number | null;
  };
  nutrition_per_serving: ProductNutrition;
  ingredients: ProductIngredient[];
  medication: ProductMedication | null;
  gs1: { lot: string | null; expiry: string | null; serial: string | null } | null;
  /** Field names the label reader could not make out. */
  unreadable?: string[];
  needs_label_photo?: boolean;
};

export type LookupResult =
  | { status: "found"; product: UniversalProduct }
  | { status: "unknown"; code: string; needs_label_photo: true; message: string };

export const EMPTY_NUTRITION: ProductNutrition = {
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
};

/**
 * Priority when several databases answer at once. A drug listing is the most
 * specific claim anyone can make about a code, a Supplement Facts panel beats
 * a crowd-sourced food entry, and a bare title lookup is the last resort.
 */
export const SOURCE_PRIORITY: ProductSource[] = [
  "cache",
  "label_ocr",
  "openfda",
  "healthcanada",
  "dsld",
  "openfoodfacts",
  "usda",
  "upcitemdb",
];

/** Pick the best candidate from whatever the parallel lookups returned. */
export function pickBestProduct(
  candidates: (UniversalProduct | null | undefined)[],
): UniversalProduct | null {
  const found = candidates.filter((p): p is UniversalProduct => Boolean(p && p.name));
  if (found.length === 0) return null;
  const rank = (p: UniversalProduct) => {
    const index = SOURCE_PRIORITY.indexOf(p.source);
    return index === -1 ? SOURCE_PRIORITY.length : index;
  };
  return [...found].sort((a, b) => rank(a) - rank(b) || b.confidence - a.confidence)[0]!;
}

/**
 * Merge a lower-priority result into the winner so a supplement that only Open
 * Food Facts has macros for still shows them next to its DSLD facts panel.
 */
export function mergeProducts(base: UniversalProduct, extra: UniversalProduct): UniversalProduct {
  const nutrition = { ...base.nutrition_per_serving };
  for (const key of Object.keys(nutrition) as (keyof ProductNutrition)[]) {
    if (nutrition[key] == null) nutrition[key] = extra.nutrition_per_serving[key];
  }
  return {
    ...base,
    brand: base.brand ?? extra.brand,
    image_url: base.image_url ?? extra.image_url,
    serving: {
      size: base.serving.size ?? extra.serving.size,
      grams: base.serving.grams ?? extra.serving.grams,
      servings_per_container:
        base.serving.servings_per_container ?? extra.serving.servings_per_container,
    },
    nutrition_per_serving: nutrition,
    ingredients: base.ingredients.length > 0 ? base.ingredients : extra.ingredients,
  };
}

const SUPPLEMENT_TAGS = /dietary-supplement|supplement|vitamin/i;

/** Open Food Facts tags a lot of pill bottles as food; correct the category. */
export function categoryFromOffTags(tags: unknown, hasNutriments: boolean): ProductCategory {
  const list = Array.isArray(tags) ? tags.map(String).join(",") : String(tags ?? "");
  if (SUPPLEMENT_TAGS.test(list)) return "supplement";
  return hasNutriments ? "food" : "other";
}

/** Human label for the source, shown under the product name. */
export function sourceLabel(source: ProductSource): string {
  switch (source) {
    case "openfoodfacts":
      return "Open Food Facts";
    case "dsld":
      return "NIH Supplement Label Database";
    case "openfda":
      return "openFDA drug listing";
    case "healthcanada":
      return "Health Canada Drug Product Database";
    case "usda":
      return "USDA FoodData Central";
    case "upcitemdb":
      return "UPC catalog";
    case "label_ocr":
      return "Read from the label photo";
    case "cache":
      return "Saved in DoseRoutine";
    default:
      return "Unknown source";
  }
}

/** Scale per-serving nutrition by a serving multiplier, rounded for display. */
export function scaleNutrition(n: ProductNutrition, servings: number): ProductNutrition {
  const scale = (v: number | null) => (v == null ? null : Math.round(v * servings * 10) / 10);
  return {
    calories: n.calories == null ? null : Math.round(n.calories * servings),
    protein_g: scale(n.protein_g),
    carbs_g: scale(n.carbs_g),
    fat_g: scale(n.fat_g),
    fiber_g: scale(n.fiber_g),
  };
}

/** "2 capsules" → { count: 2, noun: "capsules" } so the stepper can speak label units. */
export function parseServingUnits(size: string | null): { count: number; noun: string } {
  const text = String(size ?? "").trim();
  const m = /^([\d.]+)\s*(.+)$/.exec(text);
  const count = m ? Number(m[1]) : NaN;
  return {
    count: Number.isFinite(count) && count > 0 ? count : 1,
    noun: (m?.[2] ?? text ?? "").trim() || "serving",
  };
}
