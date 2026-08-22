/**
 * USDA edge-case fixtures.
 *
 * GENERATED FILE — do not edit by hand.
 * Source of truth: scripts/usda-edge-fixture-spec.mjs
 * Regenerate with: npm run fixtures:usda
 *
 * Realistic FoodData Central payloads that break the happy path: unparseable
 * nutrient values, missing identity fields, corrupt gram weights, macros that
 * are physically impossible, and malformed search envelopes. Tests import
 * these instead of hardcoding payload literals.
 */
import garbageNutrients from "./garbage-nutrients.json";
import numericStrings from "./numeric-strings.json";
import nullsEverywhere from "./nulls-everywhere.json";
import unknownFutureFields from "./unknown-future-fields.json";
import sugarAltNutrient from "./sugar-alt-nutrient.json";
import undeterminedPortions from "./undetermined-portions.json";
import overlongPortionTable from "./overlong-portion-table.json";
import emptyPortionTable from "./empty-portion-table.json";
import implausiblePortionWeight from "./implausible-portion-weight.json";
import noMacrosWater from "./no-macros-water.json";
import missingDescription from "./missing-description.json";
import missingFdcId from "./missing-fdc-id.json";
import implausibleMacros from "./implausible-macros.json";
import impossibleMacroSum from "./impossible-macro-sum.json";
import envelopeFoodsString from "./malformed-envelope-foods-string.json";
import envelopeFoodsNull from "./malformed-envelope-foods-null.json";
import envelopeNoFoods from "./malformed-envelope-no-foods.json";

export {
  garbageNutrients,
  numericStrings,
  nullsEverywhere,
  unknownFutureFields,
  sugarAltNutrient,
  undeterminedPortions,
  overlongPortionTable,
  emptyPortionTable,
  implausiblePortionWeight,
  noMacrosWater,
  missingDescription,
  missingFdcId,
  implausibleMacros,
  impossibleMacroSum,
  envelopeFoodsString,
  envelopeFoodsNull,
  envelopeNoFoods,
};

export type UsdaEdgeCaseFixture = {
  key: string;
  about: string;
  payload: Record<string, unknown>;
  /** What the importer must do with it. */
  expect: "accept" | "reject";
};

/** Single-food edge cases, each tagged with the expected importer outcome. */
export const USDA_EDGE_CASES: UsdaEdgeCaseFixture[] = [
  {
    key: "garbage-nutrients",
    about: "String, null and negative nutrient values in one record",
    payload: garbageNutrients as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "numeric-strings",
    about: "Every numeric field delivered as a string, including gramWeight",
    payload: numericStrings as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "nulls-everywhere",
    about: "Optional fields explicitly null instead of absent",
    payload: nullsEverywhere as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "unknown-future-fields",
    about: "Unknown top-level field and unknown nutrient id",
    payload: unknownFutureFields as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "sugar-alt-nutrient",
    about: "Sugars published under 1063 instead of 2000",
    payload: sugarAltNutrient as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "undetermined-portions",
    about: "Zero-weight and 'undetermined' portion rows mixed with a good one",
    payload: undeterminedPortions as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "overlong-portion-table",
    about: "13 portions with a duplicate label",
    payload: overlongPortionTable as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "empty-portion-table",
    about: "foodPortions present but empty",
    payload: emptyPortionTable as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "implausible-portion-weight",
    about: "Corrupt gram weights (999999 g, negative) beside a valid row",
    payload: implausiblePortionWeight as Record<string, unknown>,
    expect: "accept",
  },
  {
    key: "no-macros-water",
    about: "No nutrients at all — nothing to log against",
    payload: noMacrosWater as Record<string, unknown>,
    expect: "reject",
  },
  {
    key: "missing-description",
    about: "No description field",
    payload: missingDescription as Record<string, unknown>,
    expect: "reject",
  },
  {
    key: "missing-fdc-id",
    about: "No fdcId field",
    payload: missingFdcId as Record<string, unknown>,
    expect: "reject",
  },
  {
    key: "implausible-macros",
    about: "5200 kcal per 100 g",
    payload: implausibleMacros as Record<string, unknown>,
    expect: "reject",
  },
  {
    key: "impossible-macro-sum",
    about: "Macros summing to 150 g per 100 g",
    payload: impossibleMacroSum as Record<string, unknown>,
    expect: "reject",
  },
];

/** Search envelopes that are not usable food lists. */
export const USDA_MALFORMED_ENVELOPES: { key: string; payload: unknown }[] = [
  { key: "foods-string", payload: envelopeFoodsString },
  { key: "foods-null", payload: envelopeFoodsNull },
  { key: "no-foods-key", payload: envelopeNoFoods },
];
