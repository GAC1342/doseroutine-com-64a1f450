/**
 * Home "Today" card — calorie ring, macro bars, and today's meals.
 *
 * The ring shows calories remaining against the daily target; the three bars
 * cover protein, carbs and fat. Below, today's meals are grouped by meal type
 * in the order they were eaten. Tapping a meal opens the Quick Add review
 * sheet in edit mode; swiping a row left (or the trash button) removes it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { cachedMealThumbUrl, mealThumbUrl, prefetchMealThumbs } from "@/lib/meal-thumb-cache";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QuickMealReview } from "@/components/quick-meal-review";
import { hapticTap, hapticWarning } from "@/lib/haptics";
import { dayKeyOf } from "@/lib/macro-progress";
import {
  analysisFromMeal,
  deleteMeal,
  fetchTodayMeals,
  groupMeals,
  sumMeals,
  type TodayMealRow,
} from "@/lib/today-meals";
import { cn } from "@/lib/utils";
import { userFacingErrorMessage } from "@/lib/error-classify";

const RING_SIZE = 132;
const RING_STROKE = 12;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MACRO_BARS = [
  { key: "protein_g", label: "Protein", color: "var(--primary)" },
  { key: "carbs_g", label: "Carbs", color: "var(--severity-caution, #B45309)" },
  { key: "fat_g", label: "Fat", color: "var(--severity-note, #6366f1)" },
] as const;

function formatTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function TodayMealsCard({ className = "" }: { className?: string }) {
  const qc = useQueryClient();
  const day = dayKeyOf(new Date());
  const [editing, setEditing] = useState<TodayMealRow | null>(null);
  const [editPhoto, setEditPhoto] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["today-meals", day],
    queryFn: () => fetchTodayMeals(day),
    staleTime: 30_000,
  });

  const meals = useMemo(() => query.data?.meals ?? [], [query.data]);
  const totals = useMemo(() => sumMeals(meals), [meals]);
  const groups = useMemo(() => groupMeals(meals), [meals]);
  const targets = query.data?.targets;

  // Sign and warm every thumbnail for today in one batch as soon as the rows
  // arrive, so re-opening Today paints photos with no round-trip.
  useEffect(() => {
    if (meals.length === 0) return;
    void prefetchMealThumbs(meals.map((m) => m.storagePath));
  }, [meals]);

  const openEdit = useCallback(async (meal: TodayMealRow) => {
    hapticTap();
    setEditPhoto(null);
    setEditing(meal);
    const url = await mealThumbUrl(meal.storagePath);
    setEditPhoto(url);
  }, []);

  const remove = useCallback(
    async (meal: TodayMealRow) => {
      try {
        await deleteMeal(meal.id);
        void hapticWarning();
        toast.success(`Removed ${meal.name}`);
        void qc.invalidateQueries({ queryKey: ["today-meals"] });
        void qc.invalidateQueries({ queryKey: ["macro-progress"] });
      } catch (err) {
        toast.error(userFacingErrorMessage(err, "Could not remove that meal."));
      }
    },
    [qc],
  );

  if (query.isPending) {
    return (
      <section className={cn("rounded-2xl bg-card p-4", className)} aria-label="Today's food">
        <Skeleton className="h-4 w-24" />
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="h-[132px] w-[132px] rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
        <Skeleton className="mt-4 h-14 w-full" />
        <Skeleton className="mt-2 h-14 w-full" />
        <p role="status" className="sr-only">
          Loading today&rsquo;s food
        </p>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className={cn("rounded-2xl bg-card p-4", className)} aria-label="Today's food">
        <h2 className="text-sm font-semibold">Today</h2>
        <p role="alert" className="mt-2 text-sm text-muted-foreground">
          We couldn&rsquo;t load today&rsquo;s food. Check your connection and try again.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            hapticTap();
            void query.refetch();
          }}
        >
          {query.isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Retry
        </Button>
      </section>
    );
  }

  const calorieTarget = targets?.calories ?? null;
  const remaining = calorieTarget ? Math.max(0, Math.round(calorieTarget - totals.calories)) : null;
  const pct = calorieTarget ? Math.min(1, totals.calories / calorieTarget) : 0;
  const over = calorieTarget ? totals.calories > calorieTarget : false;

  return (
    <section className={cn("rounded-2xl bg-card p-4", className)} aria-label="Today's food">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <UtensilsCrossed className="h-4 w-4 text-primary" aria-hidden="true" />
          Today
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {meals.length} meal{meals.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-5">
        <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            role="img"
            aria-label={
              calorieTarget
                ? `${totals.calories} of ${Math.round(calorieTarget)} calories eaten`
                : `${totals.calories} calories eaten today`
            }
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={RING_STROKE}
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={over ? "var(--severity-avoid)" : "var(--primary)"}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              style={{ transition: "stroke-dashoffset 400ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {calorieTarget ? (
              <>
                <span className="text-2xl font-semibold tabular-nums leading-none">
                  {remaining}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  {over ? "over" : "remaining"}
                </span>
                <span className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                  {totals.calories} / {Math.round(calorieTarget)}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-semibold tabular-nums leading-none">
                  {totals.calories}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">kcal today</span>
              </>
            )}
          </div>
        </div>

        <div className="min-w-[160px] flex-1 space-y-3">
          {MACRO_BARS.map((bar) => {
            const value = totals[bar.key];
            const target = targets?.[bar.key] ?? null;
            const barPct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
            return (
              <div key={bar.key}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{bar.label}</span>
                  <span className="font-semibold tabular-nums">
                    {value}g{target ? ` / ${Math.round(target)}g` : ""}
                  </span>
                </div>
                <div
                  className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={`${bar.label} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={barPct ?? 0}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${barPct ?? (value > 0 ? 100 : 0)}%`,
                      backgroundColor: bar.color,
                      opacity: target ? 1 : 0.35,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {!targets?.calories && (
            <p className="text-[11px] text-muted-foreground">
              Set daily targets in Food to see what&rsquo;s remaining.
            </p>
          )}
        </div>
      </div>

      {meals.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing logged yet today — tap the + button to scan or describe a meal.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{group.label}</span>
                <span className="tabular-nums">{sumMeals(group.meals).calories} kcal</span>
              </h3>
              <ul className="space-y-2">
                {group.meals.map((meal) => (
                  <MealRow
                    key={meal.id}
                    meal={meal}
                    onOpen={() => void openEdit(meal)}
                    onDelete={() => void remove(meal)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) {
            setEditing(null);
            setEditPhoto(null);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="flex h-[100dvh] max-h-[100dvh] w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
        >
          <SheetHeader className="px-5 pb-2 pt-5 text-left">
            <SheetTitle>Edit meal</SheetTitle>
          </SheetHeader>
          {editing && (
            <QuickMealReview
              result={analysisFromMeal(editing)}
              photoDataUrl={editPhoto}
              mealType={editing.mealType}
              source={editing.source ?? "photo"}
              mealId={editing.id}
              onRetry={() => {
                setEditing(null);
                setEditPhoto(null);
              }}
              onClose={() => {
                setEditing(null);
                setEditPhoto(null);
              }}
              onSaved={() => {
                setEditing(null);
                setEditPhoto(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

/** One meal, with a left-swipe reveal for delete on touch devices. */
function MealRow({
  meal,
  onOpen,
  onDelete,
}: {
  meal: TodayMealRow;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  // Paint straight from the cache on repeat opens; only sign when we must.
  const [thumb, setThumb] = useState<string | null>(() => cachedMealThumbUrl(meal.storagePath));

  useEffect(() => {
    let alive = true;
    const cached = cachedMealThumbUrl(meal.storagePath);
    if (cached) {
      setThumb(cached);
      return;
    }
    setThumb(null);
    void mealThumbUrl(meal.storagePath).then((url) => {
      if (alive) setThumb(url);
    });
    return () => {
      alive = false;
    };
  }, [meal.storagePath]);

  return (
    <li className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-[color:var(--severity-avoid)]/15">
        <button
          type="button"
          aria-label={`Delete ${meal.name}`}
          onClick={onDelete}
          className="tap-target text-[color:var(--severity-avoid)]"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpen}
        onTouchStart={(e) => {
          startX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchMove={(e) => {
          if (startX.current === null) return;
          const dx = (e.touches[0]?.clientX ?? 0) - startX.current;
          setOffset(Math.max(-80, Math.min(0, dx)));
        }}
        onTouchEnd={() => {
          setOffset((prev) => (prev < -40 ? -80 : 0));
          startX.current = null;
        }}
        style={{ transform: `translateX(${offset}px)` }}
        className="relative flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-transform"
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            title={meal.name}
            width={48}
            height={48}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{meal.name}</span>
          <span className="block text-xs text-muted-foreground">
            {formatTime(meal.loggedAt)} · P {meal.protein_g}g · C {meal.carbs_g}g · F {meal.fat_g}g
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{meal.calories} kcal</span>
      </button>
    </li>
  );
}
