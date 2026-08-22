import { AlertCircle, CalendarDays, Repeat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WeekdayChips } from "@/components/weekday-chips";
import { describeDays, formatRoutineTime } from "@/lib/routine-schedule";
import {
  describeEditScope,
  formatPreviewDay,
  previewOccurrences,
  type ScheduleErrors,
  type WorkoutEditScope,
} from "@/lib/workout-schedule-validation";

export type WorkoutScheduleValue = {
  repeats: boolean;
  weekdays: number[];
  time: string;
  intervalWeeks: number;
  repeatUntil: string;
};

function intervalLabel(interval: number) {
  if (interval === 1) return "Every week";
  if (interval === 2) return "Every other week";
  return `Every ${interval} weeks`;
}

export function workoutScheduleSummary(value: WorkoutScheduleValue) {
  if (!value.repeats) return "One-time workout";
  const time = value.time ? ` at ${formatRoutineTime(value.time)}` : "";
  const end = value.repeatUntil ? ` until ${value.repeatUntil}` : " with no end date";
  return `${intervalLabel(value.intervalWeeks)} on ${describeDays(value.weekdays)}${time}${end}`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-xs text-destructive">
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function WorkoutScheduleFields({
  value,
  onChange,
  minDate,
  showRepeatToggle = true,
  compact = false,
  disabled = false,
  errors = {},
  /** First day this workout can land on — anchors the live calendar preview. */
  startDay,
  scope,
  onScopeChange,
}: {
  value: WorkoutScheduleValue;
  onChange: (value: WorkoutScheduleValue) => void;
  minDate?: string;
  showRepeatToggle?: boolean;
  compact?: boolean;
  disabled?: boolean;
  errors?: ScheduleErrors;
  startDay?: string;
  scope?: WorkoutEditScope;
  onScopeChange?: (scope: WorkoutEditScope) => void;
}) {
  const repeats = showRepeatToggle ? value.repeats : true;
  const update = (patch: Partial<WorkoutScheduleValue>) => onChange({ ...value, ...patch });
  const anchor = startDay ?? minDate ?? new Date().toISOString().slice(0, 10);
  const preview = repeats ? previewOccurrences({ ...value, repeats: true }, anchor, 6) : [];

  return (
    <section className={compact ? "space-y-2" : "space-y-3"} aria-label="Workout schedule">
      {showRepeatToggle && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Repeat weekly</p>
            <p className="text-xs text-muted-foreground">Add this routine to one or more days.</p>
          </div>
          <Switch
            checked={value.repeats}
            disabled={disabled}
            aria-label="Repeat this workout"
            onCheckedChange={(checked) => update({ repeats: checked })}
          />
        </div>
      )}

      {repeats && scope && onScopeChange && (
        <div className="rounded-lg border border-border bg-muted/40 p-2.5">
          <p className="text-xs font-semibold text-foreground">Apply changes to</p>
          <div
            role="radiogroup"
            aria-label="Apply changes to"
            className="mt-1.5 grid grid-cols-2 gap-1.5"
          >
            {(
              [
                ["occurrence", "This workout only"],
                ["series", "All repeats"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={scope === key}
                disabled={disabled}
                onClick={() => onScopeChange(key)}
                className={`rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
                  scope === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{describeEditScope(scope)}</p>
        </div>
      )}

      {repeats && (
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Days</p>
            <WeekdayChips
              value={value.weekdays}
              label="Repeat days"
              size={compact ? "sm" : "md"}
              onToggle={(day) =>
                update({
                  weekdays: value.weekdays.includes(day)
                    ? value.weekdays.filter((item) => item !== day)
                    : [...value.weekdays, day].sort((a, b) => a - b),
                })
              }
            />
            <FieldError id="workout-schedule-days-error" message={errors.weekdays} />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              Time
              <Input
                type="time"
                value={value.time}
                disabled={disabled}
                aria-label="Workout time"
                aria-invalid={errors.time ? true : undefined}
                aria-describedby={errors.time ? "workout-schedule-time-error" : undefined}
                onChange={(event) => update({ time: event.target.value })}
                className="mt-1 h-9 text-foreground"
              />
              <FieldError id="workout-schedule-time-error" message={errors.time} />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Frequency
              <select
                value={value.intervalWeeks}
                disabled={disabled}
                aria-label="Repeat frequency"
                onChange={(event) => update({ intervalWeeks: Number(event.target.value) })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value={1}>Every week</option>
                <option value={2}>Every other week</option>
                <option value={3}>Every 3 weeks</option>
                <option value={4}>Every 4 weeks</option>
              </select>
              <FieldError id="workout-schedule-interval-error" message={errors.intervalWeeks} />
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Repeat until (optional)
              <Input
                type="date"
                value={value.repeatUntil}
                min={minDate}
                disabled={disabled}
                aria-label="Repeat until"
                aria-invalid={errors.repeatUntil ? true : undefined}
                aria-describedby={errors.repeatUntil ? "workout-schedule-end-error" : undefined}
                onChange={(event) => update({ repeatUntil: event.target.value })}
                className="mt-1 h-9 text-foreground"
              />
            </label>
            <FieldError id="workout-schedule-end-error" message={errors.repeatUntil} />
            {value.repeatUntil && (
              <Button
                type="button"
                variant="link"
                size="sm"
                disabled={disabled}
                onClick={() => update({ repeatUntil: "" })}
                className="mt-1 h-auto px-0 text-xs"
              >
                No end date
              </Button>
            )}
          </div>

          {/* Live preview — exactly which dates this rule will schedule. */}
          <div data-testid="workout-schedule-preview">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Next dates this schedules
            </p>
            {preview.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Pick at least one day to see the dates this will schedule.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {preview.map((dayKey) => (
                  <li
                    key={dayKey}
                    data-preview-day={dayKey}
                    className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-foreground"
                  >
                    {formatPreviewDay(dayKey)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <p className="flex items-start gap-1.5 rounded-md bg-muted px-2.5 py-2 text-xs text-foreground">
        {repeats ? (
          <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        )}
        <span>{workoutScheduleSummary({ ...value, repeats })}</span>
      </p>
    </section>
  );
}
