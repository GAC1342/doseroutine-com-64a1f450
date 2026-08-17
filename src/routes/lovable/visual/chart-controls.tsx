import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChartSeriesLegend,
  ChartVariantToggle,
  type ChartVariant,
} from "@/components/insights/chart-variants";

/**
 * Internal, noindex visual-regression harness.
 *
 * The real chart controls only mount on `/insights/$metric` once an account
 * has logged enough data, which makes them impossible to snapshot reliably in
 * CI. This page renders the exact same components with fixed props so the
 * accent (notably Neon Mint) can be pixel-diffed in light and dark mode.
 * Not linked from anywhere and excluded from the sitemap.
 */

const SERIES = [
  { key: "weight", label: "Weight" },
  { key: "bodyFat", label: "Body fat", dashed: true },
] as const;

const VARIANTS: readonly ChartVariant[] = ["area", "line", "bar", "stacked"];

function ChartControlsHarness() {
  const [variant, setVariant] = useState<ChartVariant>("area");
  const [hidden, setHidden] = useState<string[]>([]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-sm font-semibold text-muted-foreground">Chart controls harness</h1>

      <section data-testid="harness-variant-toggle">
        <ChartVariantToggle value={variant} onChange={setVariant} options={VARIANTS} />
      </section>

      <section data-testid="harness-legend">
        <ChartSeriesLegend
          series={SERIES}
          hiddenKeys={hidden}
          onToggle={(key) =>
            setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
          }
        />
      </section>

      <section data-testid="harness-legend-hidden">
        <ChartSeriesLegend series={SERIES} hiddenKeys={["bodyFat"]} onToggle={() => {}} />
      </section>
    </main>
  );
}

export const Route = createFileRoute("/lovable/visual/chart-controls")({
  head: () => ({
    meta: [
      { title: "Chart controls harness" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ChartControlsHarness,
});
