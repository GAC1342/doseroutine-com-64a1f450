/**
 * Portion-size reference system (client-safe).
 *
 * Everything the scanner and the review sheet do with portions runs through
 * here: reading grams out of a human portion string, converting household
 * measures, and the hand/object cues people can actually eyeball.
 */

export type FoodPortion = {
  label: string;
  grams: number;
  isDefault: boolean;
  referenceHint: string | null;
};

/** Generic visual cues shown when a food has no portion rows of its own. */
export const VISUAL_REFERENCES: { label: string; grams: number; hint: string }[] = [
  { label: "Thumb tip", grams: 15, hint: "About 1 tbsp — oils, butter, spreads" },
  { label: "Whole thumb", grams: 30, hint: "About 1 oz — cheese, nut butter" },
  { label: "Small handful", grams: 30, hint: "Nuts, seeds, dry snacks" },
  { label: "Golf ball", grams: 45, hint: "Dips, dressings, sauces" },
  { label: "Deck of cards", grams: 85, hint: "Cooked meat or fish, 3 oz" },
  { label: "Palm", grams: 100, hint: "Cooked meat, poultry, or fish" },
  { label: "Tennis ball", grams: 130, hint: "Fruit, ice cream, rice scoop" },
  { label: "Cupped hand", grams: 160, hint: "Cooked rice, grains, beans" },
  { label: "Clenched fist", grams: 200, hint: "Cooked pasta, vegetables" },
  { label: "Baseball", grams: 180, hint: "A whole piece of fruit" },
];

/** Weight/volume units we can convert straight to grams. */
const UNIT_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  gm: 1,
  kg: 1000,
  kgs: 1000,
  kilogram: 1000,
  kilograms: 1000,
  mg: 0.001,
  milligram: 0.001,
  milligrams: 0.001,
  oz: 28.3495,
  ozs: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  ml: 1,
  mls: 1,
  milliliter: 1,
  milliliters: 1,
  millilitre: 1,
  millilitres: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
};

/** Household measures, approximated at water density where a food is unknown. */
const HOUSEHOLD_GRAMS: Record<string, number> = {
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  cup: 240,
  cups: 240,
  "fl oz": 30,
};

/**
 * Make a portion string safe to read digits out of, whatever number format
 * the person typed:
 *   - "1 200 g" / "1 200 g" (grouping space)      -> "1200 g"
 *   - "1,200 g" (thousands comma)                 -> "1200 g"
 *   - "1,5 kg" (decimal comma)                    -> "1.5 kg"
 *   - "1.000,5 kg" (EU grouping dot)              -> "1000.5 kg"
 *   - "1,000.5 lb" (US grouping comma)            -> "1000.5 lb"
 *   - "1.234.567,8 g" (repeated grouping dots)    -> "1234567.8 g"
 * When both separators appear, the last one is the decimal mark and the other
 * is grouping — that rule is what keeps thousands and decimals from swapping.
 * Fractions such as "1 1/2 cups" are untouched: the grouping rule only fires
 * when exactly three digits follow the separator.
 */
export function normalizeNumberFormats(raw: string): string {
  const spaced = raw.replace(/(\d)[\u00a0\u202f\u2009 ](?=\d{3}(?!\d))/g, "$1");

  // Rewrite each number token on its own so a mixed string stays consistent.
  return spaced.replace(/\d[\d.,]*\d|\d/g, (token) => {
    const lastComma = token.lastIndexOf(",");
    const lastDot = token.lastIndexOf(".");

    if (lastComma !== -1 && lastDot !== -1) {
      // Both present: the rightmost separator is the decimal mark.
      const decimalAt = Math.max(lastComma, lastDot);
      const intPart = token.slice(0, decimalAt).replace(/[.,]/g, "");
      const decPart = token.slice(decimalAt + 1).replace(/[.,]/g, "");
      return decPart ? `${intPart}.${decPart}` : intPart;
    }

    if (lastComma !== -1) {
      // Commas only: 3-digit groups are grouping, anything else is decimal.
      return /^\d{1,3}(,\d{3})+$/.test(token)
        ? token.replace(/,/g, "")
        : token.replace(/,(\d)/g, ".$1").replace(/,/g, "");
    }

    if (lastDot !== -1) {
      // Dots only: two or more 3-digit groups can only be grouping.
      // A single group ("1.500") stays a decimal — it is genuinely ambiguous
      // and the decimal reading is the common one in this app's inputs.
      return /^\d{1,3}(\.\d{3}){2,}$/.test(token) ? token.replace(/\./g, "") : token;
    }

    return token;
  });
}

