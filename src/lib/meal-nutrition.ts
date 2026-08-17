/**
 * Shared meal / nutrition helpers.
 *
 * The AI photo estimate, the barcode nutrition panel, and manual entry all
 * produce the same `MealItem[]` shape so a single review sheet can edit and
 * save any of them identically.
 */

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack", "other"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  other: "Other",
};

export type MealSource = "photo" | "barcode" | "manual";
export type MealConfidence = "high" | "medium" | "low";

export type MealItem = {
  name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MealTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/**
 * Where the numbers actually came from, best first:
 *  - "barcode"          published manufacturer panel (exact)
 *  - "nutrition_label"  OCR of a printed Nutrition Facts panel in the photo
 *  - "visual"           the model estimating portions from what it can see
 */
export type MealReadSource = "barcode" | "nutrition_label" | "visual";

/** Calorie-vs-macro cross-check used to explain the confidence. */
export type MealReconciliation = {
  /** Calories as listed on the items. */
  stated: number;
  /** Calories implied by protein/carbs/fat (Atwater). */
  implied: number;
  driftPct: number;
  status: "ok" | "mismatch" | "not_applicable";
};

export type MealEstimate = {
  label: string;
  items: MealItem[];
  confidence: MealConfidence;
  note: string;
  /** Present once the estimate has been reconciled. */
  reconciliation?: MealReconciliation;
  /** Defaults to "visual" for older/plain estimates. */
  readFrom?: MealReadSource;
  /** Set when a barcode drove (or was read from) the scan. */
  barcode?: string | null;
};

export const EMPTY_TOTALS: MealTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Validation result for a set of meal totals or an individual item. */
export type MacroValidationIssue = {
  /** Hard errors block save; warnings allow save after user confirms. */
  kind: "error" | "warning";
  /** Which field the issue refers to, or "totals" for the whole meal. */
  field: "calories" | "protein_g" | "carbs_g" | "fat_g" | "totals";
  /** Human-readable explanation shown in the UI. */
  message: string;
};

/** Reasonable upper bounds for a single meal. */
const DEFAULT_CEILINGS: MealTotals = {
  calories: 10_000,
  protein_g: 2_000,
  carbs_g: 2_000,
  fat_g: 2_000,
};

/**
 * Validate a MealTotals object and return any issues.
 *
 * Rules:
 *  - negative numbers are hard errors
 *  - values above the supplied (or default) ceilings are hard errors
 *  - calories > 0 with all macros zero is a warning (e.g. alcohol-only entry)
 *  - Atwater mismatch > 30% is a warning
 */
export function validateMealTotals(
  totals: MealTotals,
  options?: { ceilings?: Partial<MealTotals>; atwaterThreshold?: number },
): MacroValidationIssue[] {
  const issues: MacroValidationIssue[] = [];
  const ceilings = { ...DEFAULT_CEILINGS, ...(options?.ceilings ?? {}) };
  const threshold = options?.atwaterThreshold ?? 0.3;

  (Object.keys(totals) as (keyof MealTotals)[]).forEach((key) => {
    const value = totals[key];
    if (!Number.isFinite(value) || value < 0) {
      issues.push({
        kind: "error",
        field: key,
        message: `${formatMacroName(key)} cannot be negative.`,
      });
    } else if (value > ceilings[key]) {
      issues.push({
        kind: "error",
        field: key,
        message: `${formatMacroName(key)} looks too high (${value}). Please double-check.`,
      });
    }
  });

  const hasMacros = totals.protein_g > 0 || totals.carbs_g > 0 || totals.fat_g > 0;
  if (totals.calories > 0 && !hasMacros) {
    issues.push({
      kind: "warning",
      field: "totals",
      message:
        "Calories are set but protein, carbs, and fat are all zero — this is unusual unless the food is pure alcohol.",
    });
  }

  if (hasMacros && totals.calories > 0) {
    const implied = totals.protein_g * 4 + totals.carbs_g * 4 + totals.fat_g * 9;
    const maxVal = Math.max(totals.calories, implied);
    if (maxVal > 0) {
      const drift = Math.abs(totals.calories - implied) / maxVal;
      if (drift > threshold) {
        issues.push({
          kind: "warning",
          field: "totals",
          message: `Calories (${totals.calories}) and macros (~${Math.round(implied)} kcal from protein/carbs/fat) are ${Math.round(drift * 100)}% apart.`,
        });
      }
    }
  }

  return issues;
}

function formatMacroName(key: keyof MealTotals): string {
  return key === "calories"
    ? "Calories"
    : key.replace("_g", " (g)").replace(/^\w/, (c) => c.toUpperCase());
}

/** Validate a single meal item. */
export function validateMealItem(
  item: MealItem,
  index: number,
  options?: { ceilings?: Partial<MealTotals> },
): MacroValidationIssue[] {
  const totals: MealTotals = {
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
  };
  return validateMealTotals(totals, { ...options, atwaterThreshold: 0.3 }).map((issue) => ({
    ...issue,
    message: `Item ${index + 1}: ${issue.message}`,
  }));
}

/** Round a macro to a sane display precision: whole calories, 1dp grams. */
export function roundMacro(value: number, unit: "kcal" | "g" = "g"): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return unit === "kcal" ? Math.round(value) : Math.round(value * 10) / 10;
}

