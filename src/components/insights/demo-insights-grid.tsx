import { useMemo } from "react";
import { InsightsGrid } from "@/components/insights/insights-grid";
import { buildDemoInsights } from "@/lib/insights/demo";

/** Sample-data Insights grid, split out so the charts load on demand. */
export function DemoInsightsGrid() {
  const demo = useMemo(() => buildDemoInsights(), []);
  return <InsightsGrid data={demo} showLinks={false} />;
}

export default DemoInsightsGrid;
