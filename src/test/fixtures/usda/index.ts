/**
 * Shared USDA FoodData Central fixtures.
 *
 * The raw payloads live as JSON next to this file so they can be refreshed
 * from real API responses without touching test code. Tests snapshot both the
 * *shape* of each payload (`describeShape`) and the normalized `UsdaFood` we
 * derive from it, so a schema change upstream shows up as a snapshot diff even
 * when the sample values themselves are updated.
 */
import foundationChicken from "./foundation-chicken.json";
import srLegacyBroccoli from "./sr-legacy-broccoli.json";
import surveyRice from "./survey-rice.json";
import brandedBar from "./branded-bar.json";

export { foundationChicken, srLegacyBroccoli, surveyRice, brandedBar };

export type UsdaFixture = {
  /** Stable key used as the snapshot name. */
  key: string;
  /** Human description of what the payload variant proves. */
  about: string;
  /** Raw USDA payload, exactly as the API returns one `foods[]` entry. */
  payload: Record<string, unknown>;
  /** Grams to scale to when snapshotting the downstream view. */
  scaleTo: number;
};

export const USDA_FIXTURES: UsdaFixture[] = [
  {
    key: "foundation-chicken",
    about: "Modern Foundation payload: flat nutrientId, real foodPortions table",
    payload: foundationChicken as Record<string, unknown>,
    scaleTo: 85,
  },
  {
    key: "sr-legacy-broccoli",
    about: "Legacy payload: nested nutrient.id + amount, measureUnit portions",
    payload: srLegacyBroccoli as Record<string, unknown>,
    scaleTo: 180,
  },
  {
    key: "survey-rice",
    about: "Survey payload: string nutrientNumber only, single portion",
    payload: surveyRice as Record<string, unknown>,
    scaleTo: 195,
  },
  {
    key: "branded-bar",
    about: "Branded payload: GTIN + servingSize instead of a portion table",
    payload: brandedBar as Record<string, unknown>,
    scaleTo: 60,
  },
];

/**
 * Structural fingerprint of a payload: keys mapped to value *types*, never
 * values. Refreshing a fixture with new sample numbers leaves this untouched;
 * USDA adding, removing, or retyping a field changes it.
 *
 * Arrays collapse to the union of their elements' shapes so a longer sample
 * array does not churn the snapshot either.
 */
export function describeShape(value: unknown): unknown {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    const shapes = value.map((entry) => JSON.stringify(describeShape(entry)));
    const unique = [...new Set(shapes)].sort();
    return unique.length === 0 ? ["empty[]"] : unique.map((s) => JSON.parse(s) as unknown);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = describeShape((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return typeof value;
}
