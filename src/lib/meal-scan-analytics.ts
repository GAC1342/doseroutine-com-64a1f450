import { trackEvent } from "@/lib/analytics";

/**
 * Analytics for the meal scanner funnel.
 *
 * capture -> parse (ok | error) -> review opened -> save (ok | error)
 *
 * Every step carries a `scan_id` so a single attempt can be followed end to
 * end, plus timings so we can watch reliability and conversion over time.
 */
export const MEAL_SCAN_EVENTS = {
  capture: "meal_scan_capture",
  parse: "meal_scan_parse",
  parseError: "meal_scan_parse_error",
  reviewOpened: "meal_scan_review_opened",
  save: "meal_scan_save",
  saveError: "meal_scan_save_error",
} as const;

export type MealScanMethod = "photo" | "barcode" | "search" | "manual";

export function newScanId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function trackScanCapture(
  scanId: string,
  method: MealScanMethod,
  extra: Record<string, unknown> = {},
) {
  trackEvent(MEAL_SCAN_EVENTS.capture, { scan_id: scanId, method, ...extra });
}

export function trackScanParsed(
  scanId: string,
  method: MealScanMethod,
  info: {
    durationMs: number;
    readFrom?: string | null;
    confidence?: string | null;
    itemCount?: number;
    calories?: number;
    hasBarcode?: boolean;
  },
) {
  trackEvent(MEAL_SCAN_EVENTS.parse, {
    scan_id: scanId,
    method,
    duration_ms: Math.round(info.durationMs),
    read_from: info.readFrom ?? null,
    confidence: info.confidence ?? null,
    item_count: info.itemCount ?? null,
    calories: info.calories ?? null,
    has_barcode: info.hasBarcode ?? false,
  });
}

export function trackScanError(
  scanId: string,
  method: MealScanMethod,
  stage: "capture" | "parse" | "lookup",
  error: unknown,
  extra: Record<string, unknown> = {},
) {
  trackEvent(MEAL_SCAN_EVENTS.parseError, {
    scan_id: scanId,
    method,
    stage,
    message: (error instanceof Error ? error.message : String(error ?? "unknown")).slice(0, 200),
    ...extra,
  });
}

export function trackReviewOpened(
  scanId: string | null,
  info: { source: string; itemCount: number; isEdit: boolean; hasPhoto: boolean },
) {
  trackEvent(MEAL_SCAN_EVENTS.reviewOpened, {
    scan_id: scanId,
    source: info.source,
    item_count: info.itemCount,
    is_edit: info.isEdit,
    has_photo: info.hasPhoto,
  });
}

export function trackScanSaved(
  scanId: string | null,
  info: {
    source: string;
    isEdit: boolean;
    wasAdjusted: boolean;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    photoUploaded: boolean;
    durationMs: number;
  },
) {
  trackEvent(MEAL_SCAN_EVENTS.save, {
    scan_id: scanId,
    source: info.source,
    is_edit: info.isEdit,
    was_adjusted: info.wasAdjusted,
    calories: info.calories,
    protein_g: info.protein_g,
    carbs_g: info.carbs_g,
    fat_g: info.fat_g,
    photo_uploaded: info.photoUploaded,
    duration_ms: Math.round(info.durationMs),
  });
}

export function trackSaveError(
  scanId: string | null,
  info: { source: string; isEdit: boolean; stage: "upload" | "write" },
  error: unknown,
) {
  trackEvent(MEAL_SCAN_EVENTS.saveError, {
    scan_id: scanId,
    source: info.source,
    is_edit: info.isEdit,
    stage: info.stage,
    message: (error instanceof Error ? error.message : String(error ?? "unknown")).slice(0, 200),
  });
}

/* ------------------------------------------------------------------ */
/* Food edit + correction instrumentation                              */
/* ------------------------------------------------------------------ */

/**
 * Events that measure how often people correct what the scanner produced, and
 * whether the accuracy engine (catalog / USDA / user-corrected foods) is
 * getting better over time.
 *
 * itemEdit / totalEdit fire once a field settles (debounced) so a typed number
 * is one event, not one per keystroke. correctionSummary fires on save with
 * the drift between the AI estimate and what the user kept, bucketed by the
 * data source that produced each item — that per-source edit rate is the
 * accuracy signal we track release over release.
 */
