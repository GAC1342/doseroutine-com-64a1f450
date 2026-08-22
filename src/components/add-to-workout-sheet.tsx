/**
 * "Add to workout" — one tap from a picked exercise (or an empty day) to a
 * saved routine or a recurring calendar slot. Everything here is one screen:
 * tap a routine to append, tap "New routine" to create one, or tap the days you
 * train to put the session on the week.
 *
 * Two guardrails live here so mistakes are cheap:
 *   - a slot that already has a session prompts to overwrite or shift, instead
 *     of silently stacking two entries on the same time,
 *   - every add returns an Undo snackbar, so reverting never means hunting for
 *     an edit screen.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CalendarPlus, Check, Dumbbell, Loader2, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ROUTINE_QUERY_KEYS } from "@/components/routine-planner-card";
import { useRoutineRows } from "@/components/today-routine-strip";
import {
  deleteWorkoutTemplate,
  fetchWorkoutTemplates,
  templateSummary,
} from "@/lib/workout-templates";
import { formatRoutineTime } from "@/lib/routine-schedule";
import {
  DEFAULT_SESSION_MIN,
  describeConflicts,
  findScheduleConflicts,
  suggestShiftedTime,
  type ScheduleConflict,
} from "@/lib/routine-conflicts";
import {
  DEFAULT_WORKOUT_TIME,
  appendExercisesToTemplate,
  createRoutineFromPicks,
  newExercisesFor,
  normalizeExerciseNames,
  removeScheduledWorkout,
  removeTemplateExercises,
  scheduleWorkoutOnDays,
  suggestRoutineName,
} from "@/lib/quick-add-workout";
import { hapticSuccess } from "@/lib/haptics";
import { ExercisePicker } from "@/components/exercise-picker";
import { loadTargetDays, saveTargetDays } from "@/lib/fitness-prefs";
import { builtInExerciseNames } from "@/lib/exercise-catalog";
import { WorkoutScheduleFields } from "@/components/workout-schedule-fields";
import { validateWorkoutSchedule } from "@/lib/workout-schedule-validation";

/** Success toast with a one-tap revert. */
function toastWithUndo(message: string, undo: () => Promise<void>, onUndone?: () => void) {
  toast.success(message, {
    duration: 8000,
    action: {
      label: "Undo",
      onClick: () => {
        void undo()
          .then(() => {
            toast.success("Undone");
            onUndone?.();
          })
          .catch((e: Error) => toast.error(e.message));
      },
    },
  });
}

