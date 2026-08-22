/**
 * USDA FoodData Central client (server-only).
 *
 * Generic foods come from the data types that carry lab-measured macros —
 * Foundation, SR Legacy and Survey (FNDDS). Branded entries are used only as a
 * *fallback* barcode source, behind Open Food Facts.
 *
 * Every USDA hit is written into our own `foods` table, so the second lookup
 * of the same food never leaves the database.
 */

import {
  UsdaSchemaError,
  parseFdcFood,
  parseFdcSearchResponse,
  macroPlausibilityIssues,
  isPlausiblePortionGrams,
  type FdcFoodParsed,
} from "./usda-schema";

export { UsdaSchemaError } from "./usda-schema";
export type { UsdaErrorKind } from "./usda-schema";

export type UsdaPortion = {
  label: string;
  grams: number;
};

export type UsdaFood = {
  fdcId: string;
  name: string;
  brand: string | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  /** Extended nutrition, per 100 g. Null when USDA does not publish it. */
  fiber100: number | null;
  sugar100: number | null;
  sodium100mg: number | null;
  satfat100: number | null;
  defaultPortionG: number;
  /** Household measures published by USDA, e.g. "1 cup chopped" = 91 g. */
  portions: UsdaPortion[];
  /** Barcode for Branded entries. */
  gtin: string | null;
  dataType: string;
};

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];

/** USDA nutrient ids we read. */
const NUTRIENT_IDS = {
  kcal: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sugar: 2000,
  sugarAlt: 1063,
  sodium: 1093,
  satfat: 1258,
} as const;

function apiKey(): string | null {
  const key = process.env["USDA_FDC_API_KEY"];
  return key && key.trim() ? key.trim() : null;
}

type FdcNutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  value?: number;
  amount?: number;
  nutrient?: { id?: number; number?: string };
};

type FdcPortion = {
  gramWeight?: number;
  amount?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string };
};

type FdcFood = FdcFoodParsed;

/** Last validation failure, surfaced to admin tooling for diagnostics. */
let lastUsdaError: UsdaSchemaError | null = null;
export function lastUsdaValidationError(): UsdaSchemaError | null {
  return lastUsdaError;
}
function recordUsdaError(error: unknown): null {
  lastUsdaError = error instanceof UsdaSchemaError ? error : null;
  if (error instanceof UsdaSchemaError) console.warn(error.message);
  return null;
}

function nutrient(food: FdcFood, id: number): number | null {
  for (const n of food.foodNutrients ?? []) {
    const matches =
      n.nutrientId === id ||
      Number(n.nutrientNumber) === id ||
      n.nutrient?.id === id ||
      Number(n.nutrient?.number) === id;
    if (!matches) continue;
    const value = Number(n.value ?? n.amount);
    if (Number.isFinite(value) && value >= 0) return Math.round(value * 100) / 100;
  }
  return null;
}

function macro(food: FdcFood, id: number): number {
  return nutrient(food, id) ?? 0;
}

function portionLabel(p: FdcPortion): string {
  const described = String(p.portionDescription ?? "").trim();
  if (described && !/^undetermined/i.test(described)) return described.slice(0, 60);
  const amount = Number(p.amount);
  const rawUnit = String(p.measureUnit?.name ?? "").trim();
  const unit = rawUnit.toLowerCase() === "undetermined" ? "" : rawUnit;
  const modifier = String(p.modifier ?? "").trim();
  // A bare number ("1") is not a usable chip — the measure has to say what of.
  if (!unit && !modifier) return "";
  const parts = [
    Number.isFinite(amount) && amount > 0 ? String(Math.round(amount * 100) / 100) : "",
    unit,
    modifier,
  ].filter(Boolean);
  return parts.join(" ").slice(0, 60);
}