export const MEAL_EDIT_EVENTS = {
  itemEdit: "meal_item_edit",
  itemAdd: "meal_item_add",
  itemRemove: "meal_item_remove",
  portionSwap: "meal_portion_swap",
  totalEdit: "meal_total_edit",
  totalReset: "meal_total_reset",
  servingsRecalc: "meal_servings_recalc",
  autoFix: "meal_autofix",
  undo: "meal_edit_undo",
  correctionSummary: "meal_correction_summary",
  correctionsSaved: "meal_corrections_saved",
  correctionsError: "meal_corrections_error",
} as const;

export type MealEditField =
  | "name"
  | "portion"
  | "grams"
  | "calories"
  | "protein_g"
  | "carbs_g"
  | "fat_g";

function pctDelta(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return Math.round(((to - from) / Math.abs(from)) * 1000) / 10;
}

/** Debounce buffer so a typed correction reports the settled value only. */
const pending = new Map<string, { timer: number; from: unknown; props: Record<string, unknown> }>();

function flushLater(key: string, delayMs: number, emit: () => void) {
  const existing = pending.get(key);
  if (existing) window.clearTimeout(existing.timer);
  const timer = window.setTimeout(() => {
    pending.delete(key);
    emit();
  }, delayMs);
  const entry = pending.get(key);
  pending.set(key, { timer, from: entry?.from, props: entry?.props ?? {} });
}

/** Emit any buffered edits right now (called before a save). */
export function flushPendingEditEvents() {
  for (const [key, entry] of Array.from(pending.entries())) {
    window.clearTimeout(entry.timer);
    pending.delete(key);
    if (Object.keys(entry.props).length === 0) continue;
    trackEvent(
      key.startsWith("total:") ? MEAL_EDIT_EVENTS.totalEdit : MEAL_EDIT_EVENTS.itemEdit,
      entry.props,
    );
  }
}

/** Drop any buffered edits (e.g. the sheet closed) without emitting them. */
export function cancelPendingEditEvents() {
  for (const { timer } of pending.values()) window.clearTimeout(timer);
  pending.clear();
}

export function trackItemEdit(
  scanId: string | null,
  info: {
    index: number;
    field: MealEditField;
    from: number | string | null;
    to: number | string | null;
    dataSource?: string | null;
    foodId?: string | null;
    itemName?: string | null;
  },
) {
  if (typeof window === "undefined") return;
  const key = `item:${info.index}:${info.field}`;
  const existing = pending.get(key);
  const from = existing?.from !== undefined ? existing.from : info.from;
  const numeric = typeof from === "number" && typeof info.to === "number";
  const props: Record<string, unknown> = {
    scan_id: scanId,
    item_index: info.index,
    field: info.field,
    data_source: info.dataSource ?? "ai",
    has_food_id: Boolean(info.foodId),
    is_numeric: numeric,
    from: numeric ? from : null,
    to: numeric ? info.to : null,
    delta_pct: numeric ? pctDelta(from as number, info.to as number) : null,
  };
  pending.set(key, { timer: 0, from, props });
  flushLater(key, 900, () => trackEvent(MEAL_EDIT_EVENTS.itemEdit, props));
}

export function trackItemAdded(scanId: string | null, itemCount: number) {
  trackEvent(MEAL_EDIT_EVENTS.itemAdd, { scan_id: scanId, item_count: itemCount });
}

export function trackItemRemoved(
  scanId: string | null,
  info: { index: number; dataSource?: string | null; calories: number; itemCount: number },
) {
  trackEvent(MEAL_EDIT_EVENTS.itemRemove, {
    scan_id: scanId,
    item_index: info.index,
    data_source: info.dataSource ?? "ai",
    calories: info.calories,
    item_count: info.itemCount,
  });
}

export function trackPortionSwap(
  scanId: string | null,
  info: {
    index: number;
    label: string;
    fromGrams: number | null;
    toGrams: number;
    dataSource?: string | null;
    foodId?: string | null;
  },
) {
  trackEvent(MEAL_EDIT_EVENTS.portionSwap, {
    scan_id: scanId,
    item_index: info.index,
    label: info.label.slice(0, 60),
    from_grams: info.fromGrams,
    to_grams: info.toGrams,
    delta_pct: info.fromGrams ? pctDelta(info.fromGrams, info.toGrams) : null,
    data_source: info.dataSource ?? "ai",
    has_food_id: Boolean(info.foodId),
  });
}

export function trackTotalEdit(
  scanId: string | null,
  info: { field: keyof MealTotalsLike; from: number; to: number },
) {
  if (typeof window === "undefined") return;
  const key = `total:${String(info.field)}`;
  const existing = pending.get(key);
  const from = (existing?.from as number | undefined) ?? info.from;
  const props = {
    scan_id: scanId,
    field: info.field,
    from,
    to: info.to,
    delta_pct: pctDelta(from, info.to),
  };
  pending.set(key, { timer: 0, from, props });
  flushLater(key, 900, () => trackEvent(MEAL_EDIT_EVENTS.totalEdit, props));
}

