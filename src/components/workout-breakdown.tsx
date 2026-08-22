import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  breakdownByActivity,
  breakdownByExercise,
  breakdownByFamily,
  type WorkoutLogRow,
  type WorkoutSetRow,
} from "@/lib/workout-stats";
import {
  distanceUnitLabel,
  formatDuration,
  fromKg,
  fromMetres,
  round,
  weightUnitLabel,
  type UnitSystem,
} from "@/lib/workout-types";
import { ExerciseArtThumbnail } from "@/components/exercise-art-lightbox";

type Mode = "family" | "activity" | "exercise";

const MODES: { key: Mode; label: string }[] = [
  { key: "family", label: "By family" },
  { key: "activity", label: "By activity" },
  { key: "exercise", label: "By exercise" },
];

/**
 * Progress totals sliced three ways: broad family, specific activity
 * (running / cycling / yoga / swimming …), and individual exercise.
 */
export function WorkoutBreakdown({
  logs,
  sets,
  units,
  windowLabel,
}: {
  logs: readonly WorkoutLogRow[];
  sets: readonly WorkoutSetRow[];
  units: UnitSystem;
  windowLabel: string;
}) {
  const [mode, setMode] = useState<Mode>("family");
  const wLabel = weightUnitLabel(units);
  const dLabel = distanceUnitLabel(units);

  const families = useMemo(() => breakdownByFamily(logs, sets), [logs, sets]);
  const activities = useMemo(() => breakdownByActivity(logs, sets), [logs, sets]);
  const exercises = useMemo(() => breakdownByExercise(logs, sets), [logs, sets]);

  const rows = mode === "family" ? families : mode === "activity" ? activities : [];
  const maxSessions = Math.max(
    1,
    ...rows.map((r) => r.sessions),
    ...exercises.map((e) => e.sessions),
  );

  const isEmpty = mode === "exercise" ? exercises.length === 0 : rows.length === 0;

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Breakdown</h2>
        <span className="text-[11px] text-muted-foreground">{windowLabel}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Completed sessions only — see where your training time actually goes.
      </p>

      <div role="tablist" aria-label="Breakdown grouping" className="mb-3 flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={mode === m.key}
            onClick={() => setMode(m.key)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              mode === m.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nothing completed in this window yet.
        </p>
      ) : mode === "exercise" ? (
        <ul className="space-y-2">
          {exercises.slice(0, 12).map((row) => (
            <li key={row.key}>
              <div className="flex items-center gap-2">
                <ExerciseArtThumbnail
                  exercise={row.exercise}
                  size={36}
                  className="h-9 w-9 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{row.exercise}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {row.sessions} session{row.sessions === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (row.sessions / maxSessions) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {row.totalSets > 0 && `${row.totalSets} sets`}
                    {row.totalReps > 0 && ` · ${row.totalReps} reps`}
                    {row.volumeKg > 0 &&
                      ` · ${Math.round(fromKg(row.volumeKg, units)).toLocaleString()} ${wLabel} volume`}
                    {row.bestWeightKg != null &&
                      ` · best ${round(fromKg(row.bestWeightKg, units), 1)} ${wLabel}`}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{row.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.sessions} session{row.sessions === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (row.sessions / maxSessions) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatDuration(row.minutes)}
                {row.distanceM > 0 && ` · ${round(fromMetres(row.distanceM, units), 1)} ${dLabel}`}
                {row.volumeKg > 0 &&
                  ` · ${Math.round(fromKg(row.volumeKg, units)).toLocaleString()} ${wLabel} volume`}
                {row.calories > 0 && ` · ${Math.round(row.calories).toLocaleString()} kcal`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
