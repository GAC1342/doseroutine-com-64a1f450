import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Barcode,
  Camera,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Loader2,
  NotebookPen,
  PencilLine,
  Plus,
  Search,
  Settings2,
  Trash2,
  Zap,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MealReviewSheet, type MealDraft } from "@/components/meal-review-sheet";
import { FoodProductSearch } from "@/components/food-product-search";
import { MealHowToCard } from "@/components/meal-howto-card";
import { MacroGoalsCard } from "@/components/macro-goals-card";
import { ProteinPriorityCard } from "@/components/protein-priority-card";
import { RepeatMealCard } from "@/components/repeat-meal-card";
import { LoggingStreakCard } from "@/components/logging-streak-card";
import { MealTimingCard } from "@/components/meal-timing-card";
import { MacroProgress } from "@/components/macro-progress";
import { MealPhotoExpiryBanner, MealPhotoStorageCard } from "@/components/meal-photo-storage-card";
import { RoutinePlannerCard } from "@/components/routine-planner-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import {
  scanMealInput,
  lookupFoodLabel,
  lookupFoodBarcodeDetailed,
} from "@/lib/meal-scan.functions";
import { ScanMatchSheet, type ScanMatchCandidate } from "@/components/scan-match-sheet";
import { RecentFoodScans } from "@/components/recent-food-scans";
import { getCachedPanel, putCachedPanel, type CachedPanel } from "@/lib/nutrition-cache";
import { recordFoodScan, type FoodScanRecord } from "@/lib/food-scan-history";
import { scoreBarcodeMatch, MATCH_SOURCE_LABELS } from "@/lib/barcode-confidence";
import { inferMealSlot } from "@/lib/meal-slot";
import { scanBarcodeFromImage } from "@/lib/barcode-scanner";
import { BarcodeScanSheet } from "@/components/barcode-scan-sheet";
import { QuickAddMealSheet } from "@/components/quick-add-meal-sheet";
import { cleanBarcode, describeBarcodeInput, suggestGtinFix } from "@/lib/gtin";
import { fileToDownscaledDataUrl } from "@/lib/image-downscale";
import { routeErrorComponent } from "@/components/route-error-panel";
import {
  newScanId,
  trackScanCapture,
  trackScanParsed,
  trackScanError,
} from "@/lib/meal-scan-analytics";
import {
  EMPTY_EXTENDED,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  addExtended,
  emptyItem,
  extendedTotalsFor,
  roundTotals,
  totalsFor,
  type FoodLabelMatch,
  type MealItem,
  type MealSlot,
} from "@/lib/meal-nutrition";
import {
  mealSlotName,
  onMealSlotPrefsChange,
  parseCalorieGoal,
  readMealSlotPrefs,
  setMealSlotPref,
  toggleMealSlotCollapsed,
  type MealSlotPrefs,
} from "@/lib/meal-slot-prefs";

type FoodView = "diary" | "times";

export const Route = createFileRoute("/_authenticated/food")({
  errorComponent: routeErrorComponent("food"),
  validateSearch: (search: Record<string, unknown>): { day?: string; view?: FoodView } => ({
    day:
      typeof search.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.day)
        ? search.day
        : undefined,
    view: search.view === "times" ? "times" : search.view === "diary" ? "diary" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Food & Macros — DoseRoutine" },
      {
        name: "description",
        content:
          "Scan a meal photo or a barcode to log calories, protein, carbs and fat — review and edit every number before it is saved.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FoodPage,
});

type MealRow = {
  id: string;
  label: string | null;
  meal_slot: string | null;
  source: string | null;
  notes: string | null;
  barcode: string | null;
  storage_path: string | null;
  ai_confidence: string | null;
  ai_items: unknown;
  logged_at: string;
  adj_calories: number | null;
  adj_protein_g: number | null;
  adj_carbs_g: number | null;
  adj_fat_g: number | null;
  est_calories: number | null;
  est_protein_g: number | null;
  est_carbs_g: number | null;
  est_fat_g: number | null;
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dayHeadline(key: string) {
  const today = todayKey();
  if (key === today) return "Today";
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  const date = new Date(y, m - 1, d);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, yesterday)) return "Yesterday";
  if (same(date, tomorrow)) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "long" });
}

