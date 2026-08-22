/**
 * Quick Add Meal — full-screen mobile sheet opened from the Home "+" button.
 *
 * Screen 1 is a 2x2 grid of entry points (photo / barcode / describe / recent)
 * with a meal-type segmented control defaulting to the current time of day.
 * Photo capture shows the shot full-bleed immediately with a shimmer and
 * "Analyzing…" while the analysis runs in the background — the user can add a
 * note at any point, which re-runs the analysis with that context.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Camera,
  Clock3,
  Keyboard,
  Loader2,
  RotateCcw,
  ScanBarcode,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BarcodeScanSheet } from "@/components/barcode-scan-sheet";
import { type MealDraft } from "@/components/meal-review-sheet";
import { QuickMealReview } from "@/components/quick-meal-review";
import { fileToDownscaledDataUrl } from "@/lib/image-downscale";
import { captureMealPhoto } from "@/lib/meal-camera";
import { hapticTap } from "@/lib/haptics";
import { analyzeMealPhotoV2 } from "@/lib/analyze-meal.functions";
import { analyzeMealDescription, lookupBarcodeMeal } from "@/lib/quick-meal.functions";
import { fetchRecentMeals, relogMeal, type RecentMeal } from "@/lib/recent-meals";
import { applyOptimisticMealTotals } from "@/lib/optimistic-meal-totals";
import type { AnalyzeMealResult } from "@/lib/analyze-meal.server";
import type { MealConfidence, MealItem, MealSlot } from "@/lib/meal-nutrition";
import { cn } from "@/lib/utils";
import { userFacingErrorMessage } from "@/lib/error-classify";

const CAMERA_TIP_KEY = "doseroutine.mealCameraTipSeen";

/** First-run framing tip — shown once per device before the camera opens. */
export function hasSeenCameraTip(): boolean {
  try {
    return localStorage.getItem(CAMERA_TIP_KEY) === "1";
  } catch {
    return true;
  }
}

export function markCameraTipSeen(): void {
  try {
    localStorage.setItem(CAMERA_TIP_KEY, "1");
  } catch {
    /* private mode — the tip simply shows again next time */
  }
}

type QuickMealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: { value: QuickMealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

/** Meal type for the clock on the user's own device. */
export function mealTypeForHour(hour: number): QuickMealType {
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

function confidenceBand(value: number): MealConfidence {
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

/** Map the analyzer response onto the shared review-sheet draft. */
export function draftFromAnalysis(
  result: AnalyzeMealResult,
  mealType: QuickMealType,
  photoDataUrl: string,
): MealDraft {
  const items: MealItem[] = result.items.map((item) => ({
    name: item.name,
    portion: `${item.grams} g`,
    grams: item.grams,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    fiber_g: item.fiber_g,
    itemConfidence: confidenceBand(item.confidence),
    dataSource: item.nutrition_source === "usda" ? "usda" : "ai",
  }));

  return {
    label: result.meal_name,
    items,
    confidence: confidenceBand(result.confidence),
    note: result.notes,
    source: "photo",
    photoDataUrl,
    slot: mealType as MealSlot,
    estimateItems: items,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a meal is saved so Home can refresh its totals. */
  onSaved?: () => void;
  /**
   * Where to land when the sheet opens. The Food page deep-links straight to
   * the camera or barcode step so its own buttons feel unchanged while every
   * scan now runs through this one sheet.
   */
  initialMode?: "menu" | "camera" | "barcode" | "describe" | "recent";
  /** Overrides the clock-detected meal slot (the Food page adds per slot). */
  slot?: QuickMealType;
};

type Mode = "menu" | "barcode" | "describe" | "recent";

export function QuickAddMealSheet({
  open,
  onOpenChange,
  onSaved,
  initialMode = "menu",
  slot,
}: Props) {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeMealPhotoV2);
  const describeMeal = useServerFn(analyzeMealDescription);
  const lookupBarcode = useServerFn(lookupBarcodeMeal);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const runRef = useRef(0);

  const [mealType, setMealType] = useState<QuickMealType>(() =>
    mealTypeForHour(new Date().getHours()),
  );
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeMealResult | null>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [source, setSource] = useState<"photo" | "barcode" | "text">("photo");
  const [describeText, setDescribeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [relogging, setRelogging] = useState<string | null>(null);
  const [cameraTip, setCameraTip] = useState(false);

  const recentQuery = useQuery({
    queryKey: ["quick-add", "recent-meals"],
    queryFn: fetchRecentMeals,
    enabled: open && mode === "recent",
    staleTime: 60_000,
  });

  // Re-read the clock each time the sheet opens; a session can span mealtimes.
  useEffect(() => {
    if (open) setMealType(slot ?? mealTypeForHour(new Date().getHours()));
  }, [open, slot]);

  const reset = useCallback(() => {
    runRef.current += 1;
    setPhoto(null);
    setAnalyzing(false);
    setError(null);
    setNote("");
    setAnalysis(null);
    setMode("menu");
    setSource("photo");
    setDescribeText("");
    setBusy(false);
    setRelogging(null);
  }, []);

  const runAnalysis = useCallback(
    async (dataUrl: string, userText: string) => {
      const run = (runRef.current += 1);
      setAnalyzing(true);
      setError(null);
      try {
        const res = await analyze({
          data: { image_base64: dataUrl, meal_type: mealType, user_text: userText || null },
        });
        if (run !== runRef.current) return; // a newer run (note added) supersedes this one
        if (!res.ok) {
          setAnalyzing(false);
          setError(
            res.error === "not_food"
              ? "That doesn't look like food. Try another photo, or describe the meal instead."
              : res.message,
          );
          return;
        }
        setAnalyzing(false);
        setAnalysis(res.result);
      } catch (err) {
        if (run !== runRef.current) return;
        setAnalyzing(false);
        setError(userFacingErrorMessage(err, "Something went wrong. Try that photo again."));
      }
    },
    [analyze, mealType],
  );

  const startPhoto = useCallback(async () => {
    hapticTap();
    setCameraTip(false);
    const outcome = await captureMealPhoto();
    if (outcome.kind === "photo") {
      setPhoto(outcome.dataUrl);
      setNote("");
      void runAnalysis(outcome.dataUrl, "");
      return;
    }
    // A tapped-away camera sheet is not an error — leave the menu as it was.
    if (outcome.kind === "cancelled") return;
    if (outcome.kind === "denied") {
      // On iOS the file input can't rescue a denied camera either, so say so
      // and point at the two routes that still work.
      setError(
        "Camera access is off for DoseRoutine. Turn it on in Settings › DoseRoutine › Camera, or log this meal by describing it or scanning its barcode.",
      );
      return;
    }
    // Web (and any shell without the camera plugin): file input with capture.
    fileRef.current?.click();
  }, [runAnalysis]);

  // Deep-link straight into a step when a caller asked for one, so the Food
  // page's "Scan a photo" / "Scan a barcode" buttons behave exactly as before
  // while running through this sheet.
  const openedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    if (initialMode === "camera") void startPhoto();
    else if (initialMode !== "menu") setMode(initialMode);
  }, [open, initialMode, startPhoto]);

  const onFile = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await fileToDownscaledDataUrl(file, 1024, 0.7);
        setPhoto(dataUrl);
        setNote("");
        void runAnalysis(dataUrl, "");
      } catch (err) {
        setError(userFacingErrorMessage(err, "Could not read that photo."));
      }
    },
    [runAnalysis],
  );

  const tiles = useMemo(
    () => [
      {
        key: "photo",
        icon: Camera,
        title: "Scan food",
        hint: "Photo estimate",
        onClick: () => {
          hapticTap();
          setError(null);
          if (!hasSeenCameraTip()) {
            setCameraTip(true);
            return;
          }
          void startPhoto();
        },
      },
      {
        key: "barcode",
        icon: ScanBarcode,
        title: "Scan barcode",
        hint: "Packaged food",
        onClick: () => {
          hapticTap();
          setError(null);
          setMode("barcode");
        },
      },
      {
        key: "describe",
        icon: Keyboard,
        title: "Describe",
        hint: "Type what you ate",
        onClick: () => {
          hapticTap();
          setError(null);
          setMode("describe");
        },
      },
      {
        key: "recent",
        icon: Clock3,
        title: "Recent / Relog",
        hint: "One tap again",
        onClick: () => {
          hapticTap();
          setError(null);
          setMode("recent");
        },
      },
    ],
    [startPhoto],
  );

  const runDescribe = useCallback(async () => {
    const text = describeText.trim();
    if (text.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await describeMeal({ data: { text, meal_type: mealType } });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSource("text");
      setAnalysis(res.result);
    } catch (err) {
      setError(userFacingErrorMessage(err, "Could not read that description."));
    } finally {
      setBusy(false);
    }
  }, [busy, describeMeal, describeText, mealType]);

  const onBarcode = useCallback(
    async (code: string) => {
      setMode("menu");
      setBusy(true);
      setError(null);
      try {
        const res = await lookupBarcode({ data: { barcode: code, meal_type: mealType } });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setSource("barcode");
        setAnalysis(res.result);
      } catch (err) {
        setError(userFacingErrorMessage(err, "Barcode lookup failed."));
      } finally {
        setBusy(false);
      }
    },
    [lookupBarcode, mealType],
  );

  const onRelog = useCallback(
    async (meal: RecentMeal) => {
      if (relogging) return;
      hapticTap();
      setRelogging(meal.key);
      try {
        await relogMeal(meal, mealType);
        applyOptimisticMealTotals(qc, {
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
        });
        void qc.invalidateQueries({ queryKey: ["today-meals"] });
        toast.success(`Added · ${meal.calories} kcal`);
        reset();
        onOpenChange(false);
        onSaved?.();
      } catch (err) {
        toast.error(userFacingErrorMessage(err, "Could not log that meal again."));
      } finally {
        setRelogging(null);
      }
    },
    [mealType, onOpenChange, onSaved, qc, relogging, reset],
  );

  const showCapture = photo !== null;
  const reviewing = analysis !== null;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) reset();
          onOpenChange(next);
        }}
      >
        <SheetContent
          side="bottom"
          className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
        >
          <SheetHeader className="px-5 pb-2 pt-5 text-left">
            <SheetTitle>
              {reviewing
                ? "Review meal"
                : showCapture
                  ? "Analyzing your meal"
                  : mode === "describe"
                    ? "Describe your meal"
                    : mode === "recent"
                      ? "Recent meals"
                      : "Add meal"}
            </SheetTitle>
          </SheetHeader>

          {reviewing ? (
            <QuickMealReview
              result={analysis}
              photoDataUrl={photo}
              source={source}
              mealType={mealType}
              onRetry={reset}
              onClose={() => {
                reset();
                onOpenChange(false);
              }}
              onSaved={() => {
                reset();
                onOpenChange(false);
                onSaved?.();
              }}
            />
          ) : mode === "describe" ? (
            <div className="flex flex-col gap-4 px-5 pb-10">
              <Button
                variant="ghost"
                className="w-fit px-2"
                onClick={() => {
                  setMode("menu");
                  setError(null);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <label htmlFor="quick-meal-describe" className="text-sm text-muted-foreground">
                What did you eat?
              </label>
              <Textarea
                id="quick-meal-describe"
                rows={4}
                value={describeText}
                placeholder="e.g. 2 eggs, 2 toast with butter, black coffee"
                onChange={(e) => setDescribeText(e.target.value)}
              />
              {error && (
                <p role="alert" className="text-sm text-[color:var(--severity-avoid)]">
                  {error}
                </p>
              )}
              <Button
                className="w-full"
                disabled={describeText.trim().length < 3 || busy}
                onClick={() => void runDescribe()}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    <span role="status">Analyzing…</span>
                  </>
                ) : (
                  "Analyze"
                )}
              </Button>
            </div>
          ) : mode === "recent" ? (
            <div className="flex flex-col gap-4 px-5 pb-10">
              <Button
                variant="ghost"
                className="w-fit px-2"
                onClick={() => {
                  setMode("menu");
                  setError(null);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>

              {recentQuery.isLoading ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Loading your meals…
                </p>
              ) : recentQuery.data && recentQuery.data.recent.length > 0 ? (
                <>
                  {recentQuery.data.frequent.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Star className="h-3.5 w-3.5" aria-hidden="true" /> Frequent
                      </h3>
                      <ul className="space-y-2">
                        {recentQuery.data.frequent.map((meal) => (
                          <li key={`frequent-${meal.key}`}>
                            <RecentMealButton
                              meal={meal}
                              busy={relogging === meal.key}
                              onClick={() => void onRelog(meal)}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Recent
                    </h3>
                    <ul className="space-y-2">
                      {recentQuery.data.recent.map((meal) => (
                        <li key={meal.key}>
                          <RecentMealButton
                            meal={meal}
                            busy={relogging === meal.key}
                            onClick={() => void onRelog(meal)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing logged yet — scan or describe a meal and it will show up here.
                </p>
              )}
            </div>
          ) : !showCapture ? (
            <div className="flex flex-col gap-5 px-5 pb-10">
              <div>
                {/* The slot is picked from the clock, not by the user — say so
                    plainly so the chips read as an override, not a chore. */}
                <div className="mb-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {MEAL_TYPES.find((option) => option.value === mealType)?.label ?? "Meal"}
                  </span>{" "}
                  — detected from the time. Tap to change.
                </div>
                <div
                  role="group"
                  aria-label="Meal type"
                  className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-muted/50 p-1"
                >
                  {MEAL_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={mealType === option.value}
                      onClick={() => {
                        hapticTap();
                        setMealType(option.value);
                      }}
                      className={cn(
                        "tap-target rounded-xl px-2 py-2 text-xs font-semibold transition-colors",
                        mealType === option.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-background hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {tiles.map((tile) => (
                  <button
                    key={tile.key}
                    type="button"
                    onClick={tile.onClick}
                    className="flex aspect-square flex-col items-start justify-between rounded-3xl border border-border bg-card p-4 text-left shadow-sm transition-transform active:scale-[0.98] hover:border-primary/40"
                  >
                    <tile.icon className="h-7 w-7 text-primary" aria-hidden="true" />
                    <span>
                      <span className="block font-display text-base font-semibold text-foreground">
                        {tile.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">{tile.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              {busy && (
                <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Looking up that
                  product…
                </p>
              )}

              {error && (
                <p role="alert" className="text-sm text-[color:var(--severity-avoid)]">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="relative flex-1 overflow-hidden bg-black">
                <img
                  src={photo ?? ""}
                  alt="The meal you just photographed"
                  title="The meal you just photographed"
                  width={1024}
                  height={1024}
                  className="h-full w-full object-cover"
                />
                {analyzing && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-5 text-sm font-semibold text-white">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span role="status">Analyzing…</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 border-t border-border bg-background p-5">
                {error ? (
                  <p role="alert" className="text-sm text-[color:var(--severity-avoid)]">
                    {error}
                  </p>
                ) : null}
                <label htmlFor="quick-meal-note" className="block text-xs text-muted-foreground">
                  Add a note (e.g. &ldquo;large portion, extra rice&rdquo;)
                </label>
                <div className="flex gap-2">
                  <Input
                    id="quick-meal-note"
                    value={note}
                    placeholder="large portion, extra rice"
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && note.trim() && photo) {
                        e.preventDefault();
                        void runAnalysis(photo, note.trim());
                      }
                    }}
                  />
                  <Button
                    type="button"
                    disabled={!note.trim() || !photo}
                    onClick={() => photo && void runAnalysis(photo, note.trim())}
                  >
                    {analyzing ? "Redo" : "Apply"}
                  </Button>
                </div>
                {error && photo ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void runAnalysis(photo, note.trim())}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" /> Try again
                  </Button>
                ) : null}
                <Button variant="ghost" className="w-full" onClick={reset}>
                  <X className="mr-2 h-4 w-4" /> Retake or pick another way
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Take a photo of your meal"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onFile(file);
            }}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={cameraTip} onOpenChange={setCameraTip}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Before you shoot</DialogTitle>
            <DialogDescription>
              Fit the whole plate in frame and include a fork or your hand for scale.
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full"
            onClick={() => {
              markCameraTipSeen();
              void startPhoto();
            }}
          >
            Got it — open camera
          </Button>
        </DialogContent>
      </Dialog>

      <BarcodeScanSheet
        open={mode === "barcode"}
        onOpenChange={(next) => setMode(next ? "barcode" : "menu")}
        title="Scan a barcode"
        onDetected={(code) => void onBarcode(code)}
      />
    </>
  );
}

function RecentMealButton({
  meal,
  busy,
  onClick,
}: {
  meal: RecentMeal;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{meal.name}</span>
        <span className="block text-xs text-muted-foreground">
          {meal.calories} kcal · P {meal.protein_g}g · C {meal.carbs_g}g · F {meal.fat_g}g
          {meal.count > 1 ? ` · logged ${meal.count}×` : ""}
        </span>
      </span>
      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
      ) : (
        <RotateCcw className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      )}
    </button>
  );
}
