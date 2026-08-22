/**
 * Declarative spec for the USDA edge-case fixtures.
 *
 * Each case is described once here — base food, nutrient encoding, portion
 * table and the mutation that makes it an edge case — and
 * `scripts/generate-usda-edge-fixtures.mjs` renders it into
 * `src/test/fixtures/usda/edge-cases/*.json` plus the barrel `index.ts`.
 *
 * Add a case here, run `npm run fixtures:usda`, never hand-edit the JSON.
 */

/** USDA nutrient ids we care about. */
export const NUTRIENT = {
  energy: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  sodium: 1093,
  sugarsAlt: 1063,
};

/**
 * The three nutrient encodings FoodData Central actually returns, depending on
 * dataType and endpoint.
 */
export const NUTRIENT_SHAPES = {
  /** Foundation / abridged: flat numeric id + value. */
  id: (id, value, extra) => ({ nutrientId: id, value, ...extra }),
  /** Survey (FNDDS): id as a string under nutrientNumber. */
  number: (id, value, extra) => ({ nutrientNumber: String(id), value, ...extra }),
  /** SR Legacy full record: nested nutrient object + amount. */
  nested: (id, value, extra) => ({ nutrient: { id }, amount: value, ...extra }),
  /** Everything stringified, as some branded records do. */
  stringy: (id, value, extra) => ({ nutrientId: String(id), value: String(value), ...extra }),
};

/** Build a nutrient array from `{ energy, protein, carbs, fat, ... }` grams. */
export function nutrients(shape, macros, extras = []) {
  const encode = NUTRIENT_SHAPES[shape];
  const rows = [];
  for (const key of ["energy", "protein", "carbs", "fat", "sodium", "sugarsAlt"]) {
    if (macros[key] === undefined) continue;
    rows.push(encode(NUTRIENT[key], macros[key]));
  }
  for (const extra of extras) rows.push(extra);
  return rows;
}

/** A food payload template. */
export function food({
  fdcId,
  description,
  dataType,
  shape = "id",
  macros = {},
  nutrientExtras = [],
  portions,
  extra = {},
}) {
  const payload = { fdcId, description, dataType, ...extra };
  payload.foodNutrients = nutrients(shape, macros, nutrientExtras);
  if (portions !== undefined) payload.foodPortions = portions;
  return payload;
}

const CHICKEN = { energy: 120, protein: 22.5, carbs: 0, fat: 2.6 };
const CHEDDAR = { energy: 403, protein: 22.9, carbs: 3.1, fat: 33.1 };
const RICE = { energy: 123, protein: 2.74, carbs: 25.6, fat: 0.97 };
const BROCCOLI = { energy: 34, protein: 2.82, carbs: 6.64, fat: 0.37 };

/** N synthetic portion rows, optionally with a duplicated label at the end. */
function portionRun(count, { startGram = 10, duplicateOf = null, duplicateGram = 999 } = {}) {
  const rows = Array.from({ length: count }, (_, i) => ({
    gramWeight: startGram + i,
    portionDescription: `portion ${i}`,
  }));
  if (duplicateOf !== null) {
    rows.push({ gramWeight: duplicateGram, portionDescription: `portion ${duplicateOf}` });
  }
  return rows;
}

/**
 * Single-food edge cases. `expect` is what the importer must do with the
 * payload and is mirrored into the generated `USDA_EDGE_CASES` table.
 */
