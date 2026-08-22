import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Dumbbell,
  Flame,
  ListChecks,
  Plus,
  Scale,
  Timer,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { HelpButton } from "@/components/help-button";
import { BodyMetricsPanel } from "@/components/body-metrics-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WorkoutLogSheet,
  readUnitPreference,
  type WorkoutSheetSeed,
} from "@/components/workout-log-sheet";
import {
  currentStreak,
  groupByDay,
  monthDateRange,
  summarize,
  matchesFilter,
  recentDayKeys,
  type CalendarFilter,
  type WorkoutLogRow,
  type WorkoutSetRow,
} from "@/lib/workout-stats";
import {
  distanceUnitLabel,
  formatDuration,
  formatPace,
  fromKg,
  round,
  weightUnitLabel,
  workoutTypeLabel,
} from "@/lib/workout-types";
import { computePersonalRecords, coreLiftRecords } from "@/lib/workout-prs";
import { WorkoutBreakdown } from "@/components/workout-breakdown";
import { contextChips, readTags, summarizeContext } from "@/lib/session-context";
import {
  addMonthsToMonthKey,
  daysInMonthKey,
  firstWeekdayOfMonthKey,
  formatDayKeyLabel,
  formatMonthLabel,
  monthKeyInZone,
  todayKeyInZone,
} from "@/lib/local-calendar";
import { useRoutineRows } from "@/components/today-routine-strip";
import { formatRoutineTime, routineForDay, routineForRange } from "@/lib/routine-schedule";
import { markersForCalendarDay, type DayMarkers } from "@/lib/calendar-day-markers";
import { ExerciseArtThumbnail } from "@/components/exercise-art-lightbox";
import { ScheduledDayWorkouts } from "@/components/scheduled-day-workouts";
import { ExerciseLibraryPanel } from "@/components/exercise-library-panel";
import { WeeklyRoutineSchedule } from "@/components/weekly-routine-schedule";
import { RoutineBackupCard } from "@/components/routine-backup-card";
import { FitnessTipsCard } from "@/components/fitness-tips-card";
import { AddToWorkoutSheet } from "@/components/add-to-workout-sheet";
import { fitnessTips, shouldShowFirstRunGuide } from "@/lib/fitness-tips";
import { useFitnessSignals, EMPTY_SIGNALS } from "@/lib/fitness-signals";
import { isGuideComplete, markGuideComplete } from "@/lib/fitness-prefs";
import { LoadingStatus } from "@/components/skeletons";
import { routeErrorComponent } from "@/components/route-error-panel";
import { skipScheduledWorkoutOccurrence } from "@/lib/quick-add-workout";
import type { PlannedSession } from "@/lib/planned-day-exercises";
import type { WorkoutTemplate } from "@/lib/workout-templates";

type FitnessView = "workout" | "routine" | "exercises" | "body";
type FitnessSearch = { day?: string; workout?: string; routine?: string; view?: FitnessView };

/** Accepts the older "workouts" value so saved links keep working. */
function readView(value: unknown): FitnessView | undefined {
  if (value === "workouts") return "workout";
  if (value === "workout" || value === "routine" || value === "exercises" || value === "body") {
    return value;
  }
  return undefined;
}

