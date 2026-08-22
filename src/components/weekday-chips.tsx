/**
 * Mon–Sun repeat picker shared by every place a session's days can change, so
 * the add sheet and the inline editor can never drift apart.
 */

import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/routine-schedule";

export function WeekdayChips({
  value,
  onToggle,
  label = "Days",
  size = "md",
}: {
  value: number[];
  onToggle: (day: number) => void;
  label?: string;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-8 min-w-9 px-2 text-[11px]" : "h-9 min-w-11 px-3 text-xs";
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {WEEKDAY_SHORT.map((short, day) => {
        const on = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onToggle(day)}
            aria-pressed={on}
            aria-label={WEEKDAY_NAMES[day]}
            className={`rounded-full font-medium ${cls} ${
              on
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