export const EDGE_CASES = [
  {
    key: "garbage-nutrients",
    export: "garbageNutrients",
    about: "String, null and negative nutrient values in one record",
    expect: "accept",
    payload: food({
      fdcId: 7000001,
      description: "Garbage food, unparseable nutrient values",
      dataType: "Foundation",
      shape: "id",
      macros: { energy: "not-a-number", protein: null, carbs: -5, fat: 3 },
    }),
  },
  {
    key: "numeric-strings",
    export: "numericStrings",
    about: "Every numeric field delivered as a string, including gramWeight",
    expect: "accept",
    payload: {
      ...food({
        fdcId: "7000002",
        description: "Cheese, cheddar (numeric strings)",
        dataType: "SR Legacy",
        shape: "stringy",
        macros: { ...CHEDDAR, sodium: 621 },
        portions: [{ gramWeight: "28.4", portionDescription: "1 oz" }],
      }),
    },
  },
  {
    key: "nulls-everywhere",
    export: "nullsEverywhere",
    about: "Optional fields explicitly null instead of absent",
    expect: "accept",
    payload: food({
      fdcId: 7000012,
      description: "Cheddar cheese (null-heavy record)",
      dataType: "SR Legacy",
      shape: "id",
      macros: CHEDDAR,
      portions: null,
      extra: {
        brandOwner: null,
        brandName: null,
        gtinUpc: null,
        servingSize: null,
        servingSizeUnit: null,
        householdServingFullText: null,
      },
    }),
  },
  {
    key: "unknown-future-fields",
    export: "unknownFutureFields",
    about: "Unknown top-level field and unknown nutrient id",
    expect: "accept",
    payload: food({
      fdcId: 171077,
      description: "Chicken, broilers or fryers, breast, meat only, raw",
      dataType: "Foundation",
      shape: "id",
      macros: CHICKEN,
      nutrientExtras: [{ nutrientId: 9999999, value: 42, unitName: "??" }],
      portions: [
        { gramWeight: 174, portionDescription: "1 breast" },
        { gramWeight: 85, amount: 3, measureUnit: { name: "oz" } },
      ],
      extra: { newFutureField: { nested: [1, 2, 3] } },
    }),
  },
  {
    key: "sugar-alt-nutrient",
    export: "sugarAltNutrient",
    about: "Sugars published under 1063 instead of 2000",
    expect: "accept",
    payload: food({
      fdcId: 7000011,
      description: "Rice, brown, cooked (sugars reported as 1063)",
      dataType: "Survey (FNDDS)",
      shape: "number",
      macros: { ...RICE, sugarsAlt: 0.4 },
    }),
  },
  {
    key: "undetermined-portions",
    export: "undeterminedPortions",
    about: "Zero-weight and 'undetermined' portion rows mixed with a good one",
    expect: "accept",
    payload: food({
      fdcId: 7000005,
      description: "Rice, brown, cooked (messy portion table)",
      dataType: "Survey (FNDDS)",
      shape: "number",
      macros: RICE,
      portions: [
        { gramWeight: 0, portionDescription: "1 cup" },
        { gramWeight: 50, portionDescription: "Undetermined portion" },
        { gramWeight: 50, amount: 1, measureUnit: { name: "undetermined" } },
        { gramWeight: 195, portionDescription: "1 cup" },
      ],
    }),
  },
  {
    key: "overlong-portion-table",
    export: "overlongPortionTable",
    about: "13 portions with a duplicate label",
    expect: "accept",
    payload: food({
      fdcId: 7000006,
      description: "Rice, brown, cooked (13 portions, one duplicate label)",
      dataType: "Survey (FNDDS)",
      shape: "number",
      macros: RICE,
      portions: portionRun(12, { duplicateOf: 0 }),
    }),
  },
  {
    key: "empty-portion-table",
    export: "emptyPortionTable",
    about: "foodPortions present but empty",
    expect: "accept",
    payload: food({
      fdcId: 7000007,
      description: "Rice, brown, cooked (no portions published)",
      dataType: "Survey (FNDDS)",
      shape: "number",
      macros: RICE,
      portions: [],
    }),
  },
  {
    key: "implausible-portion-weight",
    export: "implausiblePortionWeight",
    about: "Corrupt gram weights (999999 g, negative) beside a valid row",
    expect: "accept",
    payload: food({
      fdcId: 7000010,
      description: "Broccoli, raw (corrupt gram weight)",
      dataType: "SR Legacy",
      shape: "nested",
      macros: BROCCOLI,
      portions: [
        { gramWeight: 999999, portionDescription: "1 pallet" },
        { gramWeight: -91, portionDescription: "1 cup chopped" },
        { gramWeight: 148, portionDescription: "1 stalk, large" },
      ],
    }),
  },
  {
    key: "no-macros-water",
    export: "noMacrosWater",
    about: "No nutrients at all — nothing to log against",
    expect: "reject",
    payload: food({
      fdcId: 7000003,
      description: "Water, bottled, generic",
      dataType: "Foundation",
      macros: {},
    }),
  },
  {
    key: "missing-description",
    export: "missingDescription",
    about: "No description field",
    expect: "reject",
    payload: (() => {
      const p = food({
        fdcId: 7000004,
        description: undefined,
        dataType: "Foundation",
        macros: { energy: 100 },
      });
      delete p.description;
      return p;
    })(),
  },
  {
    key: "missing-fdc-id",
    export: "missingFdcId",
    about: "No fdcId field",
    expect: "reject",
    payload: (() => {
      const p = food({
        fdcId: undefined,
        description: "Food with no FDC id",
        dataType: "Foundation",
        macros: { energy: 100 },
      });
      delete p.fdcId;
      return p;
    })(),
  },
  {
    key: "implausible-macros",
    export: "implausibleMacros",
    about: "5200 kcal per 100 g",
    expect: "reject",
    payload: food({
      fdcId: 7000008,
      description: "Corrupt record, energy far beyond physical limits",
      dataType: "Foundation",
      shape: "id",
      macros: { energy: 5200, protein: 12, carbs: 10, fat: 4 },
    }),
  },
  {
    key: "impossible-macro-sum",
    export: "impossibleMacroSum",
    about: "Macros summing to 150 g per 100 g",
    expect: "reject",
    payload: food({
      fdcId: 7000009,
      description: "Corrupt record, macros sum past 100 g per 100 g",
      dataType: "SR Legacy",
      shape: "nested",
      macros: { energy: 690, protein: 60, carbs: 60, fat: 30 },
    }),
  },
];

/** Search envelopes that are not usable food lists. */
export const MALFORMED_ENVELOPES = [
  {
    key: "foods-string",
    file: "malformed-envelope-foods-string",
    export: "envelopeFoodsString",
    payload: { totalHits: 1, foods: "nope" },
  },
  {
    key: "foods-null",
    file: "malformed-envelope-foods-null",
    export: "envelopeFoodsNull",
    payload: { totalHits: 0, foods: null },
  },
  {
    key: "no-foods-key",
    file: "malformed-envelope-no-foods",
    export: "envelopeNoFoods",
    payload: { totalHits: 0, currentPage: 1 },
  },
];