function toPortions(food: FdcFood): UsdaPortion[] {
  const seen = new Set<string>();
  const out: UsdaPortion[] = [];
  for (const p of food.foodPortions ?? []) {
    const grams = Number(p.gramWeight);
    const label = portionLabel(p);
    if (!isPlausiblePortionGrams(grams) || !label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, grams: Math.round(grams * 10) / 10 });
    if (out.length >= 8) break;
  }
  // Branded foods publish a single serving instead of a portion table.
  if (out.length === 0) {
    const grams = Number(food.servingSize);
    const unit = String(food.servingSizeUnit ?? "").toLowerCase();
    if (isPlausiblePortionGrams(grams) && (unit === "g" || unit === "ml")) {
      const label =
        String(food.householdServingFullText ?? "").trim() || `1 serving (${Math.round(grams)} g)`;
      out.push({ label: label.slice(0, 60), grams: Math.round(grams * 10) / 10 });
    }
  }
  return out;
}

/**
 * Convert a validated FDC record into our food shape.
 * Throws {@link UsdaSchemaError} when the record is unusable or implausible so
 * bad payloads can never produce wrong macros or portion cues.
 */
function toUsdaFoodChecked(raw: unknown, context: string): UsdaFood {
  const food = parseFdcFood(raw, context);
  const fdcId = String(food.fdcId ?? "").trim();
  const name = String(food.description ?? "").trim();
  if (!fdcId || !name) {
    throw new UsdaSchemaError("unusable", context, ["missing fdcId or description"]);
  }
  const kcal100 = macro(food, NUTRIENT_IDS.kcal);
  const protein100 = macro(food, NUTRIENT_IDS.protein);
  const carbs100 = macro(food, NUTRIENT_IDS.carbs);
  const fat100 = macro(food, NUTRIENT_IDS.fat);
  // Zero-calorie products (diet soda, sparkling water, black coffee) publish a
  // real panel of zeros — only reject records with no published energy row at
  // all, which means there is genuinely nothing to log.
  if (
    kcal100 <= 0 &&
    protein100 <= 0 &&
    carbs100 <= 0 &&
    fat100 <= 0 &&
    nutrient(food, NUTRIENT_IDS.kcal) === null
  ) {
    throw new UsdaSchemaError("unusable", `${context}:${fdcId}`, ["no macro values published"]);
  }

  const fiber100 = nutrient(food, NUTRIENT_IDS.fiber);
  const sugar100 = nutrient(food, NUTRIENT_IDS.sugar) ?? nutrient(food, NUTRIENT_IDS.sugarAlt);
  const sodium100mg = nutrient(food, NUTRIENT_IDS.sodium);
  const satfat100 = nutrient(food, NUTRIENT_IDS.satfat);
  const issues = macroPlausibilityIssues({
    kcal100,
    protein100,
    carbs100,
    fat100,
    fiber100,
    sugar100,
    sodium100mg,
    satfat100,
  });
  if (issues.length) throw new UsdaSchemaError("implausible", `${context}:${fdcId}`, issues);

  const portions = toPortions(food);
  const brand = String(food.brandName ?? food.brandOwner ?? "").trim() || null;
  const gtin = String(food.gtinUpc ?? "").replace(/\D/g, "") || null;

  return {
    fdcId,
    name: titleCase(name),
    brand,
    kcal100,
    protein100,
    carbs100,
    fat100,
    fiber100,
    sugar100,
    sodium100mg,
    satfat100,
    defaultPortionG: portions[0] ? portions[0]!.grams : 100,
    portions,
    gtin,
    dataType: String(food.dataType ?? "USDA"),
  };
}

/** Non-throwing wrapper: malformed records are dropped, never logged wrong. */
function toUsdaFood(raw: unknown, context = "food"): UsdaFood | null {
  try {
    return toUsdaFoodChecked(raw, context);
  } catch (error) {
    return recordUsdaError(error);
  }
}

