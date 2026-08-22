/**
 * "Repeat weekly" — build a routine once, then tick the days it runs on.
 *
 * Modelled on how Hevy / Strong / Jefit handle recurring training: a saved
 * routine is the unit of reuse, and the weekly calendar simply points at it.
 * Adding Thursday to "Push day" is one tap; the exercises are never rebuilt.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarOff, CalendarSync, Clock, Loader2, Repeat, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTINE_QUERY_KEYS } from "@/components/routine-planner-card";
import { fetchWorkoutTemplates, templateSummary } from "@/lib/workout-templates";
import { formatRoutineTime } from "@/lib/routine-schedule";
import { DEFAULT_WORKOUT_TIME } from "@/lib/quick-add-workout";
import {
  WEEKDAY_SHORT,
  WEEK_ORDER,
  describeWeekdays,
  fetchRoutineAssignments,
  repeatRoutineWeekly,
  stopRepeating,
  toggleAssignmentDay,
  toggleWeekday,
  applyRoutineChange,
  parseEndDateInput,
  clearWeekOverrides,
  setDayTimeOverride,
  setRepeatInterval,
  setRepeatUntil,
  toggleSkipOccurrence,
  todayKey,
  type RoutineAssignment,
} from "@/lib/repeat-routine";
import { describeInterval, describeRepeatEnd, nextOccurrences } from "@/lib/routine-recurrence";
import { hapticTap } from "@/lib/haptics";

const REPEAT_QUERY_KEY = ["routine-assignments"];

function DayChips({
  selected,
  onToggle,
  disabled,
}: {
  selected: number[];
  onToggle: (day: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEK_ORDER.map((day) => {
        const on = selected.includes(day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => {
              hapticTap();
              onToggle(day);
            }}
            className={`min-w-11 rounded-lg border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
            }`}
          >
            {WEEKDAY_SHORT[day]}
          </button>
        );
      })}
    </div>
  );
}

export function RepeatWeeklyRoutine({
  initialOpenId,
  selectedDay,
}: {
  initialOpenId?: string;
  selectedDay?: string;
} = {}) {
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ["workout-templates"], queryFn: fetchWorkoutTemplates });
  const assignments = useQuery({ queryKey: REPEAT_QUERY_KEY, queryFn: fetchRoutineAssignments });

  const [templateId, setTemplateId] = useState<string>("");
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState<string>(DEFAULT_WORKOUT_TIME);
  const [intervalWeeks, setIntervalWeeks] = useState<number>(1);
  const [endsOn, setEndsOn] = useState<string>("");
  const [openDetails, setOpenDetails] = useState<string | null>(null);
  // Draft end-dates keyed by assignment id.
  //
  // A native date input fires `change` on every partial value while the user
  // types ("2026-08-0" arrives as ""), so committing straight from onChange
  // wiped the saved end date mid-edit. We hold the draft locally and only
  // persist a complete YYYY-MM-DD (or an explicit Clear).
  const [endDrafts, setEndDrafts] = useState<Record<string, string>>({});
  const [scope, setScope] = useState<"future" | "week">("future");
  const [weekTime, setWeekTime] = useState<string>(DEFAULT_WORKOUT_TIME);

  useEffect(() => {
    if (!initialOpenId) return;
    setOpenDetails(initialOpenId);
  }, [initialOpenId]);

  const repeating = useMemo(
    () => (assignments.data ?? []).filter((a) => a.templateId),
    [assignments.data],
  );
  const repeatingIds = useMemo(() => new Set(repeating.map((a) => a.templateId)), [repeating]);
  const available = useMemo(
    () => (templates.data ?? []).filter((t) => !repeatingIds.has(t.id)),
    [templates.data, repeatingIds],
  );
  const selected = useMemo(
    () => (templates.data ?? []).find((t) => t.id === templateId) ?? null,
    [templates.data, templateId],
  );

  function refresh() {
    void qc.invalidateQueries({ queryKey: REPEAT_QUERY_KEY });
    for (const key of Object.values(ROUTINE_QUERY_KEYS))
      void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ["today-routine"] });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Pick a routine to repeat");
      await repeatRoutineWeekly({
        templateId: selected.id,
        label: selected.name,
        weekdays: days,
        time,
        durationMin: selected.duration_min ?? null,
        kind: selected.workout_type || "strength",
        intervalWeeks,
        repeatUntil: endsOn || null,
      });
    },
    onSuccess: () => {
      toast.success(
        `${selected?.name ?? "Routine"} repeats ${describeWeekdays(days).toLowerCase()}`,
      );
      setTemplateId("");
      setDays([]);
      setIntervalWeeks(1);
      setEndsOn("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeEnd = useMutation({
    mutationFn: ({ assignment, until }: { assignment: RoutineAssignment; until: string | null }) =>
      setRepeatUntil(assignment, until),
    onSuccess: (until, variables) => {
      // The server answer is now the source of truth again.
      setEndDrafts((prev) => {
        const next = { ...prev };
        delete next[variables.assignment.id];
        return next;
      });
      toast.success(
        until ? `Repeats until ${describeRepeatEnd(until)}` : "Repeats with no end date",
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDay = useMutation({
    mutationFn: ({ assignment, day }: { assignment: RoutineAssignment; day: number }) =>
      toggleAssignmentDay(assignment, day),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const changeInterval = useMutation({
    mutationFn: ({ assignment, weeks }: { assignment: RoutineAssignment; weeks: number }) =>
      setRepeatInterval(assignment, weeks),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const skipDay = useMutation({
    mutationFn: ({ assignment, dayKey }: { assignment: RoutineAssignment; dayKey: string }) =>
      toggleSkipOccurrence(assignment, dayKey),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const overrideTime = useMutation({
    mutationFn: ({
      assignment,
      weekday,
      value,
    }: {
      assignment: RoutineAssignment;
      weekday: number;
      value: string | null;
    }) => setDayTimeOverride(assignment, weekday, value),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const weekChange = useMutation({
    mutationFn: ({ assignment, time }: { assignment: RoutineAssignment; time: string }) =>
      applyRoutineChange(assignment, { time }, "week"),
    onSuccess: () => {
      toast.success("Updated for this week only");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetWeek = useMutation({
    mutationFn: (assignment: RoutineAssignment) => clearWeekOverrides(assignment),
    onSuccess: () => {
      toast.success("This week is back to the saved routine");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => stopRepeating(id),
    onSuccess: () => {
      toast.success("Stopped repeating");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loading = templates.isLoading || assignments.isLoading;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start gap-2">
        <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold">Repeat a routine weekly</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Build the workout once, then pick the days it runs. Editing the routine updates every
            day it repeats on — no rebuilding for each new calendar day.
          </p>
        </div>
      </div>

      {loading ? (
        <p
          className="flex items-center gap-2 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading your routines…
        </p>
      ) : (
        <>
          {repeating.length > 0 && (
            <ul className="space-y-3">
              {repeating.map((assignment) => (
                <li key={assignment.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{assignment.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {describeWeekdays(assignment.weekdays)} ·{" "}
                        {formatRoutineTime(assignment.time)} ·{" "}
                        {describeInterval(assignment.intervalWeeks).toLowerCase()}
                        {assignment.repeatUntil
                          ? ` · until ${describeRepeatEnd(assignment.repeatUntil)}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Stop repeating ${assignment.label}`}
                      onClick={() => remove.mutate(assignment.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <DayChips
                      selected={assignment.weekdays}
                      disabled={toggleDay.isPending}
                      onToggle={(day) => toggleDay.mutate({ assignment, day })}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">
                      <span className="sr-only">Frequency for {assignment.label}</span>
                      <select
                        aria-label={`Frequency for ${assignment.label}`}
                        value={assignment.intervalWeeks}
                        disabled={changeInterval.isPending}
                        onChange={(e) =>
                          changeInterval.mutate({ assignment, weeks: Number(e.target.value) })
                        }
                        className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                      >
                        <option value={1}>Every week</option>
                        <option value={2}>Every other week</option>
                        <option value={3}>Every 3 weeks</option>
                        <option value={4}>Every 4 weeks</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Ends</span>
                      <Input
                        type="date"
                        aria-label={`Repeat ${assignment.label} until`}
                        value={endDrafts[assignment.id] ?? assignment.repeatUntil ?? ""}
                        min={todayKey()}
                        disabled={changeEnd.isPending}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEndDrafts((prev) => ({ ...prev, [assignment.id]: value }));
                          // Only a complete date is worth a write; partials are
                          // just keystrokes on the way there.
                          const parsed = parseEndDateInput(value);
                          if (parsed.commit) changeEnd.mutate({ assignment, until: parsed.value });
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value === (assignment.repeatUntil ?? "")) return;
                          // Emptying the field on blur is a real "no end" edit.
                          const parsed = parseEndDateInput(value, { explicitClear: true });
                          if (parsed.commit) changeEnd.mutate({ assignment, until: parsed.value });
                        }}
                        className="h-8 w-[9.5rem] text-xs"
                      />
                      {(endDrafts[assignment.id] ?? assignment.repeatUntil) && (
                        <button
                          type="button"
                          aria-label={`Clear end date for ${assignment.label}`}
                          onClick={() => changeEnd.mutate({ assignment, until: null })}
                          className="underline underline-offset-2"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDetails((prev) => (prev === assignment.id ? null : assignment.id))
                      }
                      aria-expanded={openDetails === assignment.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2 text-xs text-muted-foreground hover:bg-muted"
                    >
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Times & skips
                    </button>
                  </div>

                  {openDetails === assignment.id && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium">Apply changes to</span>
                        <div className="inline-flex overflow-hidden rounded-lg border border-border">
                          {(["future", "week"] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={scope === value}
                              onClick={() => setScope(value)}
                              className={`px-2 py-1 text-xs ${
                                scope === value
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {value === "future" ? "All future" : "This week only"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {scope === "week" ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Changes here only affect this week. Next week goes back to the saved
                            routine.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="time"
                              aria-label={`This week's time for ${assignment.label}`}
                              value={weekTime}
                              onChange={(e) => setWeekTime(e.target.value)}
                              className="h-8 w-32 text-xs"
                            />
                            <button
                              type="button"
                              disabled={weekChange.isPending}
                              onClick={() => weekChange.mutate({ assignment, time: weekTime })}
                              className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                            >
                              Move this week
                            </button>
                            <button
                              type="button"
                              disabled={resetWeek.isPending}
                              onClick={() => resetWeek.mutate(assignment)}
                              className="h-8 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                            >
                              Reset this week
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium">Time on each day</p>
                          {assignment.weekdays.map((day) => (
                            <div key={day} className="flex items-center gap-2">
                              <span className="w-10 text-xs text-muted-foreground">
                                {WEEKDAY_SHORT[day]}
                              </span>
                              <Input
                                type="time"
                                aria-label={`${WEEKDAY_SHORT[day]} time for ${assignment.label}`}
                                value={assignment.timeOverrides[day] ?? assignment.time}
                                onChange={(e) =>
                                  overrideTime.mutate({
                                    assignment,
                                    weekday: day,
                                    value: e.target.value,
                                  })
                                }
                                className="h-8 w-32 text-xs"
                              />
                              {assignment.timeOverrides[day] && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    overrideTime.mutate({ assignment, weekday: day, value: null })
                                  }
                                  className="text-xs text-muted-foreground underline"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium">Next occurrences</p>
                        {nextOccurrences(
                          assignment.weekdays,
                          {
                            intervalWeeks: assignment.intervalWeeks,
                            anchorDate: assignment.anchorDate,
                            repeatUntil: assignment.repeatUntil,
                            skippedDates: assignment.skippedDates,
                          },
                          selectedDay ?? todayKey(),
                          3,
                        ).map((occ) => (
                          <div key={occ.dayKey} className="flex items-center gap-2">
                            <span
                              className={`text-xs ${occ.skipped ? "text-muted-foreground line-through" : "text-foreground"}`}
                            >
                              {occ.dayKey}
                            </span>
                            <button
                              type="button"
                              disabled={skipDay.isPending}
                              onClick={() => skipDay.mutate({ assignment, dayKey: occ.dayKey })}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                            >
                              <CalendarOff className="h-3 w-3" aria-hidden="true" />
                              {occ.skipped ? "Restore" : "Skip"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {(templates.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Save a routine first — add exercises from the Exercises tab and tap “New routine”.
              Then it can repeat on any day here.
            </p>
          ) : (
            <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
              <div className="flex items-center gap-2 text-xs font-medium">
                <CalendarSync className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                Add another repeating routine
              </div>
              <label className="block text-xs text-muted-foreground">
                Routine
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value="">Choose a saved routine…</option>
                  {available.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <p className="text-xs text-muted-foreground">{templateSummary(selected)}</p>
              )}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Days</span>
                <DayChips
                  selected={days}
                  onToggle={(day) => setDays((prev) => toggleWeekday(prev, day))}
                />
              </div>
              <label className="block text-xs text-muted-foreground">
                Time
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 h-9"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Frequency
                <select
                  value={intervalWeeks}
                  onChange={(e) => setIntervalWeeks(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value={1}>Every week</option>
                  <option value={2}>Every other week</option>
                  <option value={3}>Every 3 weeks</option>
                  <option value={4}>Every 4 weeks</option>
                </select>
              </label>
              <label className="block text-xs text-muted-foreground">
                Repeat until (optional)
                <Input
                  type="date"
                  value={endsOn}
                  min={todayKey()}
                  onChange={(e) => setEndsOn(e.target.value)}
                  className="mt-1 h-9"
                />
                <span className="mt-1 block">
                  {endsOn
                    ? "The routine stops after this day."
                    : "Leave empty to repeat with no end date."}
                </span>
              </label>
              <button
                type="button"
                disabled={!templateId || days.length === 0 || save.isPending}
                onClick={() => save.mutate()}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Repeat className="h-4 w-4" aria-hidden="true" />
                )}
                {intervalWeeks === 1 ? "Repeat every week" : describeInterval(intervalWeeks)}
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
