import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/body-metrics")({
  beforeLoad: () => {
    throw redirect({ to: "/fitness", search: { view: "workouts" } });
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
