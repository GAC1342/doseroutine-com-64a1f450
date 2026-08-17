import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
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
import { RoutinePlannerCard } from "@/components/routine-planner-card";
import { useRoutineRows } from "@/components/today-routine-strip";
import { formatRoutineTime, routineForDay } from "@/lib/routine-schedule";
import { ExerciseArtThumbnail } from "@/components/exercise-art-lightbox";

type FitnessView = "workouts" | "body";
type FitnessSearch = { day?: string; workout?: string; view?: FitnessView };

export const Route = createFileRoute("/_authenticated/fitness")({
  validateSearch: (search: Record<string, unknown>): FitnessSearch => ({
    day:
      typeof search.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.day)
        ? search.day
        : undefined,
    workout: typeof search.workout === "string" && search.workout ? search.workout : undefined,
    view: search.view === "body" ? "body" : search.view === "workouts" ? "workouts" : undefined,
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
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const VIEW_STORAGE_KEY = "doseroutine.fitness.view";

function FitnessPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const view: FitnessView = search.view ?? "workouts";
  const restored = useRef(false);

  // Open the Fitness page on the Workouts tab by default.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (search.view) return;
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, "workouts");
    } catch {
      // Storage unavailable — best-effort only.
    }
    navigate({
      to: "/fitness",
      search: (prev: FitnessSearch) => ({ ...prev, view: "workouts" as const }),
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
    <div className="mx-auto w-full max-w-3xl space-y-4 overflow-x-hidden p-4 pb-28">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fitness &amp; Body</h1>
          <p className="text-sm text-muted-foreground">
            Training alongside your stack — sessions, and how your body is responding.
          </p>
        </div>
        <HelpButton articleKey={view === "body" ? "bodyMetrics" : "fitness"} />
      </header>

      <div role="tablist" aria-label="Fitness sections" className="flex gap-2">
        {[
          { key: "workouts" as const, label: "Workouts", Icon: Dumbbell },
          { key: "body" as const, label: "Body", Icon: Scale },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => selectView(key)}
            className={`tap-target flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${
              view === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {view === "body" ? <BodyMetricsPanel /> : <WorkoutsPanel />}
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

  const logs = workouts.data?.logs ?? [];
  const sets = workouts.data?.sets ?? [];

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
  const selectedBucket = byDay.get(selectedDay);
  const selectedSets = useMemo(() => {
    const ids = new Set((selectedBucket?.logs ?? []).map((l) => l.id));
    return sets.filter((s) => ids.has(s.workout_log_id));
  }, [selectedBucket, sets]);

  // Recurring workout/meal anchors that fall on the selected calendar day.
  const routineRows = useRoutineRows();
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
      search: { day: log.performed_on, view: "workouts" },
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
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {workouts.isLoading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={`${d}-${i}`}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayKey = `${monthKey}-${String(i + 1).padStart(2, "0")}`;
                const bucket = byDay.get(dayKey);
                const isToday = dayKey === todayKey;
                const isSelected = dayKey === selectedDay;
                const dayTags = (bucket?.logs ?? []).flatMap((l) => readTags(l.tags));
                const dayChips = (bucket?.logs ?? []).flatMap((l) => contextChips(l));
                const hasNotes = (bucket?.logs ?? []).some((l) => (l.notes ?? "").trim() !== "");
                const contextHint = [...dayChips, ...dayTags].join(" · ");
                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDay(dayKey)}
                    title={contextHint || undefined}
                    aria-label={`${dayKey}${bucket ? `, ${bucket.logs.length} workout(s)` : ", no workouts"}${
                      contextHint ? `, ${contextHint}` : ""
                    }${hasNotes ? ", has notes" : ""}`}
                    aria-pressed={isSelected}
                    className={`tap-target flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-semibold"
                        : isToday
                          ? "border-primary/50"
                          : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <span className="relative">
                      {i + 1}
                      {(hasNotes || dayTags.length > 0) && (
                        <span
                          aria-hidden
                          className="absolute -right-2 -top-0.5 text-[9px] leading-none text-muted-foreground"
                        >
                          {dayTags.length > 0 ? "#" : "•"}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                      {bucket?.families.map((family) => (
                        <span
                          key={family}
                          className={`h-1.5 w-1.5 rounded-full ${
                            bucket.hasCompleted
                              ? (FAMILY_DOT_CLASS[family] ?? "bg-muted-foreground")
                              : "bg-muted-foreground/40"
                          }`}
                        />
                      ))}
                    </span>
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

      <RoutinePlannerCard table="workout_sessions" />
      <RoutinePlannerCard table="meal_times" />


      {/* Selected day */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{formatDayKeyLabel(selectedDay, zone)}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => openSheet({ dayKey: selectedDay, status: "planned" })}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Plan
            </button>
            <button
              onClick={() => openSheet({ dayKey: selectedDay, status: "completed" })}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Log
            </button>
          </div>
        </div>

        {dayRoutine.length > 0 && (
          <ul className="mb-3 space-y-1.5 rounded-xl border border-dashed border-border p-2.5">
            {dayRoutine.map((row) => (
              <li key={row.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{formatRoutineTime(row.time)}</span>
                <span className="truncate">{row.label}</span>
                <span className="ml-auto shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] capitalize">
                  {row.kind === "workout" ? (row.sessionKind ?? "workout") : "meal"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {(selectedBucket?.logs.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing logged for this day yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedBucket!.logs.map((log) => {
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
      ? "bg-[color:var(--severity-synergy-bg))] text-[color:var(--severity-synergy)]"
      : status === "planned"
        ? "bg-[color:var(--severity-note-bg))] text-[color:var(--severity-note)]"
        : "bg-muted text-muted-foreground";
  const label = status === "completed" ? "Done" : status === "planned" ? "Planned" : "Skipped";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles}`}>{label}</span>
  );
}