type MealTotalsLike = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export function trackTotalReset(scanId: string | null) {
  trackEvent(MEAL_EDIT_EVENTS.totalReset, { scan_id: scanId });
}

export function trackServingsRecalc(scanId: string | null, from: number, to: number) {
  trackEvent(MEAL_EDIT_EVENTS.servingsRecalc, {
    scan_id: scanId,
    from_servings: from,
    to_servings: to,
  });
}

export function trackAutoFix(scanId: string | null, changeCount: number) {
  trackEvent(MEAL_EDIT_EVENTS.autoFix, { scan_id: scanId, change_count: changeCount });
}

export function trackEditUndo(
  scanId: string | null,
  kind: "autofix" | "recalc",
  extra: Record<string, unknown> = {},
) {
  trackEvent(MEAL_EDIT_EVENTS.undo, { scan_id: scanId, kind, ...extra });
}

type SummaryItem = {
  dataSource?: string | null;
  foodId?: string | null;
  ai: MealTotalsLike;
  user: MealTotalsLike;
  portionChanged: boolean;
};

/**
 * One row per save describing how much the human moved the machine's numbers,
 * split by the source that produced them. Comparing `edited_rate` for
 * `database`/`usda` items against `ai` items over time is how we tell whether
 * the correction feedback loop is making scans more accurate.
 */
export function trackCorrectionSummary(
  scanId: string | null,
  info: {
    source: string;
    isEdit: boolean;
    items: SummaryItem[];
    aiTotals: MealTotalsLike;
    finalTotals: MealTotalsLike;
    totalsOverridden: boolean;
  },
) {
  const bySource: Record<string, { items: number; edited: number; abs_kcal_drift: number }> = {};
  let editedItems = 0;
  let portionChanges = 0;
  for (const item of info.items) {
    const key = item.dataSource ?? "ai";
    const bucket = (bySource[key] ??= { items: 0, edited: 0, abs_kcal_drift: 0 });
    bucket.items += 1;
    const changed =
      item.ai.calories !== item.user.calories ||
      item.ai.protein_g !== item.user.protein_g ||
      item.ai.carbs_g !== item.user.carbs_g ||
      item.ai.fat_g !== item.user.fat_g ||
      item.portionChanged;
    if (changed) {
      bucket.edited += 1;
      editedItems += 1;
    }
    if (item.portionChanged) portionChanges += 1;
    bucket.abs_kcal_drift += Math.abs(item.user.calories - item.ai.calories);
  }
  for (const bucket of Object.values(bySource)) {
    bucket.abs_kcal_drift = Math.round(bucket.abs_kcal_drift);
  }

  trackEvent(MEAL_EDIT_EVENTS.correctionSummary, {
    scan_id: scanId,
    source: info.source,
    is_edit: info.isEdit,
    item_count: info.items.length,
    edited_items: editedItems,
    edited_rate: info.items.length ? Math.round((editedItems / info.items.length) * 100) : 0,
    portion_changes: portionChanges,
    totals_overridden: info.totalsOverridden,
    calorie_drift: Math.round(info.finalTotals.calories - info.aiTotals.calories),
    calorie_drift_pct: pctDelta(info.aiTotals.calories, info.finalTotals.calories),
    protein_drift: Math.round((info.finalTotals.protein_g - info.aiTotals.protein_g) * 10) / 10,
    carbs_drift: Math.round((info.finalTotals.carbs_g - info.aiTotals.carbs_g) * 10) / 10,
    fat_drift: Math.round((info.finalTotals.fat_g - info.aiTotals.fat_g) * 10) / 10,
    by_source: bySource,
  });
}

/** The feedback loop actually landed rows (or failed to). */
export function trackCorrectionsPersisted(
  scanId: string | null,
  info: { recorded: number; promoted?: number },
) {
  trackEvent(MEAL_EDIT_EVENTS.correctionsSaved, {
    scan_id: scanId,
    recorded: info.recorded,
    promoted: info.promoted ?? 0,
  });
}

export function trackCorrectionsError(scanId: string | null, error: unknown) {
  trackEvent(MEAL_EDIT_EVENTS.correctionsError, {
    scan_id: scanId,
    message: (error instanceof Error ? error.message : String(error ?? "unknown")).slice(0, 200),
  });
}