export function AddToWorkoutSheet({
  open,
  onOpenChange,
  exercises = [],
  initialWeekday,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Exercises to add to a routine. Empty = calendar-only quick add. */
  exercises?: string[];
  /** Preselect a weekday (0 = Sunday) when opened from the weekly calendar. */
  initialWeekday?: number;
  onAdded?: () => void;
}) {
  const qc = useQueryClient();
  // Opened from an empty day, the sheet doubles as a picker: choose exercises
  // and a start time here and the whole thing saves to the week in one step.
  const [inlinePicks, setInlinePicks] = useState<string[]>([]);
  const guided = exercises.length === 0;
  const picks = useMemo(
    () => normalizeExerciseNames(guided ? inlinePicks : exercises),
    [guided, inlinePicks, exercises],
  );
  const [routineName, setRoutineName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState(DEFAULT_WORKOUT_TIME);
  const [duration, setDuration] = useState(String(DEFAULT_SESSION_MIN));
  const [intervalWeeks, setIntervalWeeks] = useState(1);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  // Only a deliberate chip tap updates the remembered pattern: opening the
  // sheet from a single day used to overwrite it with that one day.
  const [daysTouched, setDaysTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInlinePicks([]);
    setRoutineName(exercises.length > 0 ? suggestRoutineName(exercises) : "Workout");
    // Remembered target days keep repeat batches to a single tap.
    setDays(initialWeekday === undefined ? loadTargetDays() : [initialWeekday]);
    setTime(DEFAULT_WORKOUT_TIME);
    setDuration(String(DEFAULT_SESSION_MIN));
    setIntervalWeeks(1);
    setRepeatUntil("");
    setConflicts([]);
    setDaysTouched(false);
  }, [open, initialWeekday, exercises]);

  useEffect(() => {
    if (!open || !daysTouched) return;
    saveTargetDays(days);
  }, [open, days, daysTouched]);

  // Guided mode names the session after the picks as they are chosen.
  useEffect(() => {
    if (!open || !guided) return;
    if (inlinePicks.length > 0) setRoutineName(suggestRoutineName(inlinePicks));
  }, [open, guided, inlinePicks]);

  const templates = useQuery({
    queryKey: ["workout-templates"],
    queryFn: fetchWorkoutTemplates,
    staleTime: 60_000,
    enabled: open && picks.length > 0,
  });

  const routineRows = useRoutineRows();
  const catalog = useMemo(() => (guided ? builtInExerciseNames() : []), [guided]);

  function invalidateSchedule() {
    void qc.invalidateQueries({ queryKey: ROUTINE_QUERY_KEYS.workout_sessions });
    void qc.invalidateQueries({ queryKey: ["today-routine"] });
  }

  const appendTo = useMutation({
    mutationFn: async (templateId: string) => {
      const template = (templates.data ?? []).find((t) => t.id === templateId);
      if (!template) throw new Error("Routine not found");
      const { added, rowIds } = await appendExercisesToTemplate(template, picks);
      return { name: template.name, added, rowIds };
    },
    onSuccess: ({ name, added, rowIds }) => {
      hapticSuccess();
      void qc.invalidateQueries({ queryKey: ["workout-templates"] });
      if (added === 0) {
        toast.success(`Already in ${name}`);
      } else {
        toastWithUndo(
          `Added ${added} exercise${added === 1 ? "" : "s"} to ${name}`,
          () => removeTemplateExercises(rowIds),
          () => void qc.invalidateQueries({ queryKey: ["workout-templates"] }),
        );
      }
      onAdded?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createRoutine = useMutation({
    mutationFn: () => createRoutineFromPicks(routineName, picks),
    onSuccess: (templateId) => {
      hapticSuccess();
      void qc.invalidateQueries({ queryKey: ["workout-templates"] });
      toastWithUndo(
        `Routine "${routineName.trim() || "New routine"}" created`,
        () => deleteWorkoutTemplate(templateId),
        () => void qc.invalidateQueries({ queryKey: ["workout-templates"] }),
      );
      onAdded?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const schedule = useMutation({
    mutationFn: async (opts: { at: string; replaceIds?: string[] }) => {
      let templateId: string | undefined;
      if (guided && picks.length > 0) {
        // The calendar row must point at the saved routine. Await the complete
        // routine save before creating the recurrence so a reload can always
        // resolve the selected exercises and repeat days together.
        templateId = await createRoutineFromPicks(routineName || "Workout", picks);
      }
      return scheduleWorkoutOnDays({
        label: routineName || "Workout",
        weekdays: days,
        time: opts.at,
        durationMin: durationValue(),
        ...(templateId ? { templateId } : {}),
        ...(opts.replaceIds ? { replaceIds: opts.replaceIds } : {}),
        intervalWeeks,
        repeatUntil: repeatUntil || null,
      });
    },
    onSuccess: (sessionId, opts) => {
      hapticSuccess();
      invalidateSchedule();
      void qc.invalidateQueries({ queryKey: ["workout-templates"] });
      setConflicts([]);
      toastWithUndo(
        opts.replaceIds?.length
          ? "Replaced the existing session"
          : `Added to your week at ${formatRoutineTime(opts.at)}`,
        () => removeScheduledWorkout(sessionId),
        invalidateSchedule,
      );
      onAdded?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function durationValue(): number | null {
    const n = Number(duration);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  /** Check the slot first; only insert once the user has resolved any clash. */
  function requestSchedule() {
    const found = findScheduleConflicts({
      rows: routineRows.data?.workouts ?? [],
      weekdays: days,
      time,
      durationMin: durationValue() ?? DEFAULT_SESSION_MIN,
    });
    if (found.length > 0) {
      setConflicts(found);
      return;
    }
    schedule.mutate({ at: time });
  }

  const shiftedTime = conflicts.length > 0 ? suggestShiftedTime(conflicts, time) : time;
  const busy = appendTo.isPending || createRoutine.isPending || schedule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to workout</DialogTitle>
          <DialogDescription>
            {picks.length > 0
              ? `${picks.length} exercise${picks.length === 1 ? "" : "s"}: ${picks.join(", ")}`
              : "Put a training session on your weekly calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="quick-add-name"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Name
            </label>
            <Input
              id="quick-add-name"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="Push day"
              className="mt-1"
            />
          </div>

          {!guided && picks.length > 0 && (
            <section>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Add to a routine
              </p>
              <div className="mt-2 space-y-2">
                {templates.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading routines…</p>
                ) : (templates.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No saved routines yet — create one below.
                  </p>
                ) : (
                  (templates.data ?? []).map((template) => {
                    const fresh = newExercisesFor(template, picks).length;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        disabled={busy}
                        onClick={() => appendTo.mutate(template.id)}
                        className="tap-target flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left disabled:opacity-60"
                      >
                        <Dumbbell className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {template.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {templateSummary(template) || "Empty routine"}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-primary">
                          {fresh === 0 ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            `+${fresh}`
                          )}
                        </span>
                      </button>
                    );
                  })
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => createRoutine.mutate()}
                  className="tap-target flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {createRoutine.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  New routine with these
                </button>
              </div>
            </section>
          )}

          {guided && (
            <section>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Pick exercises
              </p>
              <div className="mt-2 max-h-72 overflow-y-auto">
                <ExercisePicker
                  names={catalog}
                  onPick={(name) =>
                    setInlinePicks((prev) =>
                      prev.some((p) => p.toLowerCase() === name.toLowerCase())
                        ? prev.filter((p) => p.toLowerCase() !== name.toLowerCase())
                        : [...prev, name],
                    )
                  }
                  chosen={inlinePicks}
                  maxResults={24}
                />
              </div>
              {inlinePicks.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {inlinePicks.length} selected — saved as the routine "{routineName}".
                </p>
              )}
            </section>
          )}

          <section>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Put it on your week
            </p>
            <div className="mt-2">
              <WorkoutScheduleFields
                showRepeatToggle={false}
                value={{ repeats: true, weekdays: days, time, intervalWeeks, repeatUntil }}
                onChange={(next) => {
                  setConflicts([]);
                  setDays(next.weekdays);
                  setDaysTouched(true);
                  setTime(next.time);
                  setIntervalWeeks(next.intervalWeeks);
                  setRepeatUntil(next.repeatUntil);
                }}
                minDate={new Date().toISOString().slice(0, 10)}
                startDay={new Date().toISOString().slice(0, 10)}
                errors={validateWorkoutSchedule(
                  { repeats: true, weekdays: days, time, intervalWeeks, repeatUntil },
                  new Date().toISOString().slice(0, 10),
                )}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => {
                  setConflicts([]);
                  setDuration(e.target.value);
                }}
                aria-label="Duration in minutes"
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>

            {conflicts.length > 0 && (
              <div className="mt-3 rounded-lg border border-[color:var(--severity-caution,#B45309)]/40 bg-muted p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  That slot is taken
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {describeConflicts(conflicts)} already {conflicts.length === 1 ? "runs" : "run"}{" "}
                  then. Replace it, or move this one to {formatRoutineTime(shiftedTime)}.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      schedule.mutate({ at: time, replaceIds: conflicts.map((c) => c.id) })
                    }
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Overwrite
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setTime(shiftedTime);
                      schedule.mutate({ at: shiftedTime });
                    }}
                    className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
                  >
                    Shift to {formatRoutineTime(shiftedTime)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflicts([])}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={busy || days.length === 0 || picks.length === 0}
              onClick={requestSchedule}
              className="tap-target mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50"
            >
              {schedule.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              )}
              Add to calendar
            </button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
