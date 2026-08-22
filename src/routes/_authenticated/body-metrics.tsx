import { createFileRoute, redirect } from "@tanstack/react-router";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/body-metrics")({
  errorComponent: routeErrorComponent("body-metrics"),
  beforeLoad: () => {
    throw redirect({ to: "/fitness", search: { view: "workout" } });
  },
  head: () => ({
    meta: [
      { title: "Body Metrics — DoseRoutine" },
      {
        name: "description",
        content:
          "Track your weight, body fat, measurements, and best lifts to see real progress from your stack.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => null,
});