function dayDetail(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function macro(row: MealRow, key: "calories" | "protein_g" | "carbs_g" | "fat_g") {
  const adjusted = row[`adj_${key}` as const];
  const estimated = row[`est_${key}` as const];
  return Number(adjusted ?? estimated ?? 0);
}

function FoodPage() {
  const search = Route.useSearch();
  const [day, setDay] = useState(search.day ?? todayKey);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Photo estimate parked while the user looks for the right published label. */
  const [pendingPhoto, setPendingPhoto] = useState<{
    estimate: Awaited<ReturnType<typeof scanMealInput>>;
    imageDataUrl: string;
  } | null>(null);
  /** Barcode result waiting for the user to confirm which product it is. */
  const [match, setMatch] = useState<{
    scanned: string;
    best: ScanMatchCandidate | null;
    alternates: ScanMatchCandidate[];
  } | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  /** Known-size object the user put in the photo so portions can be scaled. */
  const [reference, setReference] = useState<string>("none");
  const fileRef = useRef<HTMLInputElement>(null);
  /** Slot the user explicitly opened "+" on, or null to infer from the clock. */
  const addSlotRef = useRef<MealSlot | null>(null);
  /** Current scanner attempt id — threads capture -> parse -> save events. */
  const scanIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const analyze = useServerFn(scanMealInput);
  const lookup = useServerFn(lookupFoodLabel);
  const lookupDetailed = useServerFn(lookupFoodBarcodeDetailed);

  /**
   * The user's own meal times, so an 22:00 scan lands in "dinner" for someone
   * who eats late instead of being filed as a snack.
   */
  const mealTimesQuery = useQuery({
    queryKey: ["meal-times-slots"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_times")
        .select("label, planned_time, active")
        .eq("active", true);
      return (data ?? []).map((row) => ({ label: row.label, time: row.planned_time }));
    },
  });

  /** Slot a scan taken right now belongs to, in the user's own timezone. */
  function autoSlot(): MealSlot {
    return inferMealSlot(new Date(), mealTimesQuery.data ?? []);
  }

  const mealsQuery = useQuery({
    queryKey: ["meals", day],
    queryFn: async () => {
      const start = new Date(`${day}T00:00:00`).toISOString();
      const end = new Date(`${day}T23:59:59.999`).toISOString();
      const { data, error } = await supabase
        .from("meals")
        .select(
          "id,label,meal_slot,source,notes,barcode,storage_path,ai_confidence,ai_items,logged_at,adj_calories,adj_protein_g,adj_carbs_g,adj_fat_g,est_calories,est_protein_g,est_carbs_g,est_fat_g",
        )
        .gte("logged_at", start)
        .lte("logged_at", end)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MealRow[];
    },
  });

  const meals = useMemo(() => mealsQuery.data ?? [], [mealsQuery.data]);
  /** Fiber / sugars / sodium / sat fat summed from each meal's saved items. */
  const dayExtended = useMemo(
    () =>
      meals
        .map((row) =>
          extendedTotalsFor(Array.isArray(row.ai_items) ? (row.ai_items as MealItem[]) : []),
        )
        .reduce(addExtended, EMPTY_EXTENDED),
    [meals],
  );
  const dayTotals = useMemo(
    () =>
      roundTotals(
        totalsFor(
          meals.map((row) => ({
            name: row.label ?? "Meal",
            portion: "",
            calories: macro(row, "calories"),
            protein_g: macro(row, "protein_g"),
            carbs_g: macro(row, "carbs_g"),
            fat_g: macro(row, "fat_g"),
          })),
        ),
      ),
    [meals],
  );

  function openPhotoDraft(
    estimate: Awaited<ReturnType<typeof scanMealInput>>,
    imageDataUrl?: string | null,
  ) {
    setDraft({
      label: estimate.label,
      items: estimate.items,
      confidence: estimate.confidence,
      note: estimate.note,
      source: estimate.readFrom === "barcode" ? "barcode" : "photo",
      barcode: estimate.barcode ?? null,
      readFrom: estimate.readFrom ?? "visual",
      scaleBasis: estimate.scaleBasis ?? null,
      photoDataUrl: imageDataUrl ?? null,
      slot: addSlotRef.current ?? autoSlot(),
    });
    setSheetOpen(true);
  }

  /** Turn a resolved nutrition panel into an editable draft. */
  function draftFromPanel(
    panel: { name: string; brand: string | null; basis: string | null; perServing: unknown },
    code: string,
    sourceLine?: string | null,
  ) {
    setDraft({
      label: (panel.brand ? `${panel.brand} ${panel.name}` : panel.name).slice(0, 80),
      items: [panel.perServing as MealItem],
      confidence: "high",
      note: [
        panel.basis === "100g"
          ? "Published values are per 100 g — adjust the portion to match what you ate."
          : "Published per-serving values from the product label.",
        sourceLine ?? "",
      ]
        .filter(Boolean)
        .join(" "),
      source: "barcode",
      barcode: code || null,
      readFrom: "barcode",
      slot: addSlotRef.current ?? autoSlot(),
    });
    setSheetOpen(true);
  }

  /** Use a searched product's published panel instead of a guess. */
  function useProductMatch(match: FoodLabelMatch) {
    if (!match.perServing) return;
    setSearchOpen(false);
    setDraft({
      label: (match.brand ? `${match.brand} ${match.name}` : match.name).slice(0, 80),
      items: [match.perServing],
      confidence: "high",
      note:
        match.basis === "100g"
          ? "Published values are per 100 g — adjust the portion to match what you ate."
          : "Published per-serving values from the product label.",
      source: "barcode",
      barcode: match.barcode || null,
      readFrom: "barcode",
      photoDataUrl: pendingPhoto?.imageDataUrl ?? null,
      slot: addSlotRef.current ?? autoSlot(),
    });
    setPendingPhoto(null);
    setSheetOpen(true);
  }

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const scanId = scanIdRef.current ?? newScanId();
      scanIdRef.current = scanId;
      const startedAt = performance.now();
      // Barcode first: if the photo shows a readable barcode we can skip the
      // guesswork entirely and use the manufacturer's published panel.
      const detected = await scanBarcodeFromImage(file).catch(() => null);
      const imageDataUrl = await fileToDownscaledDataUrl(file);
      const estimate = await analyze({
        data: { imageDataUrl, barcode: detected, reference },
      });
      trackScanParsed(scanId, "photo", {
        durationMs: performance.now() - startedAt,
        readFrom: estimate.readFrom ?? null,
        confidence: estimate.confidence ?? null,
        itemCount: estimate.items?.length ?? 0,
        calories: Math.round(
          (estimate.items ?? []).reduce((sum, it) => sum + (Number(it.calories) || 0), 0),
        ),
        hasBarcode: Boolean(estimate.barcode ?? detected),
      });
      return { estimate, imageDataUrl };
    },
    onSuccess: ({ estimate, imageDataUrl }) => {
      // A barcode was seen but no manufacturer panel came back: let the user pick
      // the right product before we settle for the OCR/visual read.
      if (estimate.barcode && estimate.readFrom !== "barcode") {
        setPendingPhoto({ estimate, imageDataUrl });
        setSearchQuery(estimate.label ?? "");
        setSearchOpen(true);
        return;
      }
      openPhotoDraft(estimate, imageDataUrl);
    },
    onError: (err) => {
      trackScanError(scanIdRef.current ?? newScanId(), "photo", "parse", err);
      toast.error("Could not read that photo", {
        description: err instanceof Error ? err.message : "Try again with better lighting.",
      });
    },
  });

  /** Digits of the code currently being resolved — camera or typed. */
  const lastCodeRef = useRef("");
  const barcodeMutation = useMutation({
    mutationFn: async (input: { code: string; entry: "typed" | "camera" }) => {
      const code = cleanBarcode(input.code);
      lastCodeRef.current = code;
      const scanId = newScanId();
      scanIdRef.current = scanId;
      trackScanCapture(scanId, "barcode", { entry: input.entry });
      const startedAt = performance.now();

      // 1. Offline-first: a panel we already saved answers instantly, even in
      //    a basement supermarket with no signal.
      const cached = await getCachedPanel(code).catch(() => null);

      // 2. Ask the network for the authoritative answer with alternates.
      let smart: Awaited<ReturnType<typeof lookupDetailed>> | null = null;
      try {
        smart = await lookupDetailed({ data: { barcode: code } });
      } catch (error) {
        if (!cached) throw error;
      }

      trackScanParsed(scanId, "barcode", {
        durationMs: performance.now() - startedAt,
        readFrom: "barcode",
        confidence: smart?.best?.confidence.level ?? (cached ? "cached" : null),
        itemCount: smart?.best ? 1 : cached ? 1 : 0,
        calories: Math.round(
          Number((smart?.best?.panel.perServing as MealItem | undefined)?.calories ?? 0),
        ),
        hasBarcode: true,
      });
      return { code, smart, cached };
    },
    onSuccess: async ({ code, smart, cached }) => {
      // Network unavailable (or the code vanished from the sources): use the
      // saved copy rather than telling the user "not found".
      if ((!smart || !smart.found || !smart.best) && cached?.panel?.found) {
        draftFromPanel(
          cached.panel as unknown as {
            name: string;
            brand: string | null;
            basis: string | null;
            perServing: unknown;
          },
          code,
          `Offline copy saved ${new Date(cached.savedAt).toLocaleDateString()}.`,
        );
        toast.info("Using the copy saved on this device", {
          description: "Reconnect to refresh this product's panel.",
        });
        return;
      }

      if (!smart || !smart.found || !smart.best) {
        const suggestion = suggestGtinFix(code);
        toast.error("That barcode isn't in the food databases yet", {
          description: suggestion
            ? `Did you mean ${suggestion}? Otherwise search by name or type the label in.`
            : "Search the product by name, or enter the label by hand.",
        });
        setPendingPhoto(null);
        setSearchQuery("");
        setSearchOpen(true);
        return;
      }

      const best = smart.best;
      // Save the winner for offline use and remember the scan for one-tap re-adds.
      void putCachedPanel(code, best.panel as unknown as CachedPanel, best.source);
      void recordFoodScan({
        barcode: code,
        name: best.panel.name,
        brand: best.panel.brand,
        source: best.source,
        confidenceScore: best.confidence.score,
        confidenceLevel: best.confidence.level,
        calories: Number((best.panel.perServing as MealItem | null)?.calories ?? 0),
      });

      // Confident and unambiguous: go straight to the review sheet.
      const sure = best.confidence.level === "exact" || best.confidence.level === "high";
      if (sure) {
        draftFromPanel(best.panel, code, `Matched via ${MATCH_SOURCE_LABELS[best.source]}.`);
        return;
      }
      setMatch({ scanned: code, best, alternates: smart.alternates });
      setMatchOpen(true);
    },
    onError: (err) => {
      trackScanError(scanIdRef.current ?? newScanId(), "barcode", "lookup", err);
      toast.error("Barcode lookup failed", {
        description: "Check your connection and try again, or search by name.",
      });
    },
  });

  /** Re-log a product straight from the user's scan history. */
  async function reAddPastScan(scan: FoodScanRecord, panel: CachedPanel | null) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- state setter declared below
    setAddOpen(false);
    if (panel?.found && panel.perServing) {
      draftFromPanel(
        panel as unknown as {
          name: string;
          brand: string | null;
          basis: string | null;
          perServing: unknown;
        },
        scan.barcode,
        "Re-added from your scan history.",
      );
      return;
    }
    // Nothing cached on this device (different phone, cleared storage): resolve it.
    barcodeMutation.mutate({ code: scan.barcode, entry: "typed" });
  }

  /** Shared entry point for the camera sheet and the typed-digits field. */
  function runBarcode(code: string, entry: "typed" | "camera") {
    const issue = describeBarcodeInput(code);
    if (issue) {
      toast.error(
        issue === "check-digit"
          ? "Those digits don't match a real barcode"
          : "That barcode looks incomplete",
        { description: "Check the numbers printed under the bars, or scan it with the camera." },
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- state setter declared below
    setAddOpen(false);
    barcodeMutation.mutate({ code, entry });
  }

  function editMeal(row: MealRow) {
    const savedItems = Array.isArray(row.ai_items) ? (row.ai_items as MealItem[]) : [];
    const items =
      savedItems.length > 0
        ? savedItems
        : [
            {
              ...emptyItem(row.label ?? "Meal"),
              calories: macro(row, "calories"),
              protein_g: macro(row, "protein_g"),
              carbs_g: macro(row, "carbs_g"),
              fat_g: macro(row, "fat_g"),
            },
          ];
    const logged = new Date(row.logged_at);
    setDraft({
      id: row.id,
      label: row.label ?? "Meal",
      items,
      confidence: (row.ai_confidence as MealDraft["confidence"]) ?? null,
      note: row.notes ?? "",
      source: (row.source as MealDraft["source"]) ?? "manual",
      barcode: row.barcode,
      storagePath: row.storage_path,
      slot: (row.meal_slot ?? "other") as MealSlot,
      time: `${String(logged.getHours()).padStart(2, "0")}:${String(logged.getMinutes()).padStart(2, "0")}`,
      estimateItems: [
        {
          name: row.label ?? "Meal",
          portion: "",
          calories: Number(row.est_calories ?? 0),
          protein_g: Number(row.est_protein_g ?? 0),
          carbs_g: Number(row.est_carbs_g ?? 0),
          fat_g: Number(row.est_fat_g ?? 0),
        },
      ],
    });
    setSheetOpen(true);
  }

  async function deleteMeal(id: string) {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete that meal");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["meals"] });
    void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
    void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
  }

  const busy = photoMutation.isPending;

  const view: FoodView = search.view ?? "diary";
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [addSlot, setAddSlot] = useState<MealSlot>("other");
  // Every scan on this page now runs through the shared Quick Add sheet, so
  // photo and barcode capture behave identically here and on Today.
  const [quickScan, setQuickScan] = useState<{
    open: boolean;
    mode: "menu" | "camera" | "barcode";
  }>({ open: false, mode: "menu" });

  // "+" on a named diary section pins that slot; the global button lets the
  // clock decide, exactly like the older flow did.
  const quickAddSlot =
    addSlotRef.current && addSlotRef.current !== "other"
      ? (addSlotRef.current as "breakfast" | "lunch" | "dinner" | "snack")
      : undefined;

  function openQuickAdd(mode: "menu" | "camera" | "barcode") {
    setAddOpen(false);
    setQuickScan({ open: true, mode });
  }

  function openAdd(slot: MealSlot) {
    setAddSlot(slot);
    // "+" on a named section pins the slot; the global add button lets the
    // clock decide.
    addSlotRef.current = slot === "other" ? null : slot;
    setAddOpen(true);
  }

  function startManual() {
    setAddOpen(false);
    setDraft({
      label: "",
      items: [emptyItem()],
      confidence: null,
      note: "",
      source: "manual",
      slot: addSlotRef.current ?? autoSlot(),
    });
    setSheetOpen(true);
  }

  /** Meals grouped into the fixed diary sections users expect. */
  const bySlot = useMemo(() => {
    const map = new Map<MealSlot, MealRow[]>();
    for (const slot of MEAL_SLOTS) map.set(slot, []);
    for (const row of meals) {
      const slot = (row.meal_slot ?? "other") as MealSlot;
      map.get(map.has(slot) ? slot : "other")!.push(row);
    }
    return map;
  }, [meals]);

  /* ---- Per-meal card preferences: custom name, calorie goal, collapsed ---- */
  const [slotPrefs, setSlotPrefs] = useState<MealSlotPrefs>({});
  useEffect(() => {
    setSlotPrefs(readMealSlotPrefs());
    return onMealSlotPrefsChange(() => setSlotPrefs(readMealSlotPrefs()));
  }, []);
  const [editingSlot, setEditingSlot] = useState<MealSlot | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [goalDraft, setGoalDraft] = useState("");

  function startSlotEdit(slot: MealSlot, currentName: string) {
    setEditingSlot(slot);
    setNameDraft(currentName);
    const goal = slotPrefs[slot]?.calorieGoal;
    setGoalDraft(goal ? String(goal) : "");
  }

  function saveSlotEdit(slot: MealSlot, fallbackLabel: string) {
    setMealSlotPref(slot, {
      name: nameDraft.trim() === fallbackLabel ? null : nameDraft.trim().slice(0, 40) || null,
      calorieGoal: parseCalorieGoal(goalDraft),
    });
    setEditingSlot(null);
  }

  /**
   * The handful of things this person actually eats for each meal, so a
   * repeat breakfast is one tap instead of a search.
   */
  const commonQuery = useQuery({
    queryKey: ["common-meals-by-slot"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("meals")
        .select(
          "id,label,meal_slot,source,barcode,ai_items,logged_at,adj_calories,adj_protein_g,adj_carbs_g,adj_fat_g,est_calories,est_protein_g,est_carbs_g,est_fat_g",
        )
        .gte("logged_at", since)
        .order("logged_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as MealRow[];
    },
  });

  /** Top three most-logged labels per slot, newest example of each. */
  const commonBySlot = useMemo(() => {
    const map = new Map<MealSlot, { row: MealRow; count: number }[]>();
    const buckets = new Map<string, { row: MealRow; count: number; slot: MealSlot }>();
    for (const row of commonQuery.data ?? []) {
      const slot = (MEAL_SLOTS as readonly string[]).includes(row.meal_slot ?? "")
        ? ((row.meal_slot ?? "other") as MealSlot)
        : ("other" as MealSlot);
      const label = (row.label ?? "Meal").trim().toLowerCase();
      const key = `${slot}|${label}`;
      const found = buckets.get(key);
      if (found) found.count += 1;
      else buckets.set(key, { row, count: 1, slot });
    }
    for (const entry of buckets.values()) {
      const list = map.get(entry.slot) ?? [];
      list.push({ row: entry.row, count: entry.count });
      map.set(entry.slot, list);
    }
    for (const [slot, list] of map) {
      list.sort((a, b) => b.count - a.count);
      map.set(slot, list.slice(0, 3));
    }
    return map;
  }, [commonQuery.data]);

  /** One-tap re-log of a previous meal into the day being viewed. */
  const quickAdd = useMutation({
    mutationFn: async (row: MealRow) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("You need to be signed in.");
      const now = new Date();
      const loggedAt = new Date(
        `${day}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`,
      );
      const { error } = await supabase.from("meals").insert({
        user_id: uid,
        label: row.label ?? "Meal",
        meal_slot: row.meal_slot ?? "other",
        source: row.source ?? "manual",
        barcode: row.barcode,
        ai_items: (Array.isArray(row.ai_items) ? row.ai_items : []) as unknown as never,
        est_calories: macro(row, "calories"),
        est_protein_g: macro(row, "protein_g"),
        est_carbs_g: macro(row, "carbs_g"),
        est_fat_g: macro(row, "fat_g"),
        adj_calories: macro(row, "calories"),
        adj_protein_g: macro(row, "protein_g"),
        adj_carbs_g: macro(row, "carbs_g"),
        adj_fat_g: macro(row, "fat_g"),
        was_adjusted: false,
        logged_at: loggedAt.toISOString(),
      });
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      toast.success(`Added ${row.label ?? "meal"}`, {
        description: `${Math.round(macro(row, "calories"))} kcal · ${Math.round(macro(row, "protein_g"))}g protein`,
      });
      void queryClient.invalidateQueries({ queryKey: ["meals"] });
      void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
      void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
    },
    onError: (err) => {
      toast.error("Could not add that meal", {
        description: err instanceof Error ? err.message : undefined,
      });
    },
  });

  function shiftDay(delta: number) {
    const d = new Date(`${day}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDay(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Food &amp; macros</h1>
          <p className="text-sm text-muted-foreground">
            Scan, review, then save — nothing is logged until you approve it.
          </p>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Food sections"
        className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        <button
          role="tab"
          aria-selected={view === "diary"}
          onClick={() =>
            navigate({ to: "/food", search: (prev) => ({ ...prev, view: "diary" }), replace: true })
          }
          className={`tap-target flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium ${
            view === "diary"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
          }`}
        >
          <NotebookPen className="h-4 w-4 shrink-0" />
          Diary
        </button>
        <Link
          to="/meal-plan"
          role="tab"
          className="tap-target flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <CalendarRange className="h-4 w-4 shrink-0" />
          Plan
        </Link>
        <button
          role="tab"
          aria-selected={view === "times"}
          onClick={() =>
            navigate({ to: "/food", search: (prev) => ({ ...prev, view: "times" }), replace: true })
          }
          className={`tap-target flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium ${
            view === "times"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          Times
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        aria-label="Take or choose a meal photo"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) {
            const scanId = newScanId();
            scanIdRef.current = scanId;
            trackScanCapture(scanId, "photo", { bytes: file.size, mime: file.type || null });
            photoMutation.mutate(file);
          }
        }}
      />

      {view === "times" ? (
        <div className="mt-4 space-y-4">
          <RoutinePlannerCard table="meal_times" />
          <MealTimingCard />
          <MacroGoalsCard />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Day switcher */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-card p-2">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => shiftDay(-1)}
              className="tap-target shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 text-center">
              <div className="truncate text-sm font-semibold">{dayHeadline(day)}</div>
              <div className="truncate text-[11px] text-muted-foreground">{dayDetail(day)}</div>
              <Input
                type="date"
                aria-label="Choose day"
                value={day}
                onChange={(e) => setDay(e.target.value || todayKey())}
                className="mx-auto mt-1 h-8 w-auto border-0 bg-transparent p-0 text-center text-xs text-muted-foreground shadow-none"
              />
            </div>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => shiftDay(1)}
              className="tap-target shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day totals up top, the way a food diary should read */}
          <section aria-label="Day totals" className="rounded-2xl bg-card p-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Calories", `${dayTotals.calories}`],
                ["Protein", `${dayTotals.protein_g}g`],
                ["Carbs", `${dayTotals.carbs_g}g`],
                ["Fat", `${dayTotals.fat_g}g`],
              ].map(([name, value]) => (
                <div key={name}>
                  <div className="text-lg font-semibold tabular-nums">{value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {name}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
              {[
                ["Fiber", dayExtended.fiber_g == null ? "—" : `${dayExtended.fiber_g}g`],
                ["Sugars", dayExtended.sugar_g == null ? "—" : `${dayExtended.sugar_g}g`],
                ["Sat fat", dayExtended.satfat_g == null ? "—" : `${dayExtended.satfat_g}g`],
                ["Sodium", dayExtended.sodium_mg == null ? "—" : `${dayExtended.sodium_mg}mg`],
              ].map(([name, value]) => (
                <div key={name}>
                  <div className="text-sm font-semibold tabular-nums">{value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {name}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Fiber, sugars, saturated fat and sodium show only for foods whose source publishes
              them — “—” means no data, not zero.
            </p>
          </section>

          <MealPhotoExpiryBanner />

          {/* The diary itself: one section per meal, one add action each */}
          <div className="space-y-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dayHeadline(day)}’s meals
            </h2>

            {/* Day summary across every meal, always visible above the cards */}
            <div
              aria-label="Day summary"
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs"
            >
              <span className="font-semibold">All meals</span>
              <span className="tabular-nums text-muted-foreground">
                <strong className="font-semibold text-foreground">{dayTotals.calories}</strong> kcal
                {" · "}
                <strong className="font-semibold text-foreground">
                  {dayTotals.protein_g}g
                </strong>{" "}
                protein
                {" · "}
                <strong className="font-semibold text-foreground">{dayTotals.carbs_g}g</strong>{" "}
                carbs
              </span>
            </div>

            {MEAL_SLOTS.map((slot) => {
              const rows = bySlot.get(slot) ?? [];
              if (slot === "other" && rows.length === 0) return null;
              const fallbackLabel = MEAL_SLOT_LABELS[slot];
              const slotLabel = mealSlotName(slotPrefs, slot, fallbackLabel);
              const goal = slotPrefs[slot]?.calorieGoal ?? null;
              const collapsed = slotPrefs[slot]?.collapsed === true;
              const editing = editingSlot === slot;
              const quickPicks = commonBySlot.get(slot) ?? [];
              const slotCalories = Math.round(
                rows.reduce((sum, row) => sum + macro(row, "calories"), 0),
              );
              const slotProtein = Math.round(
                rows.reduce((sum, row) => sum + macro(row, "protein_g"), 0),
              );
              return (
                <section key={slot} aria-label={slotLabel} className="rounded-2xl bg-card p-3">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                    <button
                      type="button"
                      aria-expanded={!collapsed}
                      aria-label={collapsed ? `Show ${slotLabel} items` : `Hide ${slotLabel} items`}
                      onClick={() => toggleMealSlotCollapsed(slot, !collapsed)}
                      className="tap-target -ml-1 mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      {collapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{slotLabel}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {rows.length === 0
                          ? "No items yet"
                          : `${rows.length} ${rows.length === 1 ? "item" : "items"} · ${slotCalories} kcal · ${slotProtein}g protein`}
                        {goal ? ` · goal ${goal} kcal` : ""}
                      </p>
                      {goal ? (
                        <div
                          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-label={`${slotLabel} calorie goal`}
                          aria-valuemin={0}
                          aria-valuemax={goal}
                          aria-valuenow={slotCalories}
                        >
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Math.min(100, Math.round((slotCalories / goal) * 100))}%`,
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Edit ${slotLabel} name and goal`}
                        onClick={() =>
                          editing ? setEditingSlot(null) : startSlotEdit(slot, slotLabel)
                        }
                        className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                      >
                        <Settings2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Add food to ${slotLabel}`}
                        onClick={() => openAdd(slot)}
                        className="tap-target inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        Add
                      </button>
                    </div>
                  </div>

                  {editing ? (
                    <div className="mt-3 grid gap-2 rounded-xl border border-border bg-muted/40 p-3">
                      <label className="grid gap-1 text-xs font-medium">
                        Meal name
                        <Input
                          value={nameDraft}
                          maxLength={40}
                          placeholder={fallbackLabel}
                          onChange={(e) => setNameDraft(e.target.value)}
                          className="h-9"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-medium">
                        Calorie goal for this meal
                        <Input
                          value={goalDraft}
                          inputMode="numeric"
                          placeholder="No goal"
                          onChange={(e) => setGoalDraft(e.target.value)}
                          className="h-9"
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSlot(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveSlotEdit(slot, fallbackLabel)}
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {!collapsed && quickPicks.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Quick add
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {quickPicks.map(({ row }) => (
                          <button
                            key={row.id}
                            type="button"
                            disabled={quickAdd.isPending}
                            onClick={() => quickAdd.mutate(row)}
                            aria-label={`Quick add ${row.label ?? "meal"} to ${slotLabel}`}
                            className="tap-target inline-flex max-w-full items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-60"
                          >
                            <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate">{row.label ?? "Meal"}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {Math.round(macro(row, "calories"))} kcal
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {collapsed ? null : mealsQuery.isPending ? (
                    <p
                      className="mt-3 text-xs text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      Loading {slotLabel.toLowerCase()}…
                    </p>
                  ) : rows.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Nothing logged for {slotLabel.toLowerCase()} — tap Add to scan a photo, a
                      barcode, or type it in.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-border border-t border-border">
                      {rows.map((row) => (
                        <li
                          key={row.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {row.label ?? "Meal"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {new Date(row.logged_at).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}{" "}
                              · {Math.round(macro(row, "calories"))} kcal ·{" "}
                              {Math.round(macro(row, "protein_g"))}g protein
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Edit ${row.label ?? "meal"}`}
                              onClick={() => editMeal(row)}
                              className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${row.label ?? "meal"}`}
                              onClick={() => void deleteMeal(row.id)}
                              className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <MealHowToCard />
          <LoggingStreakCard />
          <ProteinPriorityCard proteinToday={dayTotals.protein_g} />
          <MacroProgress day={day} onLogMeal={() => openQuickAdd("menu")} />
          <RepeatMealCard day={day} />
          <MealPhotoStorageCard />
        </div>
      )}

      {/* One way in for every capture method */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add to {MEAL_SLOT_LABELS[addSlot]}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-2">
            <Button
              type="button"
              size="lg"
              className="h-14 justify-start text-base"
              disabled={busy}
              onClick={() => openQuickAdd("camera")}
            >
              {busy ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Camera className="mr-2 h-5 w-5" />
              )}
              Scan a photo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 justify-start"
              onClick={() => {
                setAddOpen(false);
                setPendingPhoto(null);
                setSearchQuery("");
                setSearchOpen(true);
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              Search a food
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 justify-start"
              onClick={() => openQuickAdd("barcode")}
            >
              <Barcode className="mr-2 h-4 w-4" />
              Scan a barcode
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 justify-start"
              onClick={startManual}
            >
              <PencilLine className="mr-2 h-4 w-4" />
              Enter by hand
            </Button>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                placeholder="Barcode number"
                aria-label="Food barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && barcode.trim().length >= 8) {
                    runBarcode(barcode.trim(), "typed");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                aria-label="Look up barcode"
                disabled={barcodeMutation.isPending || barcode.trim().length < 8}
                onClick={() => runBarcode(barcode.trim(), "typed")}
              >
                {barcodeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Barcode className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="rounded-xl border border-border p-3">
              <label
                htmlFor="scale-reference"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Something for scale (optional)
              </label>
              <select
                id="scale-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="none">Nothing in the photo</option>
                <option value="card">A bank/ID card next to the food</option>
                <option value="quarter">A coin (US quarter) next to the food</option>
                <option value="fork">A dinner fork in the photo</option>
                <option value="spoon">A tablespoon in the photo</option>
                <option value="thumb">My thumb next to the food</option>
                <option value="plate">On a standard dinner plate</option>
                <option value="bowl">In a standard cereal bowl</option>
              </select>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Portion size is the biggest source of error. Putting a card, coin or fork in the
                shot gives the scanner a known length to measure everything against.
              </p>
            </div>

            <RecentFoodScans onReAdd={reAddPastScan} className="pt-1" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Photo estimates are a starting point, not a lab measurement. Check the portion and edit
            anything that looks off before saving.
          </p>
        </SheetContent>
      </Sheet>

      <QuickAddMealSheet
        open={quickScan.open}
        initialMode={quickScan.mode}
        slot={quickAddSlot}
        onOpenChange={(next) => setQuickScan((prev) => ({ ...prev, open: next }))}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["meals"] });
          void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
          void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
        }}
      />

      <BarcodeScanSheet
        open={scanOpen}
        onOpenChange={setScanOpen}
        onDetected={(code) => {
          setBarcode(code);
          runBarcode(code, "camera");
        }}
        title="Scan a food barcode"
      />

      <FoodProductSearch
        open={searchOpen}
        onOpenChange={(next) => {
          setSearchOpen(next);
          if (!next) setPendingPhoto(null);
        }}
        initialQuery={searchQuery}
        onPick={useProductMatch}
        {...(pendingPhoto
          ? {
              onSkip: () => {
                setSearchOpen(false);
                openPhotoDraft(pendingPhoto.estimate, pendingPhoto.imageDataUrl);
                setPendingPhoto(null);
              },
              skipLabel: "Use photo estimate",
            }
          : {})}
      />

      <ScanMatchSheet
        open={matchOpen}
        onOpenChange={setMatchOpen}
        scanned={match?.scanned ?? ""}
        best={match?.best ?? null}
        alternates={match?.alternates ?? []}
        onConfirm={(candidate) => {
          setMatchOpen(false);
          void putCachedPanel(
            match?.scanned ?? candidate.matched,
            candidate.panel as unknown as CachedPanel,
            candidate.source,
          );
          draftFromPanel(
            candidate.panel,
            match?.scanned ?? candidate.matched,
            `Matched via ${MATCH_SOURCE_LABELS[candidate.source]}.`,
          );
        }}
        onSearchInstead={() => {
          setMatchOpen(false);
          setPendingPhoto(null);
          setSearchQuery(match?.best?.panel.name ?? "");
          setSearchOpen(true);
        }}
      />

      <MealReviewSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        draft={draft}
        dayKey={day}
        scanId={scanIdRef.current}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["meals"] });
          void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
          void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
        }}
      />
    </div>
  );
}
