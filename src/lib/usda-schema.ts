/**
 * Runtime schema validation for USDA FoodData Central payloads.
 *
 * USDA occasionally ships partial or malformed records (nulls where numbers are
 * documented, strings where numbers belong, nutrient values that are physically
 * impossible). Without validation those slip through as 0-kcal foods or absurd
 * macros, which then drive wrong portion cues. Everything here fails *safely*:
 * callers get a typed error instead of a silently wrong food.
 */

import { z } from "zod";

/** Why a USDA payload was rejected. */
export type UsdaErrorKind =
  | "http" // non-2xx response
  | "network" // fetch threw / timed out
  | "not_json" // body was not parseable JSON
  | "schema" // JSON did not match the documented FDC shape
  | "implausible" // shape ok, values outside physical bounds
  | "unusable"; // shape ok, but no macros / no identity to log against

export class UsdaSchemaError extends Error {
  readonly kind: UsdaErrorKind;
  readonly context: string;
  readonly issues: string[];

  constructor(kind: UsdaErrorKind, context: string, issues: string[] = []) {
    super(`[usda:${kind}] ${context}${issues.length ? ` — ${issues.join("; ")}` : ""}`);
    this.name = "UsdaSchemaError";
    this.kind = kind;
    this.context = context;
    this.issues = issues;
  }
}

/** USDA sends numbers as numbers, sometimes as numeric strings. */
const loose = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  })
  .optional();

const looseText = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined ? undefined : String(v)))
  .optional();

export const fdcNutrientSchema = z
  .object({
    nutrientId: loose,
    nutrientNumber: looseText,
    value: loose,
    amount: loose,
    nutrient: z
      .object({ id: loose, number: looseText })
      .passthrough()
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .passthrough();

export const fdcPortionSchema = z
  .object({
    gramWeight: loose,
    amount: loose,
    modifier: looseText,
    portionDescription: looseText,
    measureUnit: z
      .object({ name: looseText })
      .passthrough()
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .passthrough();

export const fdcFoodSchema = z
  .object({
    fdcId: loose,
    description: looseText,
    dataType: looseText,
    brandOwner: looseText,
    brandName: looseText,
    gtinUpc: looseText,
    servingSize: loose,
    servingSizeUnit: looseText,
    householdServingFullText: looseText,
    foodNutrients: z
      .array(fdcNutrientSchema)
      .nullish()
      .transform((v) => v ?? undefined),
    foodPortions: z
      .array(fdcPortionSchema)
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .passthrough();

export const fdcSearchResponseSchema = z
  .object({
    foods: z
      .array(z.unknown())
      .nullish()
      .transform((v) => v ?? []),
  })
  .passthrough();

export type FdcFoodParsed = z.infer<typeof fdcFoodSchema>;

function issuesOf(error: z.ZodError): string[] {
  return error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}

/** Validate one FDC food record. Throws {@link UsdaSchemaError} when malformed. */
export function parseFdcFood(input: unknown, context = "food"): FdcFoodParsed {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new UsdaSchemaError("schema", context, ["expected a JSON object"]);
  }
  const result = fdcFoodSchema.safeParse(input);
  if (!result.success) throw new UsdaSchemaError("schema", context, issuesOf(result.error));
  return result.data;
}

/** Validate a `/foods/search` envelope and return the raw food entries. */
export function parseFdcSearchResponse(input: unknown, context = "search"): unknown[] {
  const result = fdcSearchResponseSchema.safeParse(input);
  if (!result.success) throw new UsdaSchemaError("schema", context, issuesOf(result.error));
  return result.data.foods;
}

/** Physical upper bounds per 100 g — anything past these is a corrupt record. */
export const MACRO_BOUNDS = {
  kcal100: 900, // pure fat is ~900 kcal/100 g
  protein100: 100,
  carbs100: 100,
  fat100: 100,
  fiber100: 100,
  sugar100: 100,
  satfat100: 100,
  sodium100mg: 100_000,
  portionGrams: 20_000,
} as const;

export type MacroCheckInput = {
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100?: number | null;
  sugar100?: number | null;
  satfat100?: number | null;
  sodium100mg?: number | null;
};

/**
 * Plausibility gate applied after shape validation. Returns the list of
 * problems (empty when the record is usable).
 */
export function macroPlausibilityIssues(macros: MacroCheckInput): string[] {
  const issues: string[] = [];
  const check = (key: keyof typeof MACRO_BOUNDS, value: number | null | undefined) => {
    if (value === null || value === undefined) return;
    if (!Number.isFinite(value)) {
      issues.push(`${key}: not a finite number`);
      return;
    }
    if (value < 0) issues.push(`${key}: negative (${value})`);
    const max = MACRO_BOUNDS[key];
    if (value > max) issues.push(`${key}: ${value} exceeds max ${max}`);
  };
  check("kcal100", macros.kcal100);
  check("protein100", macros.protein100);
  check("carbs100", macros.carbs100);
  check("fat100", macros.fat100);
  check("fiber100", macros.fiber100);
  check("sugar100", macros.sugar100);
  check("satfat100", macros.satfat100);
  check("sodium100mg", macros.sodium100mg);

  const gramsSum = macros.protein100 + macros.carbs100 + macros.fat100;
  if (gramsSum > 105) issues.push(`macros sum to ${Math.round(gramsSum)} g per 100 g`);

  // Atwater sanity: declared energy should be near 4/4/9 within a wide margin.
  const atwater = macros.protein100 * 4 + macros.carbs100 * 4 + macros.fat100 * 9;
  if (macros.kcal100 > 0 && atwater > 0) {
    const ratio = macros.kcal100 / atwater;
    if (ratio > 3 || ratio < 0.33) {
      issues.push(
        `energy ${Math.round(macros.kcal100)} kcal inconsistent with macros (~${Math.round(atwater)} kcal)`,
      );
    }
  }
  return issues;
}

/** Throwing variant of {@link macroPlausibilityIssues}. */
export function assertPlausibleMacros(macros: MacroCheckInput, context = "food"): void {
  const issues = macroPlausibilityIssues(macros);
  if (issues.length) throw new UsdaSchemaError("implausible", context, issues);
}

/** True when a portion gram weight is usable for a chip. */
export function isPlausiblePortionGrams(grams: number): boolean {
  return Number.isFinite(grams) && grams > 0 && grams <= MACRO_BOUNDS.portionGrams;
}
