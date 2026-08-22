import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Camera, ChevronRight, FlaskConical, Ruler } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProgressTabs } from "@/components/progress-tabs";
import { InsightsGrid } from "@/components/insights/insights-grid";
import { fetchInsightsData, emptyInsights } from "@/lib/insights/data";
import { useChartMotionProfile } from "@/hooks/use-chart-motion";
import { ChartMotionContext } from "@/lib/insights/chart-motion";
import { INSIGHT_WINDOWS, windowLabel, type InsightWindow } from "@/lib/insights/aggregate";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/progress")({
  errorComponent: routeErrorComponent("progress"),
  head: () => ({
    meta: [
      { title: "Progress — DoseRoutine" },
      {
        name: "description",
        content:
          "One place to answer is it working: body trends, progress photos, blood work, check-ins, side effects and adherence.",
      },
    ],
  }),
  component: ProgressPage,
});

const QUICK_LINKS = [
  {
    to: "/body-metrics",
    label: "Body metrics",
    body: "Weight, waist, body fat and the trend line behind them.",
    icon: Ruler,
  },
  {
    to: "/progress-photos",
    label: "Progress photos",
    body: "Side-by-side comparison against your protocol history.",
    icon: Camera,
  },
  {
    to: "/labs",
    label: "Blood work",
    body: "Lab markers over time with out-of-range flags.",
    icon: FlaskConical,
  },
  {
    to: "/checkins",
    label: "Check-ins",
    body: "How you felt — energy, sleep, mood, libido.",
    icon: Activity,
  },
  {
    to: "/side-effects",
    label: "Side effects",
    body: "What you logged, and whether it is fading or building.",
    icon: AlertTriangle,
  },
  {
    to: "/adherence",
    label: "Adherence",
    body: "Doses taken versus doses scheduled.",
    icon: Activity,
  },
] as const;

function ProgressPage() {
  const [days, setDays] = useState<InsightWindow>(90);
  const chartMotion = useChartMotionProfile();

  const { data, isLoading } = useQuery({
    queryKey: ["insights", days],
    queryFn: () => fetchInsightsData(days),
    staleTime: 60_000,
  });

  const view = data ?? emptyInsights(days);

  return (
    <ChartMotionContext.Provider value={chartMotion}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <PageHeader title="Progress" />
        <p className="mt-3 text-sm text-muted-foreground">
          Is it working? Everything you track about your body and how you feel, on one screen.
        </p>

        <ProgressTabs />

        <div
          role="tablist"
          aria-label="Progress time window"
          className="mt-4 flex flex-wrap gap-1.5"
        >
          {INSIGHT_WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={days === w}
              onClick={() => setDays(w)}
              className={`tap-target rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                days === w
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
              }`}
            >
              {windowLabel(w)}
            </button>
          ))}
        </div>

        <div className="mt-4" aria-busy={isLoading}>
          <InsightsGrid data={view} animate={chartMotion.animate} days={days} />
        </div>

        <h2 className="mt-8 font-display text-lg font-semibold">Go deeper</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {QUICK_LINKS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted"
              >
                <item.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.body}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ChartMotionContext.Provider>
  );
}