/** Unicode vulgar fractions people paste or type on phone keyboards. */
const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅐": 1 / 7,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
  "⅑": 1 / 9,
  "⅒": 1 / 10,
  "↉": 0,
};

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");
const FRACTION_RE = new RegExp(`(\\d+)?\\s*([${FRACTION_CHARS}])`, "g");
/** Character class fragment covering digits, separators and every fraction glyph. */
const QTY_CHAR_CLASS = `[\\d\\s./${FRACTION_CHARS}]`;

/**
 * Turn unicode fraction symbols into plain decimals so every downstream
 * matcher (weights, household measures, quantities) reads them the same:
 *   "½ cup"    -> "0.5 cup"
 *   "1⅓ cups"  -> "1.3333 cups"
 *   "1 ½ lb"   -> "1.5 lb"
 *   "1⁄2 cup"  -> "1/2 cup"  (fraction slash becomes a normal slash)
 */
export function normalizeUnicodeFractions(raw: string): string {
  return raw
    .replace(/\u2044/g, "/")
    .replace(FRACTION_RE, (_match, whole: string | undefined, frac: string) => {
      const value = (whole ? Number(whole) : 0) + (UNICODE_FRACTIONS[frac] ?? 0);
      return String(Math.round(value * 10000) / 10000);
    });
}

/** Every unit word the parser understands, for malformed-input detection. */
const UNIT_WORDS =
  "kgs?|kilograms?|mg|grams?|gm|g|ounces?|ozs?|lbs?|pounds?|milliliters?|millilitres?|mls?|liters?|litres?|l|cups?|tablespoons?|tbsp|teaspoons?|tsp";

/**
 * True when a quantity string is ambiguous or malformed enough that any
 * reading would be a guess: "1,,5 kg", "1,5,5 kg", "kg 2", "1e3 kg",
 * "2.5.5 kg", "1/0 cup", "1 2 3 g", "1 kg kg".
 *
 * Rejecting these is safer than half-reading them — a wrong grams value
 * silently rescales every macro in the meal.
 */
export function isMalformedQuantity(raw: string | null | undefined): boolean {
  const text = normalizeUnicodeFractions(String(raw ?? "").toLowerCase())
    // Collapse grouping spaces first so "1 200 g" is not read as two numbers.
    .replace(/(\d)[\u00a0\u202f\u2009 ](?=\d{3}(?!\d))/g, "$1")
    .trim();
  if (!text) return false;

  // Doubled or adjacent separators: "1,,5", "1, .5".
  if (/[.,]\s*[.,]/.test(text)) return true;
  // A separator with no leading digit: ".5 kg", ",5 kg", ".  3333 kg".
  if (/(^|[^\d])[.,]\s*\d/.test(text)) return true;
  // Scientific notation is never a portion people mean.
  if (/\d\s*e\s*[-+]?\d/.test(text)) return true;
  // Division by zero.
  if (/\/\s*0+(\D|$)/.test(text)) return true;

  for (const token of text.match(/\d[\d.,]*/g) ?? []) {
    // Trailing separator: "1. kg", "1, kg".
    if (/[.,]$/.test(token)) return true;
    const seps = (token.match(/[.,]/g) ?? []).length;
    if (seps <= 1) continue;
    // More than one separator is only valid as digit grouping plus an
    // optional decimal tail: "1,000.5", "1.234.567,8".
    if (!/^\d{1,3}([.,]\d{3})+([.,]\d+)?$/.test(token)) return true;
  }

  // Two unit words back to back: "1 kg kg", "2 g oz".
  if (new RegExp(`\\b(?:${UNIT_WORDS})\\b\\s+\\b(?:${UNIT_WORDS})\\b`).test(text)) return true;

  // A nutrient word glued to a measured unit is a macro line, not a portion:
  // "2 kg calories", "2 g protein". Reading it as weight would silently
  // rescale every macro in the meal.
  const NUTRIENT_WORDS =
    "calories?|cals?|kcals?|protein|carbs?|carbohydrates?|fats?|fibers?|fibres?|sugars?|sodium";
  if (
    new RegExp(`\\b(?:${NUTRIENT_WORDS})\\b`).test(text) &&
    new RegExp(`\\d\\s*(?:${UNIT_WORDS})\\b`).test(text)
  ) {
    return true;
  }

  // Two different measured units in one string ("2 kg 3 oz", "1 l 200 ml").
  // Parenthesised label weights ("1 cup (158 g)") and the imperial "1 lb 4 oz"
  // compound are the two legitimate exceptions.
  const outsideParens = text.replace(/\([^)]*\)/g, " ").replace(/\bfl\s+oz\b/g, "floz");
  const families: string[] = [];
  for (const m of outsideParens.matchAll(
    new RegExp(`\\d[\\d.,/\\s]*\\s*(${UNIT_WORDS})\\b`, "g"),
  )) {
    const unit = m[1] ?? "";
    const family = /^(?:k?gs?|kilograms?|mg|grams?|gm)$/.test(unit)
      ? "metric-mass"
      : /^(?:ounces?|ozs?|lbs?|pounds?)$/.test(unit)
        ? "imperial-mass"
        : /^(?:milliliters?|millilitres?|mls?|liters?|litres?|l)$/.test(unit)
          ? "volume"
          : "household";
    families.push(family);
  }
  if (families.length > 1) {
    const isCompoundImperial =
      families.length === 2 &&
      families.every((f) => f === "imperial-mass") &&
      /\d[\d.,]*\s*(?:lbs?|pounds?)\s+\d[\d.,]*\s*(?:ozs?|ounces?)\b/.test(outsideParens);
    if (!isCompoundImperial) return true;
  }

  // A unit word with no number in front of it: "kg 2", "oz 4 lb 1".
  // "fl oz" is one unit, so collapse it before checking.
  const unitCheck = text.replace(/\bfl\s+oz\b/g, "floz");
  if (new RegExp(`(?:^|[^0-9\\s])\\s*\\b(?:${UNIT_WORDS})\\b`).test(unitCheck)) return true;

  // Two plain numbers in a row that are not a mixed fraction: "1 2 3 g".
  const withoutMixed = text.replace(/\d+\s+\d+\s*\/\s*\d+/g, " ");
  if (/\d\s+\d/.test(withoutMixed)) return true;

  return false;
}

