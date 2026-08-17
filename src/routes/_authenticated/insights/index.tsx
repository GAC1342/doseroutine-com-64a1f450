import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { InsightsGrid } from "@/components/insights/insights-grid";
import { fetchInsightsData, emptyInsights } from "@/lib/insights/data";
import { useChartMotionProfile } from "@/hooks/use-chart-motion";
import { ChartMotionContext } from "@/lib/insights/chart-motion";
import { INSIGHT_WINDOWS, windowLabel, type InsightWindow } from "@/lib/insights/aggregate";

export const Route = createFileRoute("/_authenticated/insights/")({
  head: () => ({
    meta: [
      { title: "Insights — DoseRoutine" },
      {
        name: "description",
        content:
          "Live charts for adherence, body trends, training volume, injection rotation, vial supply and monthly spend.",
      },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
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
      <PageHeader title="Insights" />
      <p className="mt-3 text-sm text-muted-foreground">
        Everything you track, on one screen — so you can see what&apos;s actually working.
      </p>

      <div
        role="tablist"
        aria-label="Insights time window"
        className="mt-4 flex flex-wrap gap-1.5"
      >
        {INSIGHT_WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            role="tab"
            aria-selected={days === w}
            onClick={() => setDays(w)}
            className={`tap-target rounded-full border px-3 py-1 text-xs font-medium transition-[transform,background-color,color,border-color] duration-200 ease-out will-change-transform motion-reduce:transition-none ${
              days === w
                ? "scale-105 border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {windowLabel(w)}
          </button>
        ))}
      </div>

      <div
        className={`mt-4 transition-opacity duration-300 ${isLoading ? "opacity-60" : "opacity-100"}`}
        aria-busy={isLoading}
      >
        <InsightsGrid
          data={view}
          animate={chartMotion.animate}
          animationKey={chartMotion.lite || isLoading ? undefined : days}
          days={days}
        />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Charts summarise what you have logged. They are not medical advice — talk to a clinician
        before changing anything.
      </p>
    </div>
    </ChartMotionContext.Provider>
  );
}
