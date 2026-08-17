import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { listGscSnapshots } from "@/lib/gsc-monitor.functions";
import {
  buildPublishImpactReport,
  buildPublishImpactSeries,
  isImprovement,
  PUBLISH_IMPACT_METRICS,
  toComparisonBars,
  type MetricComparison,
  type PublishImpactSnapshot,
} from "@/lib/publish-impact";


export const Route = createFileRoute("/_authenticated/admin/publish-impact")({
  head: () => ({
    meta: [
      { title: "Publish impact report — DoseRoutine" },
      {
        name: "description",
        content:
          "Internal before/after report of Search Console crawl and impression changes following a publish.",
      },
      { property: "og:title", content: "Publish impact report — DoseRoutine" },
      {
        property: "og:description",
        content: "Crawl and impression changes before vs. after a publish.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PublishImpactPage,
});

const STORAGE_KEY = "doseroutine.publishImpact.publishDate";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(value: number | null, decimals: number): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function PublishImpactPage() {
  const [publishDate, setPublishDate] = useState<string>(today());
  const [windowDays, setWindowDays] = useState<number>(14);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setPublishDate(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, publishDate);
  }, [publishDate]);

  const fetchSnapshots = useServerFn(listGscSnapshots);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "gsc-snapshots", 120],
    queryFn: () => fetchSnapshots({ data: { days: 120 } }),
    refetchInterval: 600_000,
  });

  const report = useMemo(
    () =>
      buildPublishImpactReport(
        (data?.rows ?? []) as unknown as PublishImpactSnapshot[],
        publishDate,
        windowDays,
      ),
    [data, publishDate, windowDays],
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Publish impact report</h1>
        <p className="text-sm text-muted-foreground">
          Pick the day you published. This compares the daily Search Console snapshots from the
          days before that date against the days since, so you can see whether crawling and
          impressions actually moved.
        </p>
      </header>

      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="publish-date">Publish date</Label>
          <Input
            id="publish-date"
            type="date"
            value={publishDate}
            max={today()}
            onChange={(e) => setPublishDate(e.target.value || today())}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="window-days">Days compared on each side</Label>
          <Input
            id="window-days"
            type="number"
            min={1}
            max={60}
            value={windowDays}
            onChange={(e) => setWindowDays(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading snapshots…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn’t load snapshots: {(error as Error).message}
        </p>
      )}

      {!isLoading && !error && (
        <>
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Summary</h2>
              {report.sitemapFetchedAfterPublish ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3" /> Google refetched the sitemap since publishing
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Clock className="size-3" /> No sitemap refetch recorded yet
                </Badge>
              )}
            </div>
            <p className="text-sm">{report.summary}</p>
            <p className="text-xs text-muted-foreground">
              {report.beforeCount} snapshot{report.beforeCount === 1 ? "" : "s"} before (
              {report.beforeRange ? `${report.beforeRange.start} → ${report.beforeRange.end}` : "none"}
              ) · {report.afterCount} snapshot{report.afterCount === 1 ? "" : "s"} after (
              {report.afterRange ? `${report.afterRange.start} → ${report.afterRange.end}` : "none"})
            </p>
          </Card>

          <ImpactCharts
            rows={(data?.rows ?? []) as unknown as PublishImpactSnapshot[]}
            metrics={report.metrics}
            publishDate={publishDate}
            windowDays={windowDays}
          />



          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Metric</th>
                  <th className="p-3">Before (avg)</th>
                  <th className="p-3">After (avg)</th>
                  <th className="p-3">Change</th>
                </tr>
              </thead>
              <tbody>
                {report.metrics.map((metric) => (
                  <tr key={metric.key} className="border-b border-border/50">
                    <td className="p-3 font-medium">{metric.label}</td>
                    <td className="p-3">{fmt(metric.before, metric.decimals)}</td>
                    <td className="p-3">{fmt(metric.after, metric.decimals)}</td>
                    <td className="p-3">
                      <ChangeCell metric={metric} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <p className="text-xs text-muted-foreground">
            Clicks and impressions come from Search Console’s trailing 28-day totals, and Google
            reports them with a two to three day delay — expect a week before a publish shows up
            clearly.
          </p>
        </>
      )}
    </div>
  );
}

function ChangeCell({ metric }: { metric: MetricComparison }) {
  if (metric.change === null) return <span className="text-muted-foreground">—</span>;
  const good = isImprovement(metric);
  const Icon = metric.change === 0 ? ArrowRight : metric.change > 0 ? ArrowUpRight : ArrowDownRight;
  const tone =
    good === null ? "text-muted-foreground" : good ? "text-primary" : "text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {metric.change > 0 ? "+" : ""}
      {fmt(metric.change, metric.decimals)}
      {metric.changePct !== null ? ` (${metric.changePct > 0 ? "+" : ""}${metric.changePct}%)` : ""}
    </span>
  );
}

const CHART_CONFIG = {
  before: { label: "Before publish", color: "hsl(var(--chart-2))" },
  after: { label: "After publish", color: "hsl(var(--chart-1))" },
  value: { label: "Average", color: "hsl(var(--chart-1))" },
} as const;

function ImpactCharts({
  rows,
  metrics,
  publishDate,
  windowDays,
}: {
  rows: PublishImpactSnapshot[];
  metrics: MetricComparison[];
  publishDate: string;
  windowDays: number;
}) {
  const [metricKey, setMetricKey] = useState<string>("impressions");
  const active = metrics.find((m) => m.key === metricKey) ?? metrics[0];

  const series = useMemo(
    () => buildPublishImpactSeries(rows, metricKey, publishDate, windowDays),
    [rows, metricKey, publishDate, windowDays],
  );
  const bars = useMemo(() => (active ? toComparisonBars(active) : []), [active]);

  const hasData = series.some((p) => p.value !== null);

  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-2">
        <h2 className="font-semibold">Trend around the publish date</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose metric to chart">
          {PUBLISH_IMPACT_METRICS.map((m) => (
            <Button
              key={m.key}
              size="sm"
              variant={m.key === metricKey ? "default" : "outline"}
              aria-pressed={m.key === metricKey}
              aria-label={`Chart ${m.label}`}
              onClick={() => setMetricKey(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">
          No snapshot values for this metric inside the selected window yet.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Daily snapshots — the dashed marker is your publish date.
            </p>
            <ChartContainer config={CHART_CONFIG} className="h-[260px] w-full">
              <LineChart data={series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  reversed={active?.lowerIsBetter && active.key === "avg_position"}
                  domain={["auto", "auto"]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine
                  x={publishDate}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{ value: "Publish", position: "insideTopRight", fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="before"
                  stroke="var(--color-before)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="after"
                  stroke="var(--color-after)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Window averages</p>
            <ChartContainer config={CHART_CONFIG} className="h-[260px] w-full">
              <BarChart data={bars} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="phase" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={44} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={6}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </Card>
  );
}