export function totalsFor(items: MealItem[]): MealTotals {
  return items.reduce<MealTotals>(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      protein_g: acc.protein_g + (Number(item.protein_g) || 0),
      carbs_g: acc.carbs_g + (Number(item.carbs_g) || 0),
      fat_g: acc.fat_g + (Number(item.fat_g) || 0),
    }),
    { ...EMPTY_TOTALS },
  );
}

export function roundTotals(totals: MealTotals): MealTotals {
  return {
    calories: roundMacro(totals.calories, "kcal"),
    protein_g: roundMacro(totals.protein_g),
    carbs_g: roundMacro(totals.carbs_g),
    fat_g: roundMacro(totals.fat_g),
  };
}

/** Rescale every item by a portion multiplier (0.5x, 1.5x, 2x, …). */
export function scaleItems(items: MealItem[], factor: number): MealItem[] {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return items.map((item) => ({
    ...item,
    calories: roundMacro(item.calories * f, "kcal"),
    protein_g: roundMacro(item.protein_g * f),
    carbs_g: roundMacro(item.carbs_g * f),
    fat_g: roundMacro(item.fat_g * f),
  }));
}

export function emptyItem(name = ""): MealItem {
  return { name, portion: "1 serving", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

/** Pick a sensible default slot from the local hour. */
export function slotForHour(hour: number): MealSlot {
  if (hour < 5) return "snack";
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export const CONFIDENCE_COPY: Record<MealConfidence, string> = {
  high: "Clear photo of familiar food — numbers should be close.",
  medium: "Reasonable guess. Check the portion size before saving.",
  low: "Hard to read — mixed dish, sauces, or hidden oils. Please review every number.",
};

/**
 * Normalize whatever the model returned into a safe MealEstimate.
 * Never throws: a malformed field becomes 0 / a sane default.
 */
export function normalizeEstimate(raw: unknown): MealEstimate {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(obj["items"]) ? (obj["items"] as unknown[]) : [];
  const items: MealItem[] = rawItems.slice(0, 20).map((entry) => {
    const it = (entry ?? {}) as Record<string, unknown>;
    const num = (key: string) => {
      const n = Number(it[key]);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    return {
      name: String(it["name"] ?? "Item").slice(0, 80),
      portion: String(it["portion"] ?? "1 serving").slice(0, 60),
      calories: roundMacro(num("calories"), "kcal"),
      protein_g: roundMacro(num("protein_g")),
      carbs_g: roundMacro(num("carbs_g")),
      fat_g: roundMacro(num("fat_g")),
    };
  });
  const readRaw = String(obj["read_from"] ?? obj["readFrom"] ?? "visual").toLowerCase();
  const readFrom: MealReadSource =
    readRaw === "barcode" || readRaw === "nutrition_label" ? (readRaw as MealReadSource) : "visual";
  const confidenceRaw = String(obj["confidence"] ?? "medium").toLowerCase();
  const confidence: MealConfidence =
    confidenceRaw === "high" || confidenceRaw === "low"
      ? (confidenceRaw as MealConfidence)
      : "medium";
  return {
    label: String(obj["label"] ?? "Meal").slice(0, 80),
    items: items.length > 0 ? items : [emptyItem()],
    confidence,
    note: String(obj["note"] ?? "").slice(0, 300),
    readFrom,
  };
}

/** kcal implied by the macros themselves (Atwater factors). */
export function macroImpliedCalories(items: MealItem[]): number {
  const t = totalsFor(items);
  return roundMacro(t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9, "kcal");
}

/**
 * Sanity-check an estimate before it reaches the review sheet.
 *
 * A model that reads a label well produces macros whose Atwater sum lands
 * close to the stated calories. A wide gap means it guessed, so we downgrade
 * the confidence rather than presenting shaky numbers as trustworthy.
 * Reads straight off a barcode panel are exact and skip the downgrade.
 */
export function reconcileEstimate(estimate: MealEstimate): MealEstimate {
  const readFrom = estimate.readFrom ?? "visual";
  const reconciliation = reconcileFacts(estimate.items, readFrom);
  const { stated, implied } = reconciliation;
  if (reconciliation.status !== "mismatch") {
    // Numbers agree (or the check does not apply) — a clean label read can be
    // trusted at high confidence.
    const confidence: MealConfidence =
      reconciliation.status === "ok" && readFrom === "nutrition_label"
        ? "high"
        : estimate.confidence;
    return { ...estimate, readFrom, confidence, reconciliation };
  }

  const note =
    `Calories (${stated}) and macros (~${implied} kcal from protein/carbs/fat) don't line up — ` +
    "double-check the numbers." +
    (estimate.note ? ` ${estimate.note}` : "");
  return {
    ...estimate,
    readFrom,
    confidence: estimate.confidence === "low" ? "low" : "medium",
    note: note.slice(0, 300),
    reconciliation,
  };
}

/**
 * Structured calorie-vs-macro cross-check, so the review sheet can explain
 * the confidence instead of only asserting it.
 */
export function reconcileFacts(
  items: MealItem[],
  readFrom: MealReadSource = "visual",
): MealReconciliation {
  const stated = roundTotals(totalsFor(items)).calories;
  const implied = macroImpliedCalories(items);
  if (readFrom === "barcode" || stated <= 0 || implied <= 0) {
    return { stated, implied, driftPct: 0, status: "not_applicable" };
  }
  const driftPct = Math.round((Math.abs(stated - implied) / Math.max(stated, implied)) * 100);
  return { stated, implied, driftPct, status: driftPct <= 25 ? "ok" : "mismatch" };
}

/** Plain-English bullets explaining how trustworthy the numbers are. */
export function provenanceFactors(input: {
  source: MealSource;
  readFrom?: MealReadSource | null;
  items: MealItem[];
  note?: string;
  edited?: boolean;
}): string[] {
  const readFrom: MealReadSource =
    input.readFrom ?? (input.source === "barcode" ? "barcode" : "visual");
  const factors: string[] = [];
  if (input.source === "manual") {
    factors.push("Every number was typed in by hand.");
  } else {
    factors.push(READ_SOURCE_COPY[readFrom]);
  }

  const check = reconcileFacts(input.items, input.source === "manual" ? "barcode" : readFrom);
  if (check.status === "ok") {
    factors.push(
      `Cross-check passed: ${check.stated} kcal listed vs ~${check.implied} kcal from the macros (within ${check.driftPct}%).`,
    );
  } else if (check.status === "mismatch") {
    factors.push(
      `Cross-check failed: ${check.stated} kcal listed vs ~${check.implied} kcal from the macros (${check.driftPct}% apart) — confidence lowered.`,
    );
  }

  const note = (input.note ?? "").trim();
  if (note && !note.startsWith("Calories (")) factors.push(note);
  if (input.edited) factors.push("Totals include your own manual edits.");
  return factors;
}

export const READ_SOURCE_COPY: Record<MealReadSource, string> = {
  barcode: "Read from the product's published nutrition panel.",
  nutrition_label: "Read from the Nutrition Facts panel in your photo.",
  visual: "Estimated from what the photo shows.",
};

export const READ_SOURCE_LABELS: Record<MealReadSource, string> = {
  barcode: "Barcode panel",
  nutrition_label: "Label in photo",
  visual: "Visual estimate",
};

/** Why a better source wasn't used, shown on the dimmed chips. */
export const READ_SOURCE_SKIPPED: Record<MealReadSource, string> = {
  barcode: "No barcode found",
  nutrition_label: "No label visible",
  visual: "Not needed",
};

/** A packaged product matched by barcode or name search. */
export type FoodLabelMatch = {
  found: boolean;
  name: string;
  brand: string | null;
  servingSize: string | null;
  perServing: MealItem | null;
  basis: "serving" | "100g" | null;
  sourceUrl: string;
  barcode: string;
};

/** One "per serving x servings = total" line of the recalculation breakdown. */
export type ScaleMacroRow = {
  key: keyof MealTotals;
  label: string;
  unit: "kcal" | "g";
  perServing: number;
  servings: number;
  exact: number;
  shown: number;
  rounded: boolean;
};

export type ScaleItemRow = {
  name: string;
  portion: string;
  perServingCalories: number;
  scaledCalories: number;
};

export type ScaleBreakdown = {
  servings: number;
  macros: ScaleMacroRow[];
  items: ScaleItemRow[];
  anyRounded: boolean;
};

const MACRO_META: { key: keyof MealTotals; label: string; unit: "kcal" | "g" }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
];

/**
 * Explain a servings recalculation: every displayed number is the per-serving
 * value multiplied by the servings eaten, then rounded for display.
 */
export function buildScaleBreakdown(input: {
  perServing: MealTotals;
  servings: number;
  shownTotals: MealTotals;
  baseItems: MealItem[];
  items: MealItem[];
}): ScaleBreakdown {
  const servings = Number.isFinite(input.servings) && input.servings > 0 ? input.servings : 1;
  const macros = MACRO_META.map(({ key, label, unit }) => {
    const perServing = Number(input.perServing[key]) || 0;
    const exact = perServing * servings;
    const shown = Number(input.shownTotals[key]) || 0;
    return {
      key,
      label,
      unit,
      perServing,
      servings,
      exact,
      shown,
      rounded: Math.abs(exact - shown) > 0.05,
    };
  });
  const items = input.items.map((item, index) => {
    const base = input.baseItems[index];
    return {
      name: item.name || `Item ${index + 1}`,
      portion: item.portion,
      perServingCalories: base
        ? roundMacro(base.calories, "kcal")
        : roundMacro((Number(item.calories) || 0) / servings, "kcal"),
      scaledCalories: roundMacro(Number(item.calories) || 0, "kcal"),
    };
  });
  return { servings, macros, items, anyRounded: macros.some((row) => row.rounded) };
}


/** One field an auto-fix pass corrected, in plain English. */
export type AutoFixChange = {
  /** Item index, or null for the meal totals. */
  itemIndex: number | null;
  field: keyof MealTotals;
  from: number;
  to: number;
  reason: "negative" | "invalid" | "too_high";
};

export type AutoFixResult<T> = {
  value: T;
  changes: AutoFixChange[];
};

/**
 * Clamp negative, non-numeric, or absurdly large values into a saveable range.
 * Nothing else is touched: sensible numbers come back byte-identical so the
 * user's own edits are never silently rewritten.
 */
export function autoFixTotals(
  totals: MealTotals,
  options?: { ceilings?: Partial<MealTotals>; itemIndex?: number | null },
): AutoFixResult<MealTotals> {
  const ceilings = { ...DEFAULT_CEILINGS, ...(options?.ceilings ?? {}) };
  const itemIndex = options?.itemIndex ?? null;
  const changes: AutoFixChange[] = [];
  const next = { ...totals };

  (Object.keys(next) as (keyof MealTotals)[]).forEach((key) => {
    const value = Number(next[key]);
    if (!Number.isFinite(value)) {
      changes.push({ itemIndex, field: key, from: 0, to: 0, reason: "invalid" });
      next[key] = 0;
      return;
    }
    if (value < 0) {
      changes.push({ itemIndex, field: key, from: value, to: 0, reason: "negative" });
      next[key] = 0;
      return;
    }
    if (value > ceilings[key]) {
      changes.push({ itemIndex, field: key, from: value, to: ceilings[key], reason: "too_high" });
      next[key] = ceilings[key];
    }
  });

  return { value: roundTotals(next), changes };
}

/** Run {@link autoFixTotals} across every item, preserving names and portions. */
export function autoFixItems(
  items: MealItem[],
  options?: { ceilings?: Partial<MealTotals> },
): AutoFixResult<MealItem[]> {
  const changes: AutoFixChange[] = [];
  const value = items.map((item, index) => {
    const fixed = autoFixTotals(
      {
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      },
      { ...options, itemIndex: index },
    );
    changes.push(...fixed.changes);
    return { ...item, ...fixed.value };
  });
  return { value, changes };
}

/** Short sentence describing what an auto-fix pass changed. */
export function describeAutoFix(changes: AutoFixChange[]): string {
  if (changes.length === 0) return "Everything already looks valid.";
  const parts = changes.slice(0, 3).map((change) => {
    const where = change.itemIndex === null ? "Meal" : `Item ${change.itemIndex + 1}`;
    const what = formatMacroName(change.field);
    if (change.reason === "too_high") return `${where} ${what} capped at ${change.to}`;
    return `${where} ${what} set to 0`;
  });
  const extra = changes.length - parts.length;
  return extra > 0 ? `${parts.join(", ")} and ${extra} more.` : `${parts.join(", ")}.`;
}