export const Route = createFileRoute("/_authenticated/fitness")({
  errorComponent: routeErrorComponent("fitness"),
  validateSearch: (search: Record<string, unknown>): FitnessSearch => ({
    day:
      typeof search.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.day)
        ? search.day
        : undefined,
    workout: typeof search.workout === "string" && search.workout ? search.workout : undefined,
    routine: typeof search.routine === "string" && search.routine ? search.routine : undefined,
    view: readView(search.view),
  }),
  head: () => ({
    meta: [
      { title: "Fitness & Body — DoseRoutine" },
      {
        name: "description",
        content:
          "Log strength and cardio sessions, track weight and measurements, and watch your training calendar fill in.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FitnessPage,
});

const FILTERS: { key: CalendarFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Done" },
  { key: "planned", label: "Planned" },
  { key: "strength", label: "Strength" },
  { key: "cardio", label: "Cardio" },
  { key: "mindbody", label: "Mind & body" },
  { key: "sport", label: "Sport" },
  { key: "other", label: "Other" },
];

const FAMILY_DOT_CLASS: Record<string, string> = {
  strength: "bg-primary",
  cardio: "bg-[color:var(--streak,#B45309)]",
  mindbody: "bg-primary/50",
  sport: "bg-foreground/70",
  other: "bg-muted-foreground",
  meal: "bg-foreground/40",
};

const MEALS_STORAGE_KEY = "doseroutine.fitness.showMeals";

/**
 * One calendar cell's dot row, following the Google/Apple Calendar convention:
 * at most three dots, color-coded by category, solid when the thing was completed
 * and hollow while it is only planned, then a "+n" count for the rest.
 */
function DayMarkerDots({ markers }: { markers: DayMarkers }) {
  return (
    <span className="mt-0.5 flex h-1.5 items-center gap-0.5" aria-hidden="true">
      {markers.dots.map((dot, i) => (
        <span
          key={`${dot.family}-${dot.kind}-${i}`}
          className={`h-1.5 w-1.5 rounded-full ${
            dot.kind === "logged"
              ? (FAMILY_DOT_CLASS[dot.family] ?? "bg-muted-foreground")
              : `border border-current bg-transparent ${
                  dot.family === "meal" ? "text-foreground/50" : "text-primary/70"
                }`
          }`}
        />
      ))}
      {markers.overflow > 0 && (
        <span className="text-[8px] leading-none text-muted-foreground">+{markers.overflow}</span>
      )}
    </span>
  );
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const VIEW_STORAGE_KEY = "doseroutine.fitness.view";

const TABS: { key: FitnessView; label: string; Icon: typeof Dumbbell }[] = [
  { key: "workout", label: "Log", Icon: Dumbbell },
  { key: "routine", label: "Weekly plan", Icon: CalendarDays },
  { key: "exercises", label: "Exercises", Icon: ListChecks },
  { key: "body", label: "Body", Icon: Scale },
];

const TAB_HINT: Record<FitnessView, string> = {
  workout: "Log what you actually did today, and see it fill in your calendar.",
  routine: "Set the sessions that repeat every week — tap a day to add one.",
  exercises: "Search the exercise library and add moves straight to a routine.",
  body: "Track weight, measurements and photos so you can see the trend.",
};

function FitnessPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const view: FitnessView = search.view ?? "workout";
  const restored = useRef(false);

  // Open the Fitness page on the Workout tab by default.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (search.view) return;
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, "workout");
    } catch {
      // Storage unavailable — best-effort only.
    }
    navigate({
      to: "/fitness",
      search: (prev: FitnessSearch) => ({ ...prev, view: "workout" as const }),
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectView(next: FitnessView) {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Best-effort only.
    }
    navigate({
      to: "/fitness",
      search: (prev: FitnessSearch) => ({ ...prev, view: next }),
      replace: true,
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 overflow-x-hidden p-4 pb-28 lg:max-w-5xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fitness &amp; Body</h1>
          <p className="text-sm text-muted-foreground">
            Training alongside your stack — sessions, and how your body is responding.
          </p>
        </div>
        <HelpButton articleKey={view === "body" ? "bodyMetrics" : "fitness"} />
      </header>

      <div
        role="tablist"
        aria-label="Fitness sections"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => selectView(key)}
            className={`tap-target flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
              view === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* One plain-English line so a first-time user knows what this tab is for. */}
      <p className="px-1 text-xs text-muted-foreground">{TAB_HINT[view]}</p>

      {view === "body" ? (
        <BodyMetricsPanel />
      ) : view === "routine" ? (
        <RoutinePanel initialOpenId={search.routine} selectedDay={search.day} />
      ) : view === "exercises" ? (
        <ExerciseLibraryPanel
          todayKey={todayKeyInZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}
        />
      ) : (
        <WorkoutsPanel />
      )}
    </div>
  );
}

function WorkoutsPanel() {
  const qc = useQueryClient();
  const units = readUnitPreference();

  const { data: zone = "UTC" } = useQuery({
    queryKey: ["fitness-zone"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return "UTC";
      const { data: prof } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userRes.user.id)
        .maybeSingle();
      return prof?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    },
    staleTime: 10 * 60_000,
  });

  const todayKey = todayKeyInZone(zone);
  const [monthKey, setMonthKey] = useState(() => monthKeyInZone(new Date(), zone));
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  // Meals are a separate row in the day panel; remember the user's choice.
  const [showMeals, setShowMeals] = useState(true);
  useEffect(() => {
    try {
      setShowMeals(localStorage.getItem(MEALS_STORAGE_KEY) !== "0");
    } catch {
      /* private mode */
    }
  }, []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [seed, setSeed] = useState<WorkoutSheetSeed>({ dayKey: todayKey, status: "completed" });

  const workouts = useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("workout_logs")
        .select("*")
        .order("performed_on", { ascending: false })
        .limit(600);
      if (error) throw error;
      const { data: sets, error: setsError } = await supabase
        .from("workout_sets")
        .select("*")
        .order("set_index", { ascending: true });
      if (setsError) throw setsError;
      return {
        logs: (logs ?? []) as WorkoutLogRow[],
        sets: (sets ?? []) as WorkoutSetRow[],
      };
    },
  });

  const signalsQuery = useFitnessSignals();
  const signals = signalsQuery.data ?? EMPTY_SIGNALS;
  const [guideDone, setGuideDone] = useState(true);
  useEffect(() => {
    setGuideDone(isGuideComplete());
  }, []);

  const logs = useMemo(() => workouts.data?.logs ?? [], [workouts.data]);
  const sets = useMemo(() => workouts.data?.sets ?? [], [workouts.data]);

  const byDay = useMemo(() => groupByDay(logs, filter), [logs, filter]);
  const monthRange = monthDateRange(monthKey);
  const monthLogs = useMemo(
    () => logs.filter((l) => l.performed_on >= monthRange.start && l.performed_on < monthRange.end),
    [logs, monthRange.start, monthRange.end],
  );
  const last7 = useMemo(() => {
    const keys = new Set(recentDayKeys(todayKey, 7));
    return logs.filter((l) => keys.has(l.performed_on));
  }, [logs, todayKey]);

  // The calendar filter also scopes the breakdown below it, so "Cardio" shows
  // only cardio totals.
  const breakdownLogs = useMemo(
    () => monthLogs.filter((l) => matchesFilter(l, filter)),
    [monthLogs, filter],
  );

  const weekSummary = summarize(last7, sets, units);
  const monthSummary = summarize(monthLogs, sets, units);
  const weekContext = useMemo(() => summarizeContext(last7), [last7]);
  const monthContext = useMemo(() => summarizeContext(monthLogs), [monthLogs]);
  const streak = currentStreak(logs, todayKey);
  const prs = useMemo(
    () =>
      computePersonalRecords(
        logs,
        sets.map((s) => ({
          exercise: s.exercise,
          reps: s.reps,
          weight_kg: s.weight_kg,
          workout_log_id: s.workout_log_id,
        })),
      ),
    [logs, sets],
  );
  const corePrs = coreLiftRecords(prs);

  const daysInMonth = daysInMonthKey(monthKey);
  const leadingBlanks = firstWeekdayOfMonthKey(monthKey);

  // Recurring workout/meal anchors, for the whole visible month. The grid needs
  // these so a fully planned month stops rendering as empty cells.
  const routineRows = useRoutineRows();
  const monthDayKeys = useMemo(
    () =>
      Array.from(
        { length: daysInMonth },
        (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`,
      ),
    [daysInMonth, monthKey],
  );
  const monthRoutine = useMemo(
    () =>
      routineForRange(
        routineRows.data?.workouts ?? [],
        routineRows.data?.meals ?? [],
        monthDayKeys,
        zone,
      ),
    [routineRows.data, monthDayKeys, zone],
  );

  /**
   * Every cell's derived data (tags, context chips, notes flag) computed once
   * per month/filter change. Doing it inline per cell re-ran tag parsing on
   * every render — 31 cells x N logs of string work on the main thread.
   */
  const monthCells = useMemo(
    () =>
      monthDayKeys.map((dayKey, i) => {
        const bucket = byDay.get(dayKey);
        const dayLogs = bucket?.logs ?? [];
        const dayTags = dayLogs.flatMap((l) => readTags(l.tags));
        const dayChips = dayLogs.flatMap((l) => contextChips(l));
        return {
          dayKey,
          dayNumber: i + 1,
          bucket,
          dayTags,
          hasNotes: dayLogs.some((l) => (l.notes ?? "").trim() !== ""),
          contextHint: [...dayChips, ...dayTags].join(" · "),
          count: dayLogs.length,
          markers: markersForCalendarDay({
            loggedFamilies: bucket?.families ?? [],
            occurrences: monthRoutine.get(dayKey) ?? [],
          }),
        };
      }),
    [byDay, monthDayKeys, monthRoutine],
  );

  const selectedBucket = byDay.get(selectedDay);
  const selectedSets = useMemo(() => {
    const ids = new Set((selectedBucket?.logs ?? []).map((l) => l.id));
    return sets.filter((s) => ids.has(s.workout_log_id));
  }, [selectedBucket, sets]);

  // Recurring workout/meal anchors that fall on the selected calendar day.

  const dayRoutine = useMemo(
    () =>
      routineForDay(
        routineRows.data?.workouts ?? [],
        routineRows.data?.meals ?? [],
        selectedDay,
        zone,
      ),
    [routineRows.data, selectedDay, zone],
  );
  const scheduledWorkoutCount = dayRoutine.filter((item) => item.kind === "workout").length;

  const wLabel = weightUnitLabel(units);
  const dLabel = distanceUnitLabel(units);

  function openSheet(next: WorkoutSheetSeed) {
    setSeed(next);
    setSheetOpen(true);
  }

  // Deep link from a reminder / notification: /fitness?day=…&workout=…
  const search = Route.useSearch();
  const navigate = useNavigate();
  const handledDeepLink = useRef<string | null>(null);
  useEffect(() => {
    if (search.day) setSelectedDay(search.day);
    if (!search.workout || workouts.isLoading) return;
    if (handledDeepLink.current === search.workout) return;
    const log = logs.find((l) => l.id === search.workout);
    if (!log) return;
    handledDeepLink.current = search.workout;
    setSelectedDay(log.performed_on);
    openSheet({
      dayKey: log.performed_on,
      status: (log.status as WorkoutSheetSeed["status"]) ?? "planned",
      log,
      sets: sets.filter((s) => s.workout_log_id === log.id),
    });
    navigate({
      to: "/fitness",
      search: { day: log.performed_on, view: "workout" },
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.day, search.workout, workouts.isLoading, logs, sets]);

  async function deleteLog(id: string) {
    await supabase.from("workout_logs").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["workouts"] });
  }

  async function markCompleted(log: WorkoutLogRow) {
    await supabase.from("workout_logs").update({ status: "completed" }).eq("id", log.id);
    qc.invalidateQueries({ queryKey: ["workouts"] });
  }

  return (
    <div className="space-y-4">
      {/* Primary action, the way Strong/Hevy do it: one obvious way in. */}
      <button
        type="button"
        onClick={() => openSheet({ dayKey: todayKey, status: "completed" })}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
      >
        <Plus className="h-4 w-4" />
        Start workout
      </button>
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/fitness"
          search={{ view: "routine" }}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-center text-xs font-medium hover:bg-muted"
        >
          Weekly plan
        </Link>
        <Link
          to="/fitness"
          search={{ view: "exercises" }}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-center text-xs font-medium hover:bg-muted"
        >
          Browse exercises
        </Link>
      </div>

      <FitnessTipsCard
        tips={fitnessTips("workout", signals)}
        onAction={() => openSheet({ dayKey: todayKey, status: "completed" })}
      />

      {/* First run: spell out the three steps, until they stop being relevant. */}
      {!workouts.isLoading &&
        !signalsQuery.isLoading &&
        shouldShowFirstRunGuide(signals, guideDone) && (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold">New here? Start with these three</h2>
              <button
                type="button"
                onClick={() => {
                  markGuideComplete();
                  setGuideDone(true);
                }}
                className="shrink-0 text-[11px] font-medium text-muted-foreground underline"
              >
                Got it
              </button>
            </div>
            <ol className="mt-3 space-y-2.5">
              <GuideStep
                step={1}
                title="Log today's workout"
                body="Tap Start workout above — you can add exercises, sets and how it felt."
                action={
                  <button
                    type="button"
                    onClick={() => openSheet({ dayKey: todayKey, status: "completed" })}
                    className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
                  >
                    Log
                  </button>
                }
              />
              <GuideStep
                step={2}
                title="Pick your exercises"
                body="Search the library by muscle, equipment or difficulty and add them to a routine."
                action={
                  <Link
                    to="/fitness"
                    search={{ view: "exercises" }}
                    className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium"
                  >
                    Browse
                  </Link>
                }
              />
              <GuideStep
                step={3}
                title="Set your weekly plan"
                body="Choose which days you train so reminders and your calendar stay ahead of you."
                action={
                  <Link
                    to="/fitness"
                    search={{ view: "routine" }}
                    className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium"
                  >
                    Plan
                  </Link>
                }
              />
            </ol>
          </Card>
        )}

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<Flame className="h-4 w-4 text-[color:var(--streak,#B45309)]" />}
          label="Streak"
          value={`${streak}d`}
        />
        <StatCard
          icon={<Dumbbell className="h-4 w-4 text-primary" />}
          label="7-day sessions"
          value={String(weekSummary.sessions)}
        />
        <StatCard
          icon={<Timer className="h-4 w-4 text-primary" />}
          label="7-day time"
          value={formatDuration(weekSummary.minutes)}
        />
      </div>

      {/* How the last 7 days actually felt */}
      {(weekContext.rpe != null ||
        weekContext.sleep != null ||
        weekContext.stress != null ||
        weekContext.topTags.length > 0) && (
        <Card className="flex flex-wrap items-center gap-1.5 p-3">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Last 7 days
          </span>
          {weekContext.rpe != null && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              Avg RPE {weekContext.rpe}
            </span>
          )}
          {weekContext.sleep != null && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              Avg sleep {weekContext.sleep}/5
            </span>
          )}
          {weekContext.stress != null && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              Avg stress {weekContext.stress}/5
            </span>
          )}
          {weekContext.topTags.map(({ tag, count }) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
            >
              {tag} ×{count}
            </span>
          ))}
        </Card>
      )}

      {/* Calendar */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            aria-label="Previous month"
            onClick={() => setMonthKey((m) => addMonthsToMonthKey(m, -1))}
            className="tap-target rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold">{formatMonthLabel(monthKey, zone)}</h2>
          <button
            aria-label="Next month"
            onClick={() => setMonthKey((m) => addMonthsToMonthKey(m, 1))}
            className="tap-target rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {workouts.isLoading ? (
          <div aria-busy="true">
            <LoadingStatus label="Loading your workout calendar…" />
            <Skeleton aria-hidden="true" className="h-56 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={`${d}-${i}`}>{d}</div>
              ))}
            </div>
            <div
              className="mt-1 grid grid-cols-7 gap-1"
              // Skip layout/paint for the grid while it is scrolled out of
              // view; the reserved size keeps the scrollbar honest.
              style={{ contentVisibility: "auto", containIntrinsicSize: "auto 260px" }}
            >
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {monthCells.map((cell) => {
                const { dayKey, dayTags, hasNotes, contextHint, markers } = cell;
                const isToday = dayKey === todayKey;
                const isSelected = dayKey === selectedDay;
                const hasPlans = markers.total > 0;
                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDay(dayKey)}
                    title={contextHint || undefined}
                    data-day={dayKey}
                    data-has-plans={hasPlans ? "true" : "false"}
                    aria-label={`${dayKey}, ${markers.label}${
                      contextHint ? `, ${contextHint}` : ""
                    }${hasNotes ? ", has notes" : ""}`}
                    aria-pressed={isSelected}
                    className={`tap-target flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-semibold"
                        : isToday
                          ? "border-primary/50"
                          : hasPlans
                            ? "border-border/70 hover:bg-muted"
                            : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <span className="relative">
                      {cell.dayNumber}
                      {(hasNotes || dayTags.length > 0) && (
                        <span
                          aria-hidden
                          className="absolute -right-2 -top-0.5 text-[9px] leading-none text-muted-foreground"
                        >
                          {dayTags.length > 0 ? "#" : "•"}
                        </span>
                      )}
                    </span>
                    <DayMarkerDots markers={markers} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          This month: {monthSummary.sessions} sessions · {formatDuration(monthSummary.minutes)}
          {monthSummary.distanceUnitValue > 0 &&
            ` · ${round(monthSummary.distanceUnitValue, 1)} ${dLabel}`}
          {monthSummary.volumeKg > 0 &&
            ` · ${Math.round(fromKg(monthSummary.volumeKg, units)).toLocaleString()} ${wLabel} volume`}
          {monthContext.rpe != null && ` · avg RPE ${monthContext.rpe}`}
          {monthContext.sleep != null && ` · avg sleep ${monthContext.sleep}/5`}
          {monthContext.stress != null && ` · avg stress ${monthContext.stress}/5`}
          {monthContext.topTags.length > 0 &&
            ` · ${monthContext.topTags.map((t) => `${t.tag} ×${t.count}`).join(", ")}`}
        </div>
      </Card>

      {/* Selected day */}
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{formatDayKeyLabel(selectedDay, zone)}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !showMeals;
                setShowMeals(next);
                try {
                  localStorage.setItem(MEALS_STORAGE_KEY, next ? "1" : "0");
                } catch {
                  /* private mode */
                }
              }}
              aria-pressed={showMeals}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                showMeals
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {showMeals ? "Hide meals" : "Show meals"}
            </button>
            <Link
              to="/fitness"
              search={{ day: selectedDay, view: "routine" }}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Plan routine
            </Link>
            <button
              onClick={() => openSheet({ dayKey: selectedDay, status: "completed" })}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Log
            </button>
          </div>
        </div>

        <ScheduledDayWorkouts
          occurrences={dayRoutine}
          units={units}
          showMeals={showMeals}
          isLoading={routineRows.isLoading}
          completedTitles={(selectedBucket?.logs ?? [])
            .filter((log) => log.status === "completed")
            .map((log) => log.title ?? "")}
          onStart={(_session: PlannedSession, template: WorkoutTemplate) =>
            openSheet({ dayKey: selectedDay, status: "completed", template })
          }
          onEdit={(session: PlannedSession, template: WorkoutTemplate | null) => {
            if (template) {
              openSheet({
                dayKey: selectedDay,
                status: "completed",
                template,
                editTemplateOnly: true,
              });
              return;
            }
            navigate({
              to: "/fitness",
              search: { day: selectedDay, view: "routine", routine: session.sessionId },
            });
          }}
          onRemove={(session: PlannedSession) => {
            void skipScheduledWorkoutOccurrence(session.sessionId, selectedDay).then(() => {
              void qc.invalidateQueries({ queryKey: ["today-routine"] });
            });
          }}
        />

        {(selectedBucket?.logs?.length ?? 0) === 0 && scheduledWorkoutCount === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Nothing logged for this day yet.</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              Log what you did, or plan a session ahead of time so it shows on your calendar.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => openSheet({ dayKey: selectedDay, status: "completed" })}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Log a workout
              </button>
              <Link
                to="/fitness"
                search={{ view: "routine" }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Plan a routine
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {(selectedBucket?.logs ?? []).map((log) => {
              const logSets = selectedSets.filter((s) => s.workout_log_id === log.id);
              return (
                <li key={log.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {log.title?.trim() || workoutTypeLabel(log.workout_type)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {workoutTypeLabel(log.workout_type)}
                        {log.duration_min ? ` · ${formatDuration(log.duration_min)}` : ""}
                        {log.distance_m
                          ? ` · ${round(log.distance_m / (units === "imperial" ? 1609.344 : 1000), 2)} ${dLabel}`
                          : ""}
                        {log.avg_pace_s ? ` · ${formatPace(log.avg_pace_s)}/${dLabel}` : ""}
                        {log.avg_hr ? ` · ${Math.round(log.avg_hr)} bpm` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusPill status={log.status} />
                      <button
                        aria-label="Delete workout"
                        onClick={() => deleteLog(log.id)}
                        className="tap-target rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {logSets.length > 0 && (
                    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                      {logSets.map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <ExerciseArtThumbnail
                            exercise={(s.exercise ?? "").trim()}
                            size={36}
                            className="h-9 w-9 rounded-md"
                          />
                          <span className="min-w-0">
                            {s.exercise}
                            {s.sets && s.reps ? ` — ${s.sets}×${round(s.reps)}` : ""}
                            {s.weight_kg
                              ? ` @ ${round(fromKg(s.weight_kg, units), 1)} ${wLabel}`
                              : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {(contextChips(log).length > 0 || readTags(log.tags).length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {contextChips(log).map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {chip}
                        </span>
                      ))}
                      {readTags(log.tags).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {log.notes && <p className="mt-2 text-xs text-muted-foreground">{log.notes}</p>}

                  <div className="mt-2 flex gap-2">
                    {log.status === "planned" && (
                      <button
                        onClick={() => markCompleted(log)}
                        className="rounded-lg border border-primary px-2.5 py-1 text-[11px] font-medium text-primary"
                      >
                        Mark done
                      </button>
                    )}
                    <button
                      onClick={() =>
                        openSheet({
                          dayKey: log.performed_on,
                          status: (log.status as WorkoutSheetSeed["status"]) ?? "completed",
                          log,
                          sets: logSets,
                        })
                      }
                      className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      Edit
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Personal records */}
      {prs.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Personal records</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Best estimated one-rep max from your completed strength sessions.
          </p>
          <ul className="space-y-1.5">
            {prs.slice(0, 8).map((pr) => (
              <li key={pr.key} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {pr.exercise}
                  {coreLiftIsTracked(pr.key, corePrs) && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      core lift
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-medium">
                  {round(fromKg(pr.oneRepMaxKg, units))} {wLabel}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <WorkoutBreakdown
        logs={breakdownLogs}
        sets={sets}
        units={units}
        windowLabel={formatMonthLabel(monthKey, zone)}
      />

      <Link
        to="/booty-workout"
        className="block rounded-xl border border-border bg-card p-4 hover:bg-muted"
      >
        <p className="text-sm font-semibold">10-Minute Booty Workout</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Guided timer · 8 no-equipment glute moves for women with anatomy illustrations
        </p>
      </Link>

      {/* Floating log button */}
      <button
        onClick={() => openSheet({ dayKey: todayKey, status: "completed" })}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="Log a workout"
      >
        <Plus className="h-6 w-6" />
      </button>

      <WorkoutLogSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        seed={seed}
        onSaved={() => qc.invalidateQueries({ queryKey: ["workouts"] })}
      />
    </div>
  );
}

function coreLiftIsTracked(key: string, core: ReturnType<typeof coreLiftRecords>): boolean {
  return Object.values(core).some((record) => record?.key === key);
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "completed"
      ? "bg-[color:var(--severity-synergy-bg)] text-[color:var(--severity-synergy)]"
      : status === "planned"
        ? "bg-[color:var(--severity-note-bg)] text-[color:var(--severity-note)]"
        : "bg-muted text-muted-foreground";
  const label = status === "completed" ? "Done" : status === "planned" ? "Planned" : "Skipped";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles}`}>{label}</span>
  );
}

