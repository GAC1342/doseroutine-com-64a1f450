/**
 * Mon–Sun overview of the user's recurring training, so the weekly plan is
 * readable at a glance instead of being a list of rules.
 *
 * Each entry edits in place: rename it, move the time, change the duration, or
 * remove it — no separate settings screen, so a session added from the exercise
 * library can be tuned the second it appears.
 */

import { memo, useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalendarDays, CopyPlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { AddToWorkoutSheet } from "@/components/add-to-workout-sheet";
import { useRoutineRows } from "@/components/today-routine-strip";
import { ROUTINE_QUERY_KEYS } from "@/components/routine-planner-card";
import {
  applyWeekDuplication,
  describeDuplication,
  nextWeekKeys,
  planWeekDuplication,
  undoWeekDuplication,
} from "@/lib/duplicate-week";
import { trackEvent } from "@/lib/analytics";

import { removeScheduledWorkout, updateScheduledWorkout } from "@/lib/quick-add-workout";
import {
  DEFAULT_SESSION_MIN,
  describeConflicts,
  findScheduleConflicts,
  suggestShiftedTime,
  type ScheduleConflict,
} from "@/lib/routine-conflicts";
import {
  describeDays,
  formatRoutineTime,
  moveWeekday,
  normalizeTime,
  normalizeWeekdays,
  occursOnDay,
  WEEKDAY_NAMES,
} from "@/lib/routine-schedule";
import { WorkoutScheduleFields } from "@/components/workout-schedule-fields";
import { ExerciseArtThumbnail } from "@/components/exercise-art-lightbox";
import { fetchWorkoutTemplates, type WorkoutTemplate } from "@/lib/workout-templates";
import { applyRoutineChange, fetchRoutineAssignments } from "@/lib/repeat-routine";
import {
  firstScheduleError,
  hasScheduleErrors,
  validateWorkoutSchedule,
  type ScheduleErrors,
  type WorkoutEditScope,
} from "@/lib/workout-schedule-validation";

/** A YYYY-MM-DD key for each weekday of the current week, Monday first. */
function weekDayKeys(today = new Date()): { weekday: number; dayKey: string }[] {
  const monday = new Date(today);
  const offset = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - offset);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    return { weekday: d.getDay(), dayKey };
  });
}

type EntryDraft = {
  label: string;
  time: string;
  duration: string;
  days: number[];
  intervalWeeks: number;
  repeatUntil: string;
};

type DayEntry = {
  id: string;
  label: string;
  time: string | null;
  duration: number | null;
  /** Every weekday this session repeats on (0 = Sunday). */
  days: number[];
  intervalWeeks: number;
  repeatUntil: string | null;
};

/**
 * Read-only entry row. Memoized so typing in one day's inline editor doesn't
 * re-render every other entry in the week.
 */