function titleCase(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 120);
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/** Quality score by USDA data type — lab analysis beats survey averages. */
export function usdaQualityScore(dataType: string): number {
  if (dataType === "Foundation") return 92;
  if (dataType === "SR Legacy") return 88;
  if (dataType === "Branded") return 78;
  return 80;
}

async function searchFdc(body: Record<string, unknown>): Promise<unknown[]> {
  const key = apiKey();
  if (!key) return [];
  try {
    const res = await fetch(`${FDC_BASE}/foods/search?api_key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      recordUsdaError(new UsdaSchemaError("http", `search ${res.status}`));
      return [];
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      recordUsdaError(new UsdaSchemaError("not_json", "search body"));
      return [];
    }
    return parseFdcSearchResponse(json, "search");
  } catch (error) {
    recordUsdaError(
      error instanceof UsdaSchemaError ? error : new UsdaSchemaError("network", "search"),
    );
    return [];
  }
}

/**
 * Search USDA for a food name. Returns [] when the key is missing or the API
 * is unreachable — grounding always degrades to the AI estimate, never fails.
 */
export async function searchUsdaFoods(query: string, limit = 5): Promise<UsdaFood[]> {
  const terms = query.trim().slice(0, 80);
  if (terms.length < 2) return [];
  const foods = await searchFdc({
    query: terms,
    dataType: DATA_TYPES,
    pageSize: Math.min(Math.max(limit, 1), 25),
    requireAllWords: false,
  });
  const out: UsdaFood[] = [];
  for (const food of foods) {
    const parsed = toUsdaFood(food, "search");
    if (parsed) out.push(parsed);
    if (out.length >= limit) break;
  }
  return out;
}

export function usdaConfigured(): boolean {
  return apiKey() !== null;
}

/** Fetch one USDA entry by its FDC id — the detail record carries portions. */
export async function getUsdaFoodById(fdcId: string): Promise<UsdaFood | null> {
  const key = apiKey();
  const id = String(fdcId ?? "").trim();
  if (!key || !/^\d+$/.test(id)) return null;
  try {
    const res = await fetch(
      `${FDC_BASE}/food/${encodeURIComponent(id)}?api_key=${encodeURIComponent(key)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return recordUsdaError(new UsdaSchemaError("http", `detail ${id}: ${res.status}`));
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return recordUsdaError(new UsdaSchemaError("not_json", `detail ${id}`));
    }
    return toUsdaFood(json, `detail ${id}`);
  } catch (error) {
    return recordUsdaError(
      error instanceof UsdaSchemaError ? error : new UsdaSchemaError("network", `detail ${id}`),
    );
  }
}

/**
 * Barcode fallback: USDA's Branded set covers many US products Open Food Facts
 * misses. Only an exact GTIN match counts — a fuzzy hit would log the wrong
 * product's numbers.
 */
export async function lookupUsdaByBarcode(barcode: string): Promise<UsdaFood | null> {
  const { gtinVariants, sameGtin, cleanBarcode } = await import("@/lib/gtin");
  const digits = cleanBarcode(barcode);
  // Too short to be any GTIN — never spend a request on it.
  if (digits.length < 8) return null;
  const variants = gtinVariants(digits);
  if (variants.length === 0) return null;
  // USDA's index matches the literal stored gtinUpc string, which is usually
  // the zero-padded 14-digit form — a bare 12-digit UPC returns zero hits.
  const queries = [...new Set([...variants].sort((a, b) => b.length - a.length))].slice(0, 3);
  for (const query of queries) {
    const foods = await searchFdc({ query, dataType: ["Branded"], pageSize: 5 });
    for (const raw of foods) {
      const digits = String((raw as { gtinUpc?: unknown } | null)?.gtinUpc ?? "").replace(
        /\D/g,
        "",
      );
      if (!digits || !variants.some((v) => sameGtin(v, digits))) continue;
      const parsed = toUsdaFood(raw, `barcode ${query}`);
      if (parsed) return parsed;
    }
  }
  return null;
}
