import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Barcode,
  Calculator,
  Camera,
  ChevronDown,
  Crop,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MealPhotoEditor } from "@/components/meal-photo-editor";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { supabase } from "@/integrations/supabase/client";
import { scanMealInput } from "@/lib/meal-scan.functions";
import { scanBarcodeFromImage } from "@/lib/barcode-scanner";
import { dataUrlToBlob, fileToDownscaledDataUrl } from "@/lib/image-downscale";
import { FoodPortionPicker, rescaleItemToGrams } from "@/components/food-portion-picker";
import { parsePortionGrams } from "@/lib/portion-units";
import { recordScanCorrections } from "@/lib/food-db.functions";
import { MealProvenance } from "@/components/meal-provenance";

import {
  trackReviewOpened,
  trackScanSaved,
  trackSaveError,
  trackItemEdit,
  trackItemAdded,
  trackItemRemoved,
  trackPortionSwap,
  trackTotalEdit,
  trackTotalReset,
  trackServingsRecalc,
  trackAutoFix,
  trackEditUndo,
  trackCorrectionSummary,
  trackCorrectionsPersisted,
  trackCorrectionsError,
  cancelPendingEditEvents,
  flushPendingEditEvents,
  type MealEditField,
} from "@/lib/meal-scan-analytics";
import {
  CONFIDENCE_COPY,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  autoFixItems,
  autoFixTotals,
  buildScaleBreakdown,
  describeAutoFix,
  emptyItem,
  extendedTotalsFor,
  roundMacro,
  roundTotals,
  scaleItems,
  slotForHour,
  totalsFor,
  validateMealItem,
  validateMealTotals,
  FOOD_SOURCE_LABELS,
  type FoodDataSource,
  type MacroValidationIssue,
  type MealConfidence,
  type MealItem,
  type MealSlot,
  type MealSource,
  type MealTotals,
} from "@/lib/meal-nutrition";
import { PortionConfidenceGate } from "@/components/portion-confidence-gate";
import { assessPortionConfidence } from "@/lib/portion-confidence";

export type MealDraft = {
  /** Present when editing an already-saved meal. */
  id?: string;
  label: string;
  items: MealItem[];
  confidence: MealConfidence | null;
  note: string;
  source: MealSource;
  barcode?: string | null;
  readFrom?: import("@/lib/meal-nutrition").MealReadSource | null;
  /** Downscaled photo data URL — uploaded to private storage on save. */
  photoDataUrl?: string | null;
  /** Existing storage path when editing a meal with a saved photo. */
  storagePath?: string | null;
  /** Existing values when editing. */
  slot?: MealSlot;
  time?: string;
  /** Original estimate kept so edits stay comparable to the first scan. */
  estimateItems?: MealItem[];
  /** What the vision model sized the portions against, when it said. */
  scaleBasis?: string | null;
};

/** Shared empty bucket so rows without issues never allocate a new array. */
const EMPTY_ISSUES: MacroValidationIssue[] = [];
const PORTION_PRESETS = [0.5, 1, 1.5, 2];
const CONFIDENCE_OPTIONS: MealConfidence[] = ["high", "medium", "low"];

/** Which passes a rescan should re-run. */
type RescanMode = "photo" | "barcode" | "both";
const RESCAN_LABELS: Record<RescanMode, string> = {
  photo: "Photo text",
  barcode: "Barcode",
  both: "Barcode + photo",
};

