import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Timer as TimerIcon } from "lucide-react";
import { WorkoutTimer } from "@/components/workout-timer";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/timer")({
  errorComponent: routeErrorComponent("timer"),
  head: () => ({
    meta: [
      { title: "Interval & Tabata Timer — DoseRoutine" },
      {
        name: "description",
        content:
          "Run Tabata, HIIT, EMOM, and rest-between-sets timers with sound and vibration cues and a lock-screen friendly big view.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TimerPage,
});

function TimerPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <Link
        to="/fitness"
        search={{ view: "workouts" } as never}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to fitness
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <TimerIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interval timer</h1>
          <p className="text-sm text-muted-foreground">
            Tabata, HIIT, EMOM, or your own rounds — with beeps and buzzes.
          </p>
        </div>
      </div>

      <WorkoutTimer />
    </div>
  );
}