/**
 * One canonical spelling for any quantity string.
 *
 * Everything downstream (parseQuantity, parsePortionGrams) reads this form, so
 * formatter output and hand-typed input converge on the same text:
 *   "  2  KG "      -> "2 kg"
 *   "1,5 l"         -> "1.5 l"
 *   "1.2500 lb"     -> "1.25 lb"
 *   "2\tfl  oz"     -> "2 fl oz"
 *   "1 ½ Cups"      -> "1.5 cups"
 * Purely cosmetic differences (case, padding, tabs/newlines, non-breaking
 * spaces, decimal separator, trailing zeros) can therefore never change the
 * parsed grams or the macros rescaled from them.
 */
export function normalizePortionInput(raw: string | null | undefined): string {
  const spaced = String(raw ?? "")
    .toLowerCase()
    // Tabs, newlines and exotic spaces all become a plain space first so the
    // grouping-separator rules below see a single consistent separator.
    .replace(/[\t\n\r\v\f\u00a0\u202f\u2009\u200a]/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();

  const numeric = normalizeNumberFormats(normalizeUnicodeFractions(spaced));

  // Drop trailing zeros in a decimal tail: "1.2500" -> "1.25", "2.0" -> "2".
  return numeric.replace(/(\d+)\.(\d+)/g, (_m, int: string, dec: string) => {
    const trimmed = dec.replace(/0+$/, "");
    return trimmed ? `${int}.${trimmed}` : int;
  });
}

/** "1 1/2", "1.5", "1,5", "½", "1⅓" → number. Malformed input → null. */
export function parseQuantity(raw: string): number | null {
  if (isMalformedQuantity(raw)) return null;
  const text = normalizePortionInput(raw);

  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den > 0) return whole + num / den;
  }
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)/);
  if (fraction) {
    const num = Number(fraction[1]);
    const den = Number(fraction[2]);
    if (den > 0) return num / den;
  }
  const plain = text.match(/^(\d+(?:\.\d+)?)/);
  if (plain) {
    const n = Number(plain[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Best-effort grams for a human portion string.
 *
 * Handles "150 g", "1 cup (158 g)", "3 oz", "1 lb 4 oz", "2 tbsp", "1.5 cups",
 * unicode fractions ("½ cup", "1⅓ cups", "¾ lb"), and the comma/space number
 * formats above.
 * Returns null when the string carries no measurable quantity ("1 serving")
 * or when the quantity is malformed/ambiguous ("1,,5 kg", "kg 2").
 */
/**
 * Grams at the parser's one-decimal contract — except for genuinely tiny
 * amounts ("2 mg" = 0.002 g), which keep four decimals instead of rounding
 * away to a meaningless 0 g. Never returns 0 or a negative value.
 */
function positiveGrams(grams: number): number | null {
  if (!Number.isFinite(grams) || grams <= 0) return null;
  const rounded = round1(grams);
  if (rounded > 0) return rounded;
  const fine = Math.round(grams * 10000) / 10000;
  return fine > 0 ? fine : null;
}

export function parsePortionGrams(portion: string | null | undefined): number | null {
  const raw = String(portion ?? "")
    .toLowerCase()
    .trim();
  if (isMalformedQuantity(raw)) return null;
  const text = normalizePortionInput(raw);

  if (!text) return null;
  // A negative amount is never a real portion.
  if (/-\s*\d/.test(text)) return null;

  // A gram weight inside parentheses always wins: "1 cup (158 g)".
  const paren = text.match(/\(\s*(\d+(?:\.\d+)?)\s*(g|gram|grams|ml)\s*\)/);
  if (paren) {
    const n = Number(paren[1]);
    if (Number.isFinite(n) && n > 0) return positiveGrams(n);
  }

  // Compound imperial weights: "1 lb 4 oz".
  const compound = text.match(
    /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\s*(\d+(?:\.\d+)?)\s*(?:ozs?|ounces?)\b/,
  );
  if (compound) {
    const pounds = Number(compound[1]);
    const ounces = Number(compound[2]);
    if (Number.isFinite(pounds) && Number.isFinite(ounces)) {
      const grams = pounds * UNIT_GRAMS["lb"]! + ounces * UNIT_GRAMS["oz"]!;
      if (grams > 0) return positiveGrams(grams);
    }
  }

  // Longest spellings first: alternation is ordered, so "kilograms" must be
  // offered before "kg" and "grams" before "g", or the short form matches and
  // the word boundary fails the whole unit.
  const UNIT_PATTERN =
    "kilograms?|kgs?|milligrams?|mg|grams?|gm|g|ounces?|ozs?|pounds?|lbs?|milli(?:lit(?:er|re))s?|mls?|lit(?:er|re)s?|l";

  // ASCII fractions against a weight unit: "3/4 lb", "1 1/2 kg".
  const fractionUnit = text.match(
    new RegExp(`^((?:\\d+\\s+)?\\d+\\s*/\\s*\\d+)\\s*(${UNIT_PATTERN})\\b`),
  );
  if (fractionUnit) {
    const qty = parseQuantity(fractionUnit[1] ?? "");
    const factor = UNIT_GRAMS[fractionUnit[2] ?? ""] ?? null;
    if (qty && factor) return positiveGrams(qty * factor);
  }

  const direct = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\b`));
  if (direct) {
    const n = Number(direct[1]);
    const factor = UNIT_GRAMS[direct[2] ?? ""] ?? null;
    // A zero amount ("0.0000 kg") is not a portion, it's a blank entry.
    if (Number.isFinite(n) && n > 0 && factor) return positiveGrams(n * factor);
  }

  const household = text.match(
    new RegExp(`^(${QTY_CHAR_CLASS}+)\\s*(tbsp|tablespoons?|tsp|teaspoons?|cups?|fl\\s+oz)\\b`),
  );

  if (household) {
    const qty = parseQuantity(household[1] ?? "");
    // "fl  oz" pasted from a label collapses to the single-space table key.
    const unit = (household[2] ?? "").replace(/\s+/g, " ");
    const factor = HOUSEHOLD_GRAMS[unit] ?? null;
    if (qty && factor) return positiveGrams(qty * factor);
  }

  return null;
}

/** Scale a portion string's leading quantity, keeping the wording. */
export function formatGrams(grams: number): string {
  if (!Number.isFinite(grams) || grams <= 0) return "";
  if (grams >= 100) return `${Math.round(grams)} g`;
  const one = round1(grams);
  // Tiny amounts ("2 mg" = 0.002 g) must not print as "0 g" — that would not
  // re-parse to anything, breaking the format -> parse round trip.
  return one > 0 ? `${one} g` : `${Math.round(grams * 10000) / 10000} g`;
}

/** A portion label for a gram weight, using the closest known portion. */
export function describeGrams(grams: number, portions: FoodPortion[]): string {
  if (!Number.isFinite(grams) || grams <= 0) return "";
  if (portions.length === 0) return formatGrams(grams);
  let best = portions[0]!;
  let bestDelta = Math.abs(grams - best.grams);
  for (const p of portions) {
    const delta = Math.abs(grams - p.grams);
    if (delta < bestDelta) {
      best = p;
      bestDelta = delta;
    }
  }
  const ratio = best.grams > 0 ? grams / best.grams : 1;
  if (Math.abs(ratio - 1) < 0.05) return best.label;
  const stripped = best.label
    .replace(new RegExp(`^${QTY_CHAR_CLASS}+`), "")
    .replace(/\s*\(.*\)$/, "")
    .trim();
  const qty = round1(ratio);
  return stripped ? `${qty} × ${stripped} (${formatGrams(grams)})` : formatGrams(grams);
}

/** Broad food classes that decide which visual cues make sense. */
export type PortionCueClass =
  | "protein"
  | "grain"
  | "vegetable"
  | "fruit"
  | "nuts"
  | "fat"
  | "sauce"
  | "cheese"
  | "any";

const CUE_CLASS_PATTERNS: { cls: PortionCueClass; re: RegExp }[] = [
  { cls: "fat", re: /\b(oil|butter|ghee|margarine|mayo|mayonnaise|lard|tallow)\b/ },
  { cls: "sauce", re: /\b(sauce|dressing|dip|salsa|gravy|ketchup|mustard|syrup|hummus)\b/ },
  {
    cls: "nuts",
    re: /\b(nuts?|almonds?|peanuts?|cashews?|walnuts?|pecans?|pistachios?|seeds?|granola|trail mix)\b/,
  },
  { cls: "cheese", re: /\b(cheese|cheddar|mozzarella|parmesan|feta|brie|gouda)\b/ },
  {
    cls: "protein",
    re: /\b(chicken|beef|steak|pork|turkey|lamb|bacon|ham|sausage|fish|salmon|tuna|cod|tilapia|shrimp|prawn|egg|eggs|tofu|tempeh|meat|burger|patty|breast|thigh|mince)\b/,
  },
  {
    cls: "grain",
    re: /\b(rice|pasta|noodle|spaghetti|quinoa|couscous|oat|oatmeal|barley|bean|beans|lentil|chickpea|potato|potatoes|bread|cereal|grain)\b/,
  },
  {
    cls: "vegetable",
    re: /\b(broccoli|spinach|kale|lettuce|salad|carrot|pepper|zucchini|courgette|cauliflower|cabbage|green beans?|peas|asparagus|mushroom|onion|tomato|cucumber|squash|brussels|veg|vegetables?|greens)\b/,
  },
  {
    cls: "fruit",
    re: /\b(apple|banana|orange|pear|peach|mango|berry|berries|strawberr|blueberr|grape|melon|pineapple|fruit)\b/,
  },
];

/** Classify a food name into a portion-cue class. */
export function cueClassFor(name: string | null | undefined): PortionCueClass {
  const text = (name ?? "").toLowerCase();
  if (!text) return "any";
  for (const { cls, re } of CUE_CLASS_PATTERNS) {
    if (re.test(text)) return cls;
  }
  return "any";
}

/** Which visual cue labels are meaningful for each food class. */
const CUES_BY_CLASS: Record<PortionCueClass, string[]> = {
  protein: ["Deck of cards", "Palm", "Whole thumb"],
  grain: ["Cupped hand", "Tennis ball", "Clenched fist"],
  vegetable: ["Clenched fist", "Cupped hand", "Tennis ball"],
  fruit: ["Baseball", "Tennis ball", "Cupped hand"],
  nuts: ["Small handful", "Whole thumb", "Thumb tip"],
  fat: ["Thumb tip", "Whole thumb"],
  sauce: ["Golf ball", "Thumb tip", "Whole thumb"],
  cheese: ["Whole thumb", "Thumb tip", "Deck of cards"],
  any: VISUAL_REFERENCES.map((r) => r.label),
};

/**
 * Nearest visual cue for a gram weight, for the "how big is that?" hint.
 * When a food name is given, only cues that make sense for that food are used
 * (so chicken gets "deck of cards", broccoli gets "clenched fist").
 */
export function visualHintFor(grams: number, foodName?: string | null): string | null {
  if (!Number.isFinite(grams) || grams <= 0) return null;
  // Class order is the preference order, so ties (two cues at the same weight)
  // resolve to the cue that fits the food best.
  const candidates = CUES_BY_CLASS[cueClassFor(foodName)]
    .map((label) => VISUAL_REFERENCES.find((r) => r.label === label))
    .filter((r): r is (typeof VISUAL_REFERENCES)[number] => Boolean(r));
  const pool = candidates.length > 0 ? candidates : VISUAL_REFERENCES;
  let best = pool[0]!;
  for (const ref of pool) {
    if (Math.abs(grams - ref.grams) < Math.abs(grams - best.grams)) best = ref;
  }
  // Only useful when the cue is actually close to the amount.
  const off = Math.abs(grams - best.grams) / best.grams;
  return off <= 0.4 ? `${best.label.toLowerCase()} — ${best.hint}` : null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