/** One numbered "what to do next" row in the first-run guide. */
function GuideStep({
  step,
  title,
  body,
  action,
}: {
  step: number;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

/** Recurring training only — the weekly plan, promoted out of the page tail. */
function RoutinePanel({
  initialOpenId,
  selectedDay,
}: {
  initialOpenId?: string;
  selectedDay?: string;
}) {
  const qc = useQueryClient();
  const routineRows = useRoutineRows();
  const hasSessions = (routineRows.data?.workouts ?? []).some((row) => row.active !== false);
  const signals = useFitnessSignals().data ?? EMPTY_SIGNALS;
  const [planOpen, setPlanOpen] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState<WorkoutTemplate | null>(null);
  const editorDay = selectedDay ?? todayKeyInZone(Intl.DateTimeFormat().resolvedOptions().timeZone);

  return (
    <div className="space-y-4">
      <FitnessTipsCard tips={fitnessTips("routine", signals)} onAction={() => setPlanOpen(true)} />
      <AddToWorkoutSheet
        open={planOpen}
        onOpenChange={setPlanOpen}
        initialWeekday={new Date().getDay()}
      />
      <WorkoutLogSheet
        open={editorTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setEditorTemplate(null);
        }}
        seed={{
          dayKey: editorDay,
          status: "completed",
          ...(editorTemplate ? { template: editorTemplate, editTemplateOnly: true } : {}),
        }}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["workout-templates"] });
          void qc.invalidateQueries({ queryKey: ["today-routine"] });
        }}
      />
      {!routineRows.isLoading && !hasSessions && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold">No weekly plan yet</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A weekly plan is the days you intend to train. Tap the + next to a day below to add a
            session, or start from an exercise you like.
          </p>
          <Link
            to="/fitness"
            search={{ view: "exercises" }}
            className="mt-3 inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Browse exercises
          </Link>
        </Card>
      )}
      <RoutineBackupCard />
      <WeeklyRoutineSchedule onEditRoutine={setEditorTemplate} />
      <p className="px-1 text-xs text-muted-foreground">
        Looking for meal times? They now live on the Food tab, under Times.
      </p>
    </div>
  );
}