function macroInput(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

/**
 * Turn a rescan failure into plain language: people need to know whether to
 * retake the photo, check their connection, or simply try again.
 */
function describeRescanError(err: unknown, mode: RescanMode): { title: string; detail: string } {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const text = raw.toLowerCase();
  const title = `${RESCAN_LABELS[mode]} scan failed`;

  if (text.includes("add a photo")) {
    return {
      title,
      detail: "There is no photo to read yet. Take or pick a photo, then scan again.",
    };
  }
  if (text.includes("no barcode")) {
    return {
      title,
      detail:
        "No barcode was found on this meal. Retake the photo with the barcode flat and in focus, or use the photo scan instead.",
    };
  }
  if (text.includes("failed to fetch") || text.includes("network") || text.includes("offline")) {
    return { title, detail: "We could not reach the scanner — check your connection and retry." };
  }
  if (text.includes("429") || text.includes("rate limit") || text.includes("too many")) {
    return { title, detail: "The scanner is busy right now. Wait a few seconds, then retry." };
  }
  if (text.includes("timeout") || text.includes("timed out")) {
    return {
      title,
      detail: "The scan took too long to answer. Retry — it usually works second time.",
    };
  }
  if (text.includes("401") || text.includes("unauthorized") || text.includes("sign in")) {
    return { title, detail: "Your session expired. Sign in again, then re-run the scan." };
  }
  if (text.includes("payment") || text.includes("402") || text.includes("credit")) {
    return {
      title,
      detail: "The AI scanner is temporarily unavailable. Enter the numbers by hand for now.",
    };
  }
  if (text.includes("too large") || text.includes("413")) {
    return {
      title,
      detail: "That photo was too large. Retake it a bit further back and scan again.",
    };
  }
  return {
    title,
    detail: raw
      ? `${raw} Retry, or retake the photo with brighter, straight-on lighting.`
      : "Something went wrong reading that photo. Retry, or retake it with brighter, straight-on lighting.",
  };
}

export function MealReviewSheet({
  open,
  onOpenChange,
  draft,
  dayKey,
  onSaved,
  scanId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: MealDraft | null;
  /** yyyy-MM-dd the meal belongs to. Defaults to today. */
  dayKey?: string;
  onSaved?: () => void;
  /** Scanner attempt id so review/save events join the capture + parse events. */
  scanId?: string | null;
}) {
  const [label, setLabel] = useState("");
  const [items, setItems] = useState<MealItem[]>([]);
  const [baseItems, setBaseItems] = useState<MealItem[]>([]);
  const [estimateItems, setEstimateItems] = useState<MealItem[]>([]);
  const [portion, setPortion] = useState(1);
  /** Review-only view filter: show every item, or only one nutrition source. */
  const [sourceFilter, setSourceFilter] = useState<FoodDataSource | "all">("all");
  const sourceCounts = useMemo(() => {
    const counts = new Map<FoodDataSource, number>();
    for (const item of items) {
      const key = (item.dataSource ?? "ai") as FoodDataSource;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const visibleCount =
    sourceFilter === "all"
      ? items.length
      : (sourceCounts.find(([key]) => key === sourceFilter)?.[1] ?? 0);
  // Never strand the user on an empty list when edits remove the last item of a source.
  useEffect(() => {
    if (sourceFilter !== "all" && visibleCount === 0) setSourceFilter("all");
  }, [sourceFilter, visibleCount]);
  const [slot, setSlot] = useState<MealSlot>("other");
  const [time, setTime] = useState("12:00");
  const [saving, setSaving] = useState(false);
  const [rescanning, setRescanning] = useState<RescanMode | null>(null);
  const [rescanError, setRescanError] = useState<{
    mode: RescanMode;
    file?: File;
    title: string;
    detail: string;
  } | null>(null);
  const [confidence, setConfidence] = useState<MealConfidence | null>(null);
  const [note, setNote] = useState("");
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [removedStoragePath, setRemovedStoragePath] = useState<string | null>(null);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);

  const [readFrom, setReadFrom] = useState<import("@/lib/meal-nutrition").MealReadSource | null>(
    null,
  );
  const [source, setSource] = useState<MealSource>("manual");
  /** What the vision model scaled portions against — drives the accuracy gate. */
  const [scaleBasis, setScaleBasis] = useState<string | null>(null);
  /** Set once the user acknowledges a shaky photo estimate and edits it anyway. */
  const [gateDismissed, setGateDismissed] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  /** Hand-corrected meal totals that win over the summed item macros. */
  const [override, setOverride] = useState<MealTotals | null>(null);
  /** Raw strings shown in the meal-total inputs so invalid values are visible. */
  const [overrideRaw, setOverrideRaw] = useState<Record<keyof MealTotals, string>>({
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
  });
  /** Servings the user says they ate of the panel above. */
  const [servings, setServings] = useState("1");
  /** Servings already baked into the current numbers. */
  const [appliedServings, setAppliedServings] = useState(1);
  /** Per-serving panel values the recalculation multiplies from. */
  const [perServingBase, setPerServingBase] = useState<MealTotals | null>(null);
  /** True while a debounced servings recalculation is repainting the item list. */
  const [recalcPending, startRecalc] = useTransition();
  /** Whether the "How this was calculated" breakdown is expanded. */
  const [showBreakdown, setShowBreakdown] = useState(false);

  /** One-serving snapshot every servings recalculation scales from. */
  const servingsBase = useRef<{ items: MealItem[]; totals: MealTotals } | null>(null);
  /** Per-item snapshot the free-typed portion field rescales from. */
  const portionBase = useRef<Map<number, MealItem>>(new Map());
  /** Snapshot of what the last auto-fix replaced, for one-step undo. */
  const [lastAutoFix, setLastAutoFix] = useState<{
    items: MealItem[];
    override: MealTotals | null;
    overrideRaw: Record<keyof MealTotals, string>;
    count: number;
  } | null>(null);
  /** Snapshot of everything the last servings recalculation replaced, for one-step undo. */
  const [lastRecalc, setLastRecalc] = useState<{
    items: MealItem[];
    override: MealTotals | null;
    overrideRaw: Record<keyof MealTotals, string>;
    servings: string;
    appliedServings: number;
    perServingBase: MealTotals | null;
    servingsBase: { items: MealItem[]; totals: MealTotals } | null;
    scaledTo: number;
  } | null>(null);
  /** Tracks whether the user has confirmed saving despite warnings. */
  const [warningConfirmed, setWarningConfirmed] = useState(false);
  const rescanRef = useRef<HTMLInputElement>(null);

  const pendingMode = useRef<RescanMode>("both");
  const navigate = useNavigate();
  const analyze = useServerFn(scanMealInput);
  const sendCorrections = useServerFn(recordScanCorrections);

  const isEditing = Boolean(draft?.id);

  useEffect(() => {
    if (!open || !draft) return;
    const now = new Date();
    setLabel(draft.label);
    setItems(draft.items.map((item) => ({ ...item })));
    setBaseItems(draft.items.map((item) => ({ ...item })));
    setEstimateItems((draft.estimateItems ?? draft.items).map((item) => ({ ...item })));
    setOverride(null);
    setOverrideRaw({
      calories: macroInput(roundTotals(totalsFor(draft.items)).calories),
      protein_g: macroInput(roundTotals(totalsFor(draft.items)).protein_g),
      carbs_g: macroInput(roundTotals(totalsFor(draft.items)).carbs_g),
      fat_g: macroInput(roundTotals(totalsFor(draft.items)).fat_g),
    });
    setWarningConfirmed(false);
    setPortion(1);
    setServings("1");
    setAppliedServings(1);
    setPerServingBase(null);
    servingsBase.current = null;
    setLastRecalc(null);
    setLastAutoFix(null);

    setConfidence(draft.confidence);
    setNote(draft.note ?? "");
    setNewPhoto(draft.photoDataUrl ?? null);
    setRemovedStoragePath(null);
    setReadFrom(draft.readFrom ?? null);
    setScaleBasis(draft.scaleBasis ?? null);
    setGateDismissed(false);
    setSource(draft.source);
    setBarcode(draft.barcode ?? null);
    setSlot(draft.slot ?? slotForHour(now.getHours()));
    setTime(
      draft.time ??
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    );
    trackReviewOpened(scanId, {
      source: draft.source,
      itemCount: draft.items.length,
      isEdit: Boolean(draft.id),
      hasPhoto: Boolean(draft.photoDataUrl || draft.storagePath),
    });
  }, [open, draft, scanId]);

  // Buffered (debounced) edit events must not leak across sheet sessions.
  useEffect(() => {
    if (!open) cancelPendingEditEvents();
    return () => cancelPendingEditEvents();
  }, [open]);

  const itemTotals = useMemo(() => roundTotals(totalsFor(items)), [items]);
  /** Fiber / sugars / sodium / sat fat, when the matched foods publish them. */
  const extended = useMemo(() => extendedTotalsFor(items), [items]);
  const totals = override ?? itemTotals;
  const validationSource = override ?? itemTotals;
  const totalIssues = useMemo(() => validateMealTotals(validationSource), [validationSource]);
  const itemIssues = useMemo(
    () => items.flatMap((item, index) => validateMealItem(item, index)),
    [items],
  );
  /**
   * Bucket the issues by item once instead of re-scanning the whole list inside
   * every row's render — with a long item list that filter dominated the
   * re-render caused by each servings keystroke.
   */
  const issuesByItem = useMemo(() => {
    const map = new Map<number, MacroValidationIssue[]>();
    for (let index = 0; index < items.length; index += 1) map.set(index, []);
    for (const issue of itemIssues) {
      const match = /^Item (\d+):/.exec(issue.message);
      if (!match) continue;
      const index = Number(match[1]) - 1;
      const bucket = map.get(index);
      if (bucket) bucket.push(issue);
    }
    return map;
  }, [itemIssues, items.length]);

  const allIssues: MacroValidationIssue[] = useMemo(
    () => [...totalIssues, ...itemIssues],
    [totalIssues, itemIssues],
  );
  const hardErrors = useMemo(
    () => allIssues.filter((issue) => issue.kind === "error"),
    [allIssues],
  );
  const warnings = useMemo(
    () => allIssues.filter((issue) => issue.kind === "warning"),
    [allIssues],
  );
  const aiTotals = useMemo(() => roundTotals(totalsFor(estimateItems)), [estimateItems]);
  const wasAdjusted = useMemo(
    () =>
      totals.calories !== aiTotals.calories ||
      totals.protein_g !== aiTotals.protein_g ||
      totals.carbs_g !== aiTotals.carbs_g ||
      totals.fat_g !== aiTotals.fat_g,
    [totals, aiTotals],
  );
  /**
   * How defensible the photo portions are. Scored from the estimate as it
   * arrived (not the user's edits), so correcting an item doesn't hide the
   * warning that prompted the correction.
   */
  const portionAssessment = useMemo(
    () =>
      assessPortionConfidence({
        items: estimateItems.length > 0 ? estimateItems : items,
        confidence: confidence ?? "medium",
        note,
        readFrom,
        scaleBasis,
      }),
    [estimateItems, items, confidence, note, readFrom, scaleBasis],
  );
  /** Display-only explanation of how per-serving values became the shown numbers. */
  const scaleBreakdown = useMemo(() => {
    if (!perServingBase) return null;
    const divisor = appliedServings > 0 ? appliedServings : 1;
    return buildScaleBreakdown({
      perServing: perServingBase,
      servings: divisor,
      shownTotals: totals,
      baseItems: scaleItems(items, 1 / divisor),
      items,
    });
  }, [perServingBase, appliedServings, totals, items]);

  function applyPortion(next: number) {
    setPortion(next);
    setItems(scaleItems(baseItems, next));
    // Portion changes recompute from items, so a stale hand-typed total must go.
    setOverride(null);
    setPerServingBase(null);
    servingsBase.current = null;
    setAppliedServings(1);
    setServings("1");
    setLastRecalc(null);
  }

  function updateItem(index: number, patch: Partial<MealItem>) {
    setWarningConfirmed(false);
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    // A hand-edited item list becomes the new one-serving basis.
    servingsBase.current = null;
    setLastRecalc(null);
  }

  /**
   * Item edit + instrumentation in one call so every hand correction is
   * measured (debounced, so a typed number reports once it settles).
   */
  function editItemField(index: number, field: MealEditField, value: string | number) {
    const before = items[index];
    updateItem(index, { [field]: value } as Partial<MealItem>);
    trackItemEdit(scanId, {
      index,
      field,
      from: (before?.[field] as string | number | undefined) ?? null,
      to: value,
      dataSource: before?.dataSource ?? null,
      foodId: before?.foodId ?? null,
      itemName: before?.name ?? null,
    });
  }

  /**
   * Free-typed portion ("200 g", "2 tbsp", "1 cup (158 g)"). The typed text is
   * always kept; when it carries a measurable amount we rescale grams and the
   * macros from the portion's original basis, so typing digit by digit never
   * compounds rounding.
   */
  function editPortionField(index: number, value: string) {
    const before = items[index];
    if (!before) return;
    if (!portionBase.current.has(index)) portionBase.current.set(index, before);
    const base = portionBase.current.get(index) ?? before;

    const grams = parsePortionGrams(value);
    const patch: Partial<MealItem> =
      grams && grams > 0
        ? { ...rescaleItemToGrams(base, grams), grams: roundMacro(grams), portion: value }
        : { portion: value };

    updateItem(index, patch);
    trackItemEdit(scanId, {
      index,
      field: "portion",
      from: before.portion ?? null,
      to: value,
      dataSource: before.dataSource ?? null,
      foodId: before.foodId ?? null,
      itemName: before.name ?? null,
    });
  }

  /**
   * Hand-correct a Nutrition Facts field the scan misread. The typed number is
   * preserved (even if negative or invalid) so validation can warn the user;
   * the per-serving basis is derived from the parsed value and the totals stay
   * in step with the servings eaten automatically.
   */
  function updateTotal(key: keyof MealTotals, raw: string) {
    setWarningConfirmed(false);
    setLastRecalc(null);
    setOverrideRaw((prev) => ({ ...prev, [key]: raw }));
    const parsed = Number(raw);
    const numeric = Number.isFinite(parsed) ? parsed : 0;
    const nextTotals = { ...(override ?? itemTotals), [key]: numeric };
    const divisor = appliedServings > 0 ? appliedServings : 1;
    const perServing = roundTotals({
      calories: nextTotals.calories / divisor,
      protein_g: nextTotals.protein_g / divisor,
      carbs_g: nextTotals.carbs_g / divisor,
      fat_g: nextTotals.fat_g / divisor,
    });
    setOverride(nextTotals);
    setPerServingBase(perServing);
    servingsBase.current = {
      items: scaleItems(items, 1 / divisor),
      totals: perServing,
    };
    trackTotalEdit(scanId, { field: key, from: (override ?? itemTotals)[key], to: numeric });
  }

  /** Clear a hand-typed total and any servings math built on top of it. */
  function resetToItems() {
    setOverride(null);
    setOverrideRaw({
      calories: macroInput(itemTotals.calories),
      protein_g: macroInput(itemTotals.protein_g),
      carbs_g: macroInput(itemTotals.carbs_g),
      fat_g: macroInput(itemTotals.fat_g),
    });
    setWarningConfirmed(false);
    setPerServingBase(null);
    servingsBase.current = null;
    setAppliedServings(1);
    setServings("1");
    setLastRecalc(null);
    trackTotalReset(scanId);
  }

  /** Put back exactly what the most recent servings recalculation replaced. */
  function undoRecalc() {
    if (!lastRecalc) return;
    setItems(lastRecalc.items.map((item) => ({ ...item })));
    setOverride(lastRecalc.override);
    setOverrideRaw({ ...lastRecalc.overrideRaw });
    setPerServingBase(lastRecalc.perServingBase);
    servingsBase.current = lastRecalc.servingsBase;
    // Restore both together so the debounced effect sees no pending change.
    setAppliedServings(lastRecalc.appliedServings);
    setServings(lastRecalc.servings);
    setWarningConfirmed(false);
    setLastRecalc(null);
    trackEditUndo(scanId, "recalc", { scaled_to: lastRecalc.scaledTo });
    toast.success("Recalculation undone", {
      description: "Your previous totals and items are back.",
    });
  }

  /**
   * Clamp negative, non-numeric, or impossibly large Nutrition Facts values on
   * both the meal totals and every item so the entry can be saved. Sensible
   * numbers are left exactly as typed, and the whole pass is undoable.
   */
  function autoFixValues() {
    const fixedItems = autoFixItems(items);
    const fixedTotals = autoFixTotals(override ?? itemTotals);
    const changes = [...fixedTotals.changes, ...fixedItems.changes];
    if (changes.length === 0) {
      toast.success("Nothing to fix", {
        description: "Every value is already within a sensible range.",
      });
      return;
    }
    setLastAutoFix({
      items: items.map((item) => ({ ...item })),
      override,
      overrideRaw: { ...overrideRaw },
      count: changes.length,
    });
    setItems(fixedItems.value);
    const nextTotals = override ? fixedTotals.value : roundTotals(totalsFor(fixedItems.value));
    if (override) setOverride(fixedTotals.value);
    setOverrideRaw({
      calories: macroInput(nextTotals.calories),
      protein_g: macroInput(nextTotals.protein_g),
      carbs_g: macroInput(nextTotals.carbs_g),
      fat_g: macroInput(nextTotals.fat_g),
    });
    setWarningConfirmed(false);
    setLastRecalc(null);
    servingsBase.current = null;
    trackAutoFix(scanId, changes.length);
    toast.success(`Fixed ${changes.length} value${changes.length === 1 ? "" : "s"}`, {
      description: describeAutoFix(changes),
    });
  }

  /** Put back exactly what the auto-fix replaced. */
  function undoAutoFix() {
    if (!lastAutoFix) return;
    setItems(lastAutoFix.items.map((item) => ({ ...item })));
    setOverride(lastAutoFix.override);
    setOverrideRaw({ ...lastAutoFix.overrideRaw });
    setWarningConfirmed(false);
    setLastAutoFix(null);
    servingsBase.current = null;
    trackEditUndo(scanId, "autofix", { change_count: lastAutoFix.count });
    toast.success("Auto-fix undone", { description: "Your original numbers are back." });
  }

  /**
   * Always scale from the newest values even when a keystroke lands while a
   * debounced recalculation is still pending — the effect deliberately does not
   * re-run on every item edit, so it reads these instead of stale closures.
   */
  const liveRef = useRef({ items, override, overrideRaw, perServingBase, totals });
  liveRef.current = { items, override, overrideRaw, perServingBase, totals };

  /**
   * Recalculate automatically whenever the servings eaten changes: scale the
   * one-serving snapshot rather than the current numbers so repeated edits
   * never compound rounding. Debounced so partial input ("1.") is ignored, and
   * the scaling itself runs as a non-urgent transition so React can keep
   * painting the servings field while a long item list re-renders behind it.
   */
  useEffect(() => {
    const parsed = Number(servings);
    if (servings.trim() === "" || !Number.isFinite(parsed) || parsed <= 0) return;
    if (parsed === appliedServings) return;
    const timer = window.setTimeout(() => {
      const live = liveRef.current;
      const divisor = appliedServings > 0 ? appliedServings : 1;
      const base = servingsBase.current ?? {
        items: scaleItems(live.items, 1 / divisor),
        totals: roundTotals({
          calories: live.totals.calories / divisor,
          protein_g: live.totals.protein_g / divisor,
          carbs_g: live.totals.carbs_g / divisor,
          fat_g: live.totals.fat_g / divisor,
        }),
      };
      // Snapshot what this recalculation is about to replace, for one-step undo.
      const undoSnapshot = {
        items: live.items.map((item) => ({ ...item })),
        override: live.override,
        overrideRaw: { ...live.overrideRaw },
        servings: String(appliedServings),
        appliedServings,
        perServingBase: live.perServingBase,
        servingsBase: servingsBase.current,
        scaledTo: parsed,
      };
      servingsBase.current = base;
      const scaledTotals = roundTotals({
        calories: base.totals.calories * parsed,
        protein_g: base.totals.protein_g * parsed,
        carbs_g: base.totals.carbs_g * parsed,
        fat_g: base.totals.fat_g * parsed,
      });
      startRecalc(() => {
        setLastRecalc(undoSnapshot);
        setItems(scaleItems(base.items, parsed));
        setOverride(scaledTotals);
        setOverrideRaw({
          calories: macroInput(scaledTotals.calories),
          protein_g: macroInput(scaledTotals.protein_g),
          carbs_g: macroInput(scaledTotals.carbs_g),
          fat_g: macroInput(scaledTotals.fat_g),
        });
        setWarningConfirmed(false);
        setPerServingBase(base.totals);
        setAppliedServings(parsed);
      });
      trackServingsRecalc(scanId, appliedServings, parsed);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servings, appliedServings]);

  /**
   * Re-read the numbers without touching the saved items: a rescan updates the
   * meal totals, provenance and confidence only, so a hand-built item list
   * survives an OCR-only, barcode-only, or combined re-read.
   */
  async function runRescan(mode: RescanMode, file?: File) {
    setRescanning(mode);
    setRescanError(null);
    try {
      let imageDataUrl: string | null = newPhoto;
      let detected: string | null = barcode;
      if (file) {
        detected = (await scanBarcodeFromImage(file).catch(() => null)) ?? barcode;
        imageDataUrl = await fileToDownscaledDataUrl(file);
      }
      if (mode !== "barcode" && !imageDataUrl) throw new Error("Add a photo to read from.");
      if (mode === "barcode" && !detected) throw new Error("No barcode on this meal yet.");

      const estimate = await analyze({
        data: {
          imageDataUrl: mode === "barcode" ? null : imageDataUrl,
          barcode: mode === "photo" ? null : detected,
          mode,
        },
      });

      const scannedTotals = roundTotals(totalsFor(estimate.items));
      setOverride(scannedTotals);
      setOverrideRaw({
        calories: macroInput(scannedTotals.calories),
        protein_g: macroInput(scannedTotals.protein_g),
        carbs_g: macroInput(scannedTotals.carbs_g),
        fat_g: macroInput(scannedTotals.fat_g),
      });
      setWarningConfirmed(false);
      setLastRecalc(null);

      setConfidence(estimate.confidence);
      setNote(estimate.note);
      setReadFrom(estimate.readFrom ?? "visual");
      setScaleBasis(estimate.scaleBasis ?? null);
      setGateDismissed(false);
      setSource(estimate.readFrom === "barcode" ? "barcode" : "photo");
      setBarcode(estimate.barcode ?? detected ?? null);
      if (file && imageDataUrl) setNewPhoto(imageDataUrl);
      toast.success(`${RESCAN_LABELS[mode]} re-read — your items were left as they are.`, {
        description: "Totals updated. Use “Reset to items” to undo.",
      });
    } catch (err) {
      const described = describeRescanError(err, mode);
      setRescanError({ mode, file, ...described });
      toast.error(described.title, {
        description: described.detail,
        duration: 10000,
        action: {
          label: "Retry",
          onClick: () => {
            void runRescan(mode, file);
          },
        },
      });
    } finally {
      setRescanning(null);
    }
  }

  /** Photo modes need a picture: reuse the current one, else ask for a new one. */
  function startRescan(mode: RescanMode) {
    if (mode !== "barcode" && !newPhoto) {
      pendingMode.current = mode;
      rescanRef.current?.click();
      return;
    }
    void runRescan(mode);
  }

  /** Drop the current photo. If the meal already had one saved, mark it for deletion on save. */
  function removePhoto() {
    if (draft?.storagePath && !removedStoragePath) {
      setRemovedStoragePath(draft.storagePath);
    }
    setNewPhoto(null);
    setPhotoEditorOpen(false);
    setRescanError(null);
    toast.info("Photo removed", {
      description: "The image will be deleted when you save. The macros stay as they are.",
    });
  }

  async function save(force = false) {
    if (!draft) return;
    const saveStartedAt = performance.now();
    if (hardErrors.length > 0) {
      toast.error("Please fix the errors before saving", {
        description: hardErrors[0].message,
      });
      return;
    }
    if (warnings.length > 0 && !force) {
      toast.warning("These numbers look unusual", {
        description: warnings[0].message,
        duration: 8000,
        action: {
          label: "Save anyway",
          onClick: () => {
            setWarningConfirmed(true);
            void save(true);
          },
        },
      });
      return;
    }
    setSaving(true);
    // Make sure the last typed correction is reported, not swallowed by close.
    flushPendingEditEvents();
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("You need to be signed in.");

      let storagePath: string | null = null;
      if (newPhoto) {
        const path = `${uid}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("meal-photos")
          .upload(path, dataUrlToBlob(newPhoto), {
            contentType: "image/jpeg",
            upsert: false,
          });
        // A failed upload must not lose the macros the user just reviewed.
        if (uploadError) {
          trackSaveError(
            scanId,
            { source, isEdit: Boolean(draft.id), stage: "upload" },
            uploadError,
          );
        } else {
          storagePath = path;
        }
      }
      if (removedStoragePath) {
        await supabase.storage.from("meal-photos").remove([removedStoragePath]);
      }

      const [hh, mm] = time.split(":");
      const day = dayKey ?? new Date().toISOString().slice(0, 10);
      const loggedAt = new Date(`${day}T${hh ?? "12"}:${mm ?? "00"}:00`);

      const payload = {
        label: label.trim().slice(0, 80) || "Meal",
        meal_slot: slot,
        source,
        barcode,
        ai_confidence: confidence,
        ai_items: items as unknown as never,
        est_calories: aiTotals.calories,
        est_protein_g: aiTotals.protein_g,
        est_carbs_g: aiTotals.carbs_g,
        est_fat_g: aiTotals.fat_g,
        adj_calories: totals.calories,
        adj_protein_g: totals.protein_g,
        adj_carbs_g: totals.carbs_g,
        adj_fat_g: totals.fat_g,
        was_adjusted: wasAdjusted,
        logged_at: loggedAt.toISOString(),
      };

      const { error } = draft.id
        ? await supabase
            .from("meals")
            .update(
              removedStoragePath
                ? { ...payload, storage_path: null }
                : storagePath
                  ? { ...payload, storage_path: storagePath }
                  : payload,
            )
            .eq("id", draft.id)
        : await supabase
            .from("meals")
            .insert({ ...payload, user_id: uid, storage_path: storagePath });
      if (error) {
        trackSaveError(scanId, { source, isEdit: Boolean(draft.id), stage: "write" }, error);
        throw error;
      }

      trackScanSaved(scanId, {
        source,
        isEdit: Boolean(draft.id),
        wasAdjusted,
        calories: totals.calories,
        protein_g: totals.protein_g,
        carbs_g: totals.carbs_g,
        fat_g: totals.fat_g,
        photoUploaded: Boolean(storagePath),
        durationMs: performance.now() - saveStartedAt,
      });

      // How much the human moved the machine's numbers, bucketed by the source
      // that produced each item — the accuracy signal for the feedback loop.
      trackCorrectionSummary(scanId, {
        source,
        isEdit: Boolean(draft.id),
        totalsOverridden: Boolean(override),
        aiTotals,
        finalTotals: totals,
        items: items.map((item, index) => {
          const ai = estimateItems[index];
          return {
            dataSource: item.dataSource ?? null,
            foodId: item.foodId ?? null,
            portionChanged:
              Boolean(ai) &&
              (ai.portion !== item.portion || (ai.grams ?? null) !== (item.grams ?? null)),
            ai: {
              calories: ai?.calories ?? item.calories,
              protein_g: ai?.protein_g ?? item.protein_g,
              carbs_g: ai?.carbs_g ?? item.carbs_g,
              fat_g: ai?.fat_g ?? item.fat_g,
            },
            user: {
              calories: item.calories,
              protein_g: item.protein_g,
              carbs_g: item.carbs_g,
              fat_g: item.fat_g,
            },
          };
        }),
      });

      // Feedback loop: teach the food database from what the user corrected.
      void sendCorrections({
        data: {
          mealId: draft.id ?? null,
          scanId,
          readFrom: source,
          items: items.map((item, index) => {
            const ai = estimateItems[index];
            return {
              name: item.name,
              portion: item.portion,
              grams: item.grams ?? null,
              foodId: item.foodId ?? null,
              dataSource: item.dataSource ?? null,
              aiPortion: ai?.portion ?? null,
              aiGrams: ai?.grams ?? null,
              ai: {
                calories: ai?.calories ?? item.calories,
                protein_g: ai?.protein_g ?? item.protein_g,
                carbs_g: ai?.carbs_g ?? item.carbs_g,
                fat_g: ai?.fat_g ?? item.fat_g,
              },
              user: {
                calories: item.calories,
                protein_g: item.protein_g,
                carbs_g: item.carbs_g,
                fat_g: item.fat_g,
              },
            };
          }),
        },
      })
        .then((res) =>
          trackCorrectionsPersisted(scanId, {
            recorded: res?.recorded ?? 0,
            promoted: res?.promoted ?? 0,
          }),
        )
        .catch((err) => trackCorrectionsError(scanId, err));

      const savedLabel = label.trim().slice(0, 80) || "Meal";
      toast.success(draft.id ? "Meal updated" : "Meal saved", {
        description: `${savedLabel}: ${totals.calories} kcal · ${totals.protein_g}g protein · ${totals.carbs_g}g carbs · ${totals.fat_g}g fat`,
        duration: 6000,
        action: {
          label: "Review",
          onClick: () => {
            void navigate({ to: "/food", search: { day } });
          },
        },
      });
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      trackSaveError(scanId, { source, isEdit: Boolean(draft.id), stage: "write" }, err);
      toast.error("Could not save that meal", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92svh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-4"
      >
        <SheetHeader className="text-left">
          <SheetTitle>{isEditing ? "Edit meal" : "Check this, then save"}</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground">
          {isEditing
            ? "Change anything below and press Save changes."
            : "Step 2 of 3 — this is what we read from your photo. Fix anything that looks off, then press Save meal at the bottom. Nothing is logged until you do."}
        </p>

        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border p-3">
          {newPhoto ? (
            <div className="relative shrink-0">
              <img
                src={newPhoto}
                alt="The meal photo you just took"
                title="The meal photo you just took"
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl object-cover"
              />
              <button
                type="button"
                aria-label="Retake photo"
                disabled={Boolean(rescanning) || saving}
                onClick={() => {
                  pendingMode.current = "both";
                  rescanRef.current?.click();
                }}
                className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm tap-target hover:bg-muted disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={Boolean(rescanning) || saving}
              onClick={() => {
                pendingMode.current = "both";
                rescanRef.current?.click();
              }}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/50 text-muted-foreground tap-target hover:bg-muted disabled:opacity-50"
            >
              <Camera className="h-5 w-5" />
              <span className="text-[10px] font-medium">Add photo</span>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{label || "Your meal"}</p>
            <div className="mt-1 grid grid-cols-4 gap-1 text-center">
              {[
                ["kcal", totals.calories],
                ["Protein", `${totals.protein_g}g`],
                ["Carbs", `${totals.carbs_g}g`],
                ["Fat", `${totals.fat_g}g`],
              ].map(([name, value]) => (
                <div key={String(name)}>
                  <div className="text-sm font-semibold tabular-nums">{value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {name}
                  </div>
                </div>
              ))}
            </div>
            {extended.fiber_g != null ||
            extended.sugar_g != null ||
            extended.sodium_mg != null ||
            extended.satfat_g != null ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {extended.fiber_g != null ? `${extended.fiber_g}g fiber` : null}
                {extended.sugar_g != null
                  ? `${extended.fiber_g != null ? " · " : ""}${extended.sugar_g}g sugars`
                  : null}
                {extended.satfat_g != null ? ` · ${extended.satfat_g}g sat fat` : null}
                {extended.sodium_mg != null ? ` · ${extended.sodium_mg}mg sodium` : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(rescanning) || saving}
            onClick={() => {
              pendingMode.current = "both";
              rescanRef.current?.click();
            }}
          >
            {rescanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            Retake photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!newPhoto || Boolean(rescanning) || saving}
            onClick={() => setPhotoEditorOpen(true)}
          >
            <Crop className="mr-2 h-4 w-4" />
            Crop &amp; rotate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!newPhoto || Boolean(rescanning) || saving}
            onClick={removePhoto}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove photo
          </Button>
          {rescanning ? <span className="text-xs text-muted-foreground">Scanning…</span> : null}
        </div>

        <MealPhotoEditor
          open={photoEditorOpen}
          onOpenChange={setPhotoEditorOpen}
          src={newPhoto}
          onApply={(dataUrl) => {
            setNewPhoto(dataUrl);
            toast.success("Photo updated", {
              description: "Rescan the photo if you want the numbers re-read from the new crop.",
            });
          }}
        />

        {rescanError && !rescanning ? (
          <div
            role="alert"
            className="mt-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive">{rescanError.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{rescanError.detail}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      void runRescan(rescanError.mode, rescanError.file);
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry scan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => {
                      pendingMode.current =
                        rescanError.mode === "barcode" ? "both" : rescanError.mode;
                      setRescanError(null);
                      rescanRef.current?.click();
                    }}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take a new photo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setRescanError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          <input
            ref={rescanRef}
            type="file"
            aria-label="Take or choose a photo to rescan this meal"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void runRescan(pendingMode.current, file);
            }}
          />
          <details className="rounded-xl border border-border p-3">
            <summary className="tap-target cursor-pointer list-none text-sm font-medium text-muted-foreground">
              Numbers look wrong? Scan again
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Re-read the numbers — your items stay exactly as they are.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["photo", "barcode", "both"] as RescanMode[]).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(rescanning) || saving || (mode === "barcode" && !barcode)}
                  onClick={() => startRescan(mode)}
                >
                  {rescanning === mode ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : mode === "barcode" ? (
                    <Barcode className="mr-2 h-4 w-4" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {RESCAN_LABELS[mode]}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1"
              disabled={Boolean(rescanning) || saving}
              onClick={() => {
                pendingMode.current = "both";
                rescanRef.current?.click();
              }}
            >
              <Camera className="mr-2 h-4 w-4" />
              Take a new photo
            </Button>
          </details>
        </div>

        {portionAssessment.verdict !== "trusted" && !gateDismissed && (
          <PortionConfidenceGate
            assessment={portionAssessment}
            busy={Boolean(rescanning) || saving}
            onRetake={() => {
              pendingMode.current = "both";
              rescanRef.current?.click();
            }}
            onSearchInstead={() => {
              setGateDismissed(true);
              toast.info("Search the food by name below", {
                description: "Swap any item for a database match to get exact numbers.",
              });
            }}
          />
        )}

        <MealProvenance
          source={source}
          readFrom={readFrom}
          confidence={confidence}
          barcode={barcode}
          items={items}
          note={note.trim() || (confidence ? CONFIDENCE_COPY[confidence] : "")}
          edited={wasAdjusted}
        />

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="meal-label">Meal name</Label>
            <Input
              id="meal-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Chicken bowl"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="meal-slot">When</Label>
              <select
                id="meal-slot"
                value={slot}
                onChange={(e) => setSlot(e.target.value as MealSlot)}
                className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {MEAL_SLOTS.map((key) => (
                  <option key={key} value={key}>
                    {MEAL_SLOT_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="meal-time">Time</Label>
              <Input
                id="meal-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">Portion</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {PORTION_PRESETS.map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => applyPortion(factor)}
                  className={`tap-target rounded-full border px-4 text-sm font-medium transition ${
                    portion === factor
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {factor}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Items</h3>
              <p className="text-xs text-muted-foreground">Tap any number to correct it.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setItems((prev) => [...prev, emptyItem()]);
                trackItemAdded(scanId, items.length + 1);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add item
            </Button>
          </div>

          {sourceCounts.length > 1 && (
            <div
              role="group"
              aria-label="Filter items by nutrition source"
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                aria-pressed={sourceFilter === "all"}
                onClick={() => setSourceFilter("all")}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  sourceFilter === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                }`}
              >
                All ({items.length})
              </button>
              {sourceCounts.map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={sourceFilter === key}
                  onClick={() => setSourceFilter((prev) => (prev === key ? "all" : key))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    sourceFilter === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {FOOD_SOURCE_LABELS[key]} ({count})
                </button>
              ))}
            </div>
          )}

          {sourceFilter !== "all" && (
            <p
              className="text-xs text-muted-foreground"
              role="status"
              aria-label="Source filter status"
            >
              Showing {visibleCount} of {items.length} items from {FOOD_SOURCE_LABELS[sourceFilter]}
              . Totals still cover every item.
            </p>
          )}

          {items.map((item, index) => {
            if (sourceFilter !== "all" && (item.dataSource ?? "ai") !== sourceFilter) return null;
            const issuesForItem = issuesByItem.get(index) ?? EMPTY_ISSUES;

            const itemHasError = issuesForItem.some((issue) => issue.kind === "error");
            const itemHasWarning = issuesForItem.some((issue) => issue.kind === "warning");
            return (
              <div
                key={index}
                className={`rounded-xl border p-3 ${
                  itemHasError ? "border-destructive/50 bg-destructive/5" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Item ${index + 1} name`}
                    value={item.name}
                    onChange={(e) => editItemField(index, "name", e.target.value)}
                    placeholder="Food"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${item.name || "item"}`}
                    onClick={() => {
                      setItems((prev) => prev.filter((_, i) => i !== index));
                      trackItemRemoved(scanId, {
                        index,
                        dataSource: item.dataSource ?? null,
                        calories: item.calories,
                        itemCount: items.length - 1,
                      });
                    }}
                    className="tap-target inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  aria-label={`Item ${index + 1} portion`}
                  value={item.portion}
                  onChange={(e) => editPortionField(index, e.target.value)}
                  onBlur={() => portionBase.current.delete(index)}
                  placeholder="150 g"
                  className="mt-2"
                />
                <FoodPortionPicker
                  item={item}
                  onChange={(patch) => updateItem(index, patch)}
                  onPortionPick={(picked) =>
                    trackPortionSwap(scanId, {
                      index,
                      label: picked.label,
                      fromGrams: picked.fromGrams,
                      toGrams: picked.grams,
                      dataSource: item.dataSource ?? null,
                      foodId: item.foodId ?? null,
                    })
                  }
                />

                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(
                    [
                      ["calories", "kcal"],
                      ["protein_g", "Protein"],
                      ["carbs_g", "Carbs"],
                      ["fat_g", "Fat"],
                    ] as const
                  ).map(([key, labelText]) => {
                    const fieldIssues = issuesForItem.filter(
                      (issue) => issue.field === key || issue.field === "totals",
                    );
                    const fieldError = fieldIssues.some((issue) => issue.kind === "error");
                    const fieldWarning = fieldIssues.some((issue) => issue.kind === "warning");
                    return (
                      <div key={key}>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {labelText}
                        </span>
                        <Input
                          aria-label={`Item ${index + 1} ${labelText}`}
                          inputMode="decimal"
                          value={macroInput(item[key])}
                          onChange={(e) => editItemField(index, key, Number(e.target.value) || 0)}
                          className={`mt-0.5 px-2 text-sm ${
                            fieldError
                              ? "border-destructive text-destructive focus-visible:ring-destructive"
                              : fieldWarning
                                ? "border-amber-500 text-amber-600 dark:text-amber-400 focus-visible:ring-amber-500"
                                : ""
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                {issuesForItem.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {issuesForItem.slice(0, 2).map((issue, idx) => (
                      <p
                        key={idx}
                        className={`flex items-start gap-1.5 text-[11px] ${
                          issue.kind === "error"
                            ? "text-destructive"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {issue.message.replace(`Item ${index + 1}: `, "")}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Meal total</h3>
            {override && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={resetToItems}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset to items
              </Button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Correct anything the Nutrition Facts read got wrong — these numbers are what gets
            logged.
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {(
              [
                ["calories", "Calories"],
                ["protein_g", "Protein"],
                ["carbs_g", "Carbs"],
                ["fat_g", "Fat"],
              ] as const
            ).map(([key, name]) => {
              const fieldErrors = totalIssues.filter((issue) => issue.field === key);
              const hasError = fieldErrors.some((issue) => issue.kind === "error");
              const hasWarning = fieldErrors.some((issue) => issue.kind === "warning");
              return (
                <div key={key}>
                  <Input
                    aria-label={`Meal total ${name}`}
                    inputMode="decimal"
                    // Until a total is hand-corrected, mirror the live item sum
                    // so portion rescales show up in the totals immediately.
                    value={override ? overrideRaw[key] : macroInput(totals[key])}
                    onChange={(e) => updateTotal(key, e.target.value)}
                    className={`px-2 text-center text-sm font-semibold tabular-nums ${
                      hasError
                        ? "border-destructive text-destructive focus-visible:ring-destructive"
                        : hasWarning
                          ? "border-amber-500 text-amber-600 dark:text-amber-400 focus-visible:ring-amber-500"
                          : ""
                    }`}
                  />
                  <div className="mt-0.5 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
                    {name}
                  </div>
                </div>
              );
            })}
          </div>
          {totalIssues.length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
              {totalIssues.map((issue, idx) => (
                <p
                  key={idx}
                  className={`flex items-start gap-1.5 text-[11px] ${
                    issue.kind === "error"
                      ? "text-destructive"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {issue.message}
                </p>
              ))}
            </div>
          )}
          {hardErrors.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">
                Auto-fix sets negative or unreadable values to 0 and caps anything impossibly high —
                everything else stays exactly as you typed it.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={autoFixValues}
              >
                <Wand2 className="mr-1 h-3 w-3" />
                Auto-fix values
              </Button>
            </div>
          )}
          {lastAutoFix && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">
                Auto-fixed {lastAutoFix.count} value{lastAutoFix.count === 1 ? "" : "s"}.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={undoAutoFix}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Undo auto-fix
              </Button>
            </div>
          )}
          <div className="mt-3 rounded-lg border border-border bg-background p-2.5">
            <Label htmlFor="meal-servings" className="text-xs font-medium">
              Servings eaten
            </Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Type the panel&apos;s numbers above, then how many servings you ate — the items and
              the meal total update on their own.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="meal-servings"
                inputMode="decimal"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-24 text-center text-sm tabular-nums"
              />
              <span
                className="flex items-center gap-1 text-[11px] text-muted-foreground"
                aria-live="polite"
              >
                <Calculator className="h-3.5 w-3.5" />
                {recalcPending ? "Updating…" : "Updates automatically"}
              </span>
            </div>
            {servings.trim() !== "" && !(Number(servings) > 0) && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Enter a number of servings (for example 1.5) to update the totals.
              </p>
            )}
            {lastRecalc && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
                <span className="text-[11px] text-muted-foreground">
                  Scaled to {lastRecalc.scaledTo} serving{lastRecalc.scaledTo === 1 ? "" : "s"}.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={undoRecalc}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Undo
                </Button>
              </div>
            )}
            {perServingBase && scaleBreakdown && (
              <Collapsible open={showBreakdown} onOpenChange={setShowBreakdown} className="mt-2">
                <p className="text-[11px] text-muted-foreground">
                  Per serving: {perServingBase.calories} kcal · {perServingBase.protein_g}g protein
                  · {perServingBase.carbs_g}g carbs · {perServingBase.fat_g}g fat — currently
                  showing {appliedServings} serving{appliedServings === 1 ? "" : "s"}.
                </p>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs">
                    <ChevronDown
                      className={`mr-1 h-3 w-3 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
                    />
                    How this was calculated
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
                  <TooltipProvider delayDuration={200}>
                    <p className="text-[11px] text-muted-foreground">
                      Every number is the per-serving value from the Nutrition Facts multiplied by
                      the servings you ate.
                    </p>
                    <table className="w-full text-[11px] tabular-nums">
                      <tbody>
                        {scaleBreakdown.macros.map((row) => (
                          <tr key={row.key}>
                            <td className="py-0.5 pr-2 text-muted-foreground">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="cursor-help underline decoration-dotted underline-offset-2"
                                  >
                                    {row.label}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[16rem]">
                                  <p className="leading-relaxed">
                                    {row.label} per serving ({row.perServing}
                                    {row.unit === "kcal" ? " kcal" : " g"}) ×{" "}
                                    {scaleBreakdown.servings} serving
                                    {scaleBreakdown.servings === 1 ? "" : "s"} = total{" "}
                                    {row.label.toLowerCase()}.
                                    {row.rounded
                                      ? " Rounded to the nearest whole unit for display."
                                      : ""}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="py-0.5 text-right">{row.perServing}</td>
                            <td className="px-1 py-0.5 text-center text-muted-foreground">
                              × {scaleBreakdown.servings}
                            </td>
                            <td className="py-0.5 text-right font-semibold">
                              = {row.shown}
                              {row.unit === "kcal" ? " kcal" : " g"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {scaleBreakdown.anyRounded && (
                      <p className="text-[11px] text-muted-foreground">
                        Some results are rounded for display, so a row may differ by less than a
                        unit.
                      </p>
                    )}
                    {override && (
                      <p className="text-[11px] text-muted-foreground">
                        Based on your hand-typed Nutrition Facts, not the original scan.
                      </p>
                    )}
                    {scaleBreakdown.items.length > 0 && (
                      <div>
                        <p className="mt-1 text-[11px] font-medium">Items scaled</p>
                        <ul className="mt-1 space-y-0.5">
                          {scaleBreakdown.items.map((item, idx) => (
                            <li
                              key={`${item.name}-${idx}`}
                              className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"
                            >
                              <span className="truncate">
                                {item.name}
                                {item.portion ? ` · ${item.portion}` : ""}
                              </span>
                              <span className="shrink-0 tabular-nums">
                                {item.perServingCalories} → {item.scaledCalories} kcal
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </TooltipProvider>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {wasAdjusted && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Edited from the original estimate of {aiTotals.calories} kcal — we save both so the
              scan gets smarter.
            </p>
          )}

          <div className="mt-3">
            <span className="text-xs font-medium">Confidence saved with this meal</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {CONFIDENCE_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={confidence === level}
                  onClick={() => setConfidence(level)}
                  className={`tap-target rounded-full border px-3 text-xs font-medium capitalize transition ${
                    confidence === level
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {confidence ? CONFIDENCE_COPY[confidence] : "Pick how sure you are of these numbers."}
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => save()}
            disabled={saving || Boolean(rescanning) || hardErrors.length > 0}
            aria-describedby={hardErrors.length > 0 ? "meal-save-validation-error" : undefined}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditing ? "Save changes" : "Save meal"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
