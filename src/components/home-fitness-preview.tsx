import { WORKOUT_FAMILY_LABELS, type WorkoutFamily } from "@/lib/workout-types";
import { Flame, Scale } from "lucide-react";

const FAMILY_DOT_CLASS: Record<WorkoutFamily, string> = {
  strength: "bg-primary",
  cardio: "bg-[color:var(--streak,#B45309)]",
  mindbody: "bg-primary/50",
  sport: "bg-foreground/70",
  other: "bg-muted-foreground",
};

/** Which families were "logged" on each of the 35 mock calendar cells. */
const MOCK_DAYS: (WorkoutFamily[] | null)[] = [
  null,
  ["strength"],
  ["cardio"],
  null,
  ["strength"],
  ["mindbody"],
  null,
  ["strength", "cardio"],
  null,
  ["cardio"],
  ["strength"],
  null,
  ["sport"],
  ["mindbody"],
  ["strength"],
  ["cardio"],
  null,
  ["strength", "mindbody"],
  ["cardio"],
  null,
  ["sport"],
  ["strength"],
  ["mindbody"],
  ["cardio"],
  null,
  ["strength"],
  ["cardio"],
  ["mindbody"],
  ["strength"],
  null,
  ["cardio"],
  ["strength"],
  ["sport"],
  null,
  null,
];

const LEGEND: WorkoutFamily[] = ["strength", "cardio", "mindbody", "sport"];

/**
 * Static, non-interactive illustration of the Fitness & Body page for the
 * marketing homepage. Uses the same family colours as the real calendar.
 */
export function HomeFitnessPreview() {
  return (
    <div
      aria-hidden="true"
      className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">This month</div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
          <Flame className="h-3.5 w-3.5" />
          18-day streak
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {MOCK_DAYS.map((families, index) => {
          const dayNumber = index + 1;
          const inMonth = dayNumber <= 31;
          return (
            <div
              key={index}
              className={`flex h-8 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] ${
                inMonth && families ? "bg-muted/60 text-foreground" : "text-muted-foreground"
              }`}
            >
              <span>{inMonth ? dayNumber : ""}</span>
              <span className="flex h-1 items-center gap-0.5">
                {inMonth &&
                  families?.map((family) => (
                    <span
                      key={family}
                      className={`h-1 w-1 rounded-full ${FAMILY_DOT_CLASS[family]}`}
                    />
                  ))}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
        {LEGEND.map((family) => (
          <span
            key={family}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${FAMILY_DOT_CLASS[family]}`} />
            {WORKOUT_FAMILY_LABELS[family]}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Scale className="h-3.5 w-3.5" />
            Body weight
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">184.2 lb</div>
          <div className="text-[11px] text-muted-foreground">−3.1 lb in 30 days</div>
        </div>
        <div className="rounded-2xl border border-border p-3">
          <div className="text-[11px] text-muted-foreground">Volume this week</div>
          <div className="mt-1 text-lg font-semibold text-foreground">41,800 lb</div>
          <div className="text-[11px] text-muted-foreground">3 strength sessions · avg RPE 7.4</div>
        </div>
      </div>
    </div>
  );
}