const ScheduleEntry = memo(function ScheduleEntry({
  item,
  weekday,
  dragging,
  onEdit,
  onDragStart,
  onDragEnd,
  template,
  onEditRoutine,
}: {
  item: DayEntry;
  /** The day this row is rendered under, so a drag knows what to move. */
  weekday: number;
  dragging: boolean;
  onEdit: (item: DayEntry) => void;
  onDragStart: (id: string, weekday: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
  template: WorkoutTemplate | null;
  onEditRoutine: (template: WorkoutTemplate) => void;
}) {
  return (
    <li
      draggable
      onDragStart={(e) => onDragStart(item.id, weekday, e)}
      onDragEnd={onDragEnd}
      className={dragging ? "opacity-50" : ""}
    >
      <div className="group flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-muted">
        {template?.exercises[0] && (
          <ExerciseArtThumbnail
            exercise={template.exercises[0].exercise}
            size={36}
            className="h-9 w-9 rounded-md"
          />
        )}
        <button type="button" onClick={() => onEdit(item)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm">
            {item.label}
            {item.time && (
              <span className="ml-2 text-xs text-muted-foreground">
                {formatRoutineTime(item.time)}
                {item.duration ? ` · ${item.duration} min` : ""}
              </span>
            )}
            {item.days.length > 1 && (
              <span className="ml-2 text-xs text-muted-foreground">
                · {describeDays(item.days)}
              </span>
            )}
          </span>
          {template && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {template.exercises.map((exercise) => exercise.exercise).join(" · ")}
            </span>
          )}
        </button>
        {template && (
          <button
            type="button"
            onClick={() => onEditRoutine(template)}
            className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground"
          >
            Exercises
          </button>
        )}
        <Pencil
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>
    </li>
  );
});

export function WeeklyRoutineSchedule({
  onEditRoutine,
}: {
  onEditRoutine: (template: WorkoutTemplate) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useRoutineRows();
  const templates = useQuery({ queryKey: ["workout-templates"], queryFn: fetchWorkoutTemplates });
  const templatesById = useMemo(
    () => new Map((templates.data ?? []).map((template) => [template.id, template])),
    [templates.data],
  );
  const sessions = useMemo(
    () => (data?.workouts ?? []).filter((row) => row.active !== false),
    [data?.workouts],
  );
  // Both are pure date math; recomputing them on every keystroke in the inline
  // editor was pointless layout-triggering work.
  const days = useMemo(() => weekDayKeys(), []);
  const todayKeyIndex = useMemo(() => new Date().getDay(), []);

  /** Entries per weekday, computed once per data change instead of per render. */
  const entriesByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const { dayKey } of days) {
      map.set(
        dayKey,
        sessions
          .filter((row) => occursOnDay(row.days_of_week, dayKey))
          .map((row) => ({
            id: row.id,
            label: (row.label ?? "").trim() || "Workout",
            time: normalizeTime(row.planned_time),
            duration: row.duration_min ?? null,
            days: normalizeWeekdays(row.days_of_week),
            intervalWeeks: row.interval_weeks ?? 1,
            repeatUntil: row.repeat_until ?? null,
          }))
          .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
      );
    }
    return map;
  }, [days, sessions]);
  // One tap on a day opens the quick add with that weekday preselected.
  const [addDay, setAddDay] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EntryDraft>({
    label: "",
    time: "",
    duration: "",
    days: [],
    intervalWeeks: 1,
    repeatUntil: "",
  });
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  /** Whether a save rewrites the whole repeating rule or just this week's dates. */
  const [scope, setScope] = useState<WorkoutEditScope>("series");
  // Drag state for moving a session to another day, calendar-style.
  const [drag, setDrag] = useState<{ id: string; from: number } | null>(null);
  const dragId = drag?.id ?? null;
  const [dropDay, setDropDay] = useState<number | null>(null);

  const draftErrors: ScheduleErrors = useMemo(
    () =>
      validateWorkoutSchedule(
        {
          repeats: true,
          weekdays: draft.days,
          time: draft.time,
          intervalWeeks: draft.intervalWeeks,
          repeatUntil: draft.repeatUntil,
        },
        new Date().toISOString().slice(0, 10),
        { requireTime: true },
      ),
    [draft.days, draft.time, draft.intervalWeeks, draft.repeatUntil],
  );

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ROUTINE_QUERY_KEYS.workout_sessions });
    void qc.invalidateQueries({ queryKey: ["today-routine"] });
  }

  function closeEdit() {
    setEditingId(null);
    setConflicts([]);
  }

  const save = useMutation({
    mutationFn: async (id: string) => {
      const minutes = Number(draft.duration);
      // "This workout only" must never rewrite the pattern: it becomes a
      // date-keyed time override plus one-off skips for the dropped days.
      if (scope === "occurrence") {
        const assignments = await fetchRoutineAssignments();
        const assignment = assignments.find((a) => a.id === id);
        if (!assignment) throw new Error("That repeating workout no longer exists");
        await applyRoutineChange(assignment, { time: draft.time, weekdays: draft.days }, "week");
        return;
      }
      await updateScheduledWorkout(id, {
        label: draft.label,
        time: draft.time,
        durationMin: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
        weekdays: draft.days,
        intervalWeeks: draft.intervalWeeks,
        repeatUntil: draft.repeatUntil || null,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success(scope === "occurrence" ? "This week updated" : "Session updated");
      closeEdit();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * Drop a dragged session on a different day. Only the day it was dragged
   * from moves — a Mon/Wed/Fri session dropped from Wed onto Thu becomes
   * Mon/Thu/Fri instead of collapsing to a single day.
   */
  const move = useMutation({
    mutationFn: ({
      id,
      from,
      to,
      days,
    }: {
      id: string;
      from: number;
      to: number;
      days: number[];
    }) => updateScheduledWorkout(id, { weekdays: moveWeekday(days, from, to) }),
    onSuccess: (_data, { id, from, to, days }) => {
      invalidate();
      toast.success(`Moved ${WEEKDAY_NAMES[from]} → ${WEEKDAY_NAMES[to]}`, {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            void updateScheduledWorkout(id, { weekdays: normalizeWeekdays(days) })
              .then(() => {
                invalidate();
                toast.success("Undone");
              })
              .catch((e: Error) => toast.error(e.message));
          },
        },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeScheduledWorkout(id),
    onSuccess: () => {
      invalidate();
      toast.success("Session removed");
      closeEdit();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * Copy this week's plan into next week. Weekly rules already cover it, so
   * only the gaps are written — see planWeekDuplication.
   */
  const duplicate = useMutation({
    mutationFn: async () => {
      const plan = planWeekDuplication(sessions, nextWeekKeys());
      return applyWeekDuplication(plan);
    },
    onSuccess: (result) => {
      invalidate();
      trackEvent("calendar_day_action", {
        action: "duplicate_week",
        created: result.createdIds.length,
        restored: result.restored.length,
      });
      const changed = result.createdIds.length > 0 || result.restored.length > 0;
      toast.success(describeDuplication(result), {
        duration: 8000,
        ...(changed
          ? {
              action: {
                label: "Undo",
                onClick: () => {
                  void undoWeekDuplication(result)
                    .then(() => {
                      invalidate();
                      toast.success("Undone");
                    })
                    .catch((e: Error) => toast.error(e.message));
                },
              },
            }
          : {}),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEditEntry = useCallback((item: DayEntry) => {
    setEditingId(item.id);
    setConflicts([]);
    setScope("series");
    setDraft({
      label: item.label,
      time: item.time ?? "",
      duration: String(item.duration ?? DEFAULT_SESSION_MIN),
      days: item.days,
      intervalWeeks: item.intervalWeeks,
      repeatUntil: item.repeatUntil ?? "",
    });
  }, []);

  const handleDragStart = useCallback((id: string, from: number, e: React.DragEvent) => {
    setDrag({ id, from });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDrag(null);
    setDropDay(null);
  }, []);

  /** Saving into an occupied time asks first, exactly like adding does. */
  function requestSave(id: string, weekdays: number[]) {
    const minutes = Number(draft.duration);
    // Block the save on an unschedulable recurrence rather than silently
    // writing a rule that would never produce a workout.
    if (hasScheduleErrors(draftErrors)) {
      toast.error(firstScheduleError(draftErrors) ?? "Check the schedule");
      return;
    }
    const found = findScheduleConflicts({
      rows: sessions,
      weekdays,
      time: draft.time,
      durationMin: Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_SESSION_MIN,
      ignoreId: id,
    });
    if (found.length > 0) {
      setConflicts(found);
      return;
    }
    save.mutate(id);
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold">Your week</h2>
        </div>
        <button
          type="button"
          onClick={() => duplicate.mutate()}
          disabled={duplicate.isPending || isLoading || sessions.length === 0}
          className="tap-target flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {duplicate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Duplicate week
        </button>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Recurring training sessions. Tap + to add one, tap an entry to change its name, time or
        length, or drag an entry onto another day to reschedule it.
      </p>

      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {days.map(({ weekday, dayKey }) => {
            const forDay = entriesByDay.get(dayKey) ?? [];
            return (
              <li
                key={dayKey}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  setDropDay(weekday);
                }}
                onDragLeave={() => setDropDay((d) => (d === weekday ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropDay(null);
                  const dragged = drag;
                  setDrag(null);
                  if (!dragged) return;
                  if (dragged.from === weekday) return;
                  const source = sessions.find((row) => row.id === dragged.id);
                  move.mutate({
                    id: dragged.id,
                    from: dragged.from,
                    to: weekday,
                    days: normalizeWeekdays(source?.days_of_week),
                  });
                }}
                className={`flex items-start gap-3 rounded-lg py-2 transition-colors ${
                  dropDay === weekday ? "bg-primary/10 ring-1 ring-primary/40" : ""
                }`}
              >
                <span
                  className={`w-10 shrink-0 pt-1 text-xs font-semibold ${
                    weekday === todayKeyIndex ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {WEEKDAY_NAMES[weekday]?.slice(0, 3)}
                </span>
                <div className="min-w-0 flex-1">
                  {forDay.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setAddDay(weekday)}
                      className="rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      Rest — plan exercises &amp; a time
                    </button>
                  ) : (
                    <ul className="space-y-1">
                      {forDay.map((item) =>
                        editingId === item.id ? (
                          <li
                            key={item.id}
                            className="rounded-lg border border-primary/40 bg-muted/40 p-2"
                          >
                            <Input
                              value={draft.label}
                              onChange={(e) => {
                                setConflicts([]);
                                setDraft((d) => ({ ...d, label: e.target.value }));
                              }}
                              aria-label="Session name"
                              placeholder="Workout"
                              className="h-9"
                            />
                            <div className="mt-2">
                              <WorkoutScheduleFields
                                compact
                                showRepeatToggle={false}
                                value={{
                                  repeats: true,
                                  weekdays: draft.days,
                                  time: draft.time,
                                  intervalWeeks: draft.intervalWeeks,
                                  repeatUntil: draft.repeatUntil,
                                }}
                                onChange={(next) => {
                                  setConflicts([]);
                                  setDraft((current) => ({
                                    ...current,
                                    days: next.weekdays,
                                    time: next.time,
                                    intervalWeeks: next.intervalWeeks,
                                    repeatUntil: next.repeatUntil,
                                  }));
                                }}
                                minDate={new Date().toISOString().slice(0, 10)}
                                startDay={new Date().toISOString().slice(0, 10)}
                                errors={draftErrors}
                                scope={scope}
                                onScopeChange={setScope}
                              />
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <Input
                                type="number"
                                min={5}
                                step={5}
                                value={draft.duration}
                                onChange={(e) => {
                                  setConflicts([]);
                                  setDraft((d) => ({ ...d, duration: e.target.value }));
                                }}
                                aria-label="Session duration in minutes"
                                className="h-9 w-20"
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>

                            {conflicts.length > 0 && (
                              <div className="mt-2 rounded-lg border border-border p-2">
                                <p className="text-[11px] text-muted-foreground">
                                  {describeConflicts(conflicts)} already{" "}
                                  {conflicts.length === 1 ? "runs" : "run"} then.
                                </p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const shifted = suggestShiftedTime(conflicts, draft.time);
                                      setDraft((d) => ({ ...d, time: shifted }));
                                      setConflicts([]);
                                    }}
                                    className="rounded-lg border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary"
                                  >
                                    Shift to{" "}
                                    {formatRoutineTime(suggestShiftedTime(conflicts, draft.time))}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const ids = conflicts.map((c) => c.id);
                                      setConflicts([]);
                                      Promise.all(ids.map((id) => removeScheduledWorkout(id)))
                                        .then(() => save.mutate(item.id))
                                        .catch((e: Error) => toast.error(e.message));
                                    }}
                                    className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
                                  >
                                    Overwrite
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                disabled={save.isPending}
                                onClick={() => requestSave(item.id, draft.days)}
                                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                              >
                                {save.isPending && (
                                  <Loader2
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                  />
                                )}
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={closeEdit}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove ${item.label}`}
                                disabled={remove.isPending}
                                onClick={() => remove.mutate(item.id)}
                                className="ml-auto rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </li>
                        ) : (
                          <ScheduleEntry
                            key={item.id}
                            item={item}
                            weekday={weekday}
                            dragging={dragId === item.id}
                            onEdit={startEditEntry}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            template={
                              sessions.find((row) => row.id === item.id)?.template_id
                                ? (templatesById.get(
                                    sessions.find((row) => row.id === item.id)?.template_id ?? "",
                                  ) ?? null)
                                : null
                            }
                            onEditRoutine={onEditRoutine}
                          />
                        ),
                      )}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAddDay(weekday)}
                  aria-label={`Add a workout on ${WEEKDAY_NAMES[weekday]}`}
                  className="tap-target shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AddToWorkoutSheet
        open={addDay !== null}
        onOpenChange={(open) => setAddDay(open ? addDay : null)}
        {...(addDay !== null ? { initialWeekday: addDay } : {})}
      />
    </Card>
  );
}
