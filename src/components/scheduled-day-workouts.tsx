/**
 * The scheduled half of a calendar day: what is *planned*, not yet logged.
 *
 * Previously this was a single grey line ("2:02 PM · Workout · Strength"),
 * which told a user nothing about what they were meant to do. Now each planned
 * workout expands into its actual movements with the same reference
 * illustrations the exercise library uses, a session with no routine attached
 * says so and links to the editor, and the whole block shows skeleton rows
 * while the routine templates are still loading instead of a blank gap.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Dumbbell, Pencil, Play, Trash2, UtensilsCrossed } from "lucide-react";

import { ExerciseArtThumbnail } from "@/components/exercise-art-lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingStatus } from "@/components/skeletons";
import { formatRoutineTime, type RoutineOccurrence } from "@/lib/routine-schedule";
import {
  plannedSessionsForDay,
  summarizePlannedSession,
  type PlannedSession,
} from "@/lib/planned-day-exercises";
import { fetchWorkoutTemplates } from "@/lib/workout-templates";
import type { WorkoutTemplate } from "@/lib/workout-templates";
import { fromKg, weightUnitLabel, type UnitSystem } from "@/lib/workout-types";

function SessionSkeleton() {
  return (
    <li className="rounded-xl border border-dashed border-border p-3" aria-hidden="true">
      <Skeleton className="h-4 w-2/3" />
      <div className="mt-2 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </li>
  );
}

/**
 * Empty states are deliberately three different messages: "no routine
 * attached" is a user action, "routine attached but empty" is a different user
 * action, and "we couldn't load it" is our problem and offers a retry.
 */
function SessionEmpty({
  session,
  failed,
  onRetry,
}: {
  session: PlannedSession;
  failed: boolean;
  onRetry: () => void;
}) {
  if (failed) {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Couldn&apos;t load this session&apos;s exercises.{" "}
          <button type="button" onClick={onRetry} className="font-semibold text-primary underline">
            Retry
          </button>
        </span>
      </p>
    );
  }
  if (session.templateId) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        {session.templateName ?? "This routine"} has no exercises saved yet.{" "}
        <Link
          to="/fitness"
          search={{ view: "routine", routine: session.sessionId }}
          className="font-semibold text-primary"
        >
          Edit the routine
        </Link>
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      No routine attached to this session yet.{" "}
      <Link
        to="/fitness"
        search={{ view: "routine", routine: session.sessionId }}
        className="font-semibold text-primary"
      >
        Add exercises
      </Link>
    </p>
  );
}

function SessionCard({
  session,
  failed,
  onRetry,
  onStart,
  onEdit,
  onRemove,
}: {
  session: PlannedSession;
  failed: boolean;
  onRetry: () => void;
  onStart: (session: PlannedSession) => void;
  onEdit: (session: PlannedSession) => void;
  onRemove: (session: PlannedSession) => void;
}) {
  const summary = summarizePlannedSession(session);
  return (
    <li className="rounded-xl border border-dashed border-border p-3" data-session={session.key}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            <span className="text-muted-foreground">{formatRoutineTime(session.time)}</span>{" "}
            {session.label}
          </p>
          {summary && <p className="mt-0.5 text-xs text-muted-foreground">{summary}</p>}
        </div>
        <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
          {session.sessionKind ?? "workout"}
        </span>
      </div>

      {session.exercises.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {session.exercises.map((exercise, index) => (
            <li
              key={`${session.key}:${exercise.name}:${index}`}
              className="flex items-center gap-2 text-xs text-muted-foreground"
              data-planned-exercise={exercise.name}
            >
              <ExerciseArtThumbnail
                exercise={exercise.name}
                size={36}
                className="h-9 w-9 rounded-md"
              />
              <span className="min-w-0">
                <span className="font-medium text-foreground">{exercise.name}</span>
                {exercise.detail ? ` — ${exercise.detail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <SessionEmpty session={session} failed={failed} onRetry={onRetry} />
      )}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        {session.exercises.length > 0 && (
          <button
            type="button"
            onClick={() => onStart(session)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start workout
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(session)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {session.templateId ? "Edit routine" : "Add exercises"}
        </button>
        <button
          type="button"
          aria-label={`Remove ${session.label} from this day`}
          onClick={() => onRemove(session)}
          className="ml-auto rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function ScheduledDayWorkouts({
  occurrences,
  units,
  showMeals = true,
  isLoading = false,
  completedTitles = [],
  onStart,
  onEdit,
  onRemove,
}: {
  occurrences: RoutineOccurrence[];
  units: UnitSystem;
  /** Meals get their own row and their own show/hide toggle in the day header. */
  showMeals?: boolean;
  /** True while the day's routine rows themselves are still being fetched. */
  isLoading?: boolean;
  completedTitles?: string[];
  onStart?: (session: PlannedSession, template: WorkoutTemplate) => void;
  onEdit?: (session: PlannedSession, template: WorkoutTemplate | null) => void;
  onRemove?: (session: PlannedSession) => void;
}) {
  const templates = useQuery({ queryKey: ["workout-templates"], queryFn: fetchWorkoutTemplates });

  const sessions = useMemo(
    () =>
      plannedSessionsForDay(occurrences, templates.data ?? [], {
        toDisplay: (kg) => fromKg(kg, units),
        label: weightUnitLabel(units),
      }).filter(
        (session) =>
          !completedTitles.some(
            (title) => title.trim().toLowerCase() === session.label.trim().toLowerCase(),
          ),
      ),
    [occurrences, templates.data, units, completedTitles],
  );

  const meals = occurrences.filter((occ) => occ.kind === "meal");
  const pending = isLoading || (occurrences.length > 0 && templates.isLoading);

  if (pending) {
    return (
      <div className="mb-3 space-y-2" aria-busy="true" data-testid="scheduled-day-loading">
        <LoadingStatus label="Loading what's scheduled for this day…" />
        <ul className="space-y-2">
          <SessionSkeleton />
        </ul>
      </div>
    );
  }

  if (sessions.length === 0 && (meals.length === 0 || !showMeals)) return null;

  return (
    <div className="mb-3 space-y-2" data-testid="scheduled-day">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" /> Scheduled
      </p>

      {sessions.length > 0 && (
        <ul className="space-y-2" aria-label="Scheduled workouts">
          {sessions.map((session) => (
            <SessionCard
              key={session.key}
              session={session}
              failed={templates.isError}
              onRetry={() => void templates.refetch()}
              onStart={(picked) => {
                const template = (templates.data ?? []).find(
                  (item) => item.id === picked.templateId,
                );
                if (template) onStart?.(picked, template);
              }}
              onEdit={(picked) => {
                const template =
                  (templates.data ?? []).find((item) => item.id === picked.templateId) ?? null;
                onEdit?.(picked, template);
              }}
              onRemove={(picked) => onRemove?.(picked)}
            />
          ))}
        </ul>
      )}

      {showMeals && meals.length > 0 && (
        <ul
          className="space-y-1.5 rounded-xl border border-dashed border-border p-2.5"
          aria-label="Scheduled meals"
        >
          {meals.map((meal) => (
            <li key={meal.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="font-medium text-foreground">{formatRoutineTime(meal.time)}</span>
              <span className="truncate">{meal.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
