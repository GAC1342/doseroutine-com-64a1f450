import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DeltaBadge } from "@/components/insights/insight-card";
import { SupplyBars } from "@/components/insights/insight-charts";
import {
  ChartSeriesLegend,
  ChartVariantToggle,
  VariantChart,
  type ChartVariant,
} from "@/components/insights/chart-variants";
import { useChartMotionProfile } from "@/hooks/use-chart-motion";
import { ChartMotionContext } from "@/lib/insights/chart-motion";
import { emptyInsights, fetchInsightsData, type InsightsData } from "@/lib/insights/data";
import {
  deltaAcross,
  formatCompact,
  hasData,
  INSIGHT_WINDOWS,
  latest,
  round,
  total,
  windowLabel,
  type Delta,
  type InsightWindow,
  type SeriesPoint,
} from "@/lib/insights/aggregate";
import { insightMetric, type InsightMetricMeta } from "@/lib/insights/metrics";
import { insightUnits } from "@/lib/insights/units";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/insights/$metric")({
  errorComponent: routeErrorComponent("insights-metric", "This insight couldn't load"),
  validateSearch: (search: Record<string, unknown>): { days?: InsightWindow; at?: string } => {
    const raw = Number(search["days"]);
    const days = (INSIGHT_WINDOWS as readonly number[]).includes(raw)
      ? (raw as InsightWindow)
      : undefined;
    const at = typeof search["at"] === "string" && search["at"] ? String(search["at"]) : undefined;
    return { ...(days ? { days } : {}), ...(at ? { at } : {}) };
  },
  loader: ({ params }) => {
    const meta = insightMetric(params.metric);
    if (!meta) throw notFound();
    return { meta };
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.meta.title} insight — DoseRoutine`
      : "Insight — DoseRoutine";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: loaderData?.meta.blurb ?? "Detailed view of one of your tracked metrics.",
        },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: MetricDetailPage,
  notFoundComponent: UnknownMetric,
});

function UnknownMetric() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
      <h1 className="font-display text-xl font-semibold">That insight doesn&apos;t exist</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a chart from the dashboard to drill into it.
      </p>
      <Link
        to="/insights"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to insights
      </Link>
    </div>
  );
}

interface Stat {
  label: string;
  value: string;
}

/** Chart + stats for one metric, derived from the shared insights payload. */
function useMetricView(meta: InsightMetricMeta, data: InsightsData, animate: boolean) {
  return useMemo(() => {
    const bucketWord = data.bucket === "day" ? "day" : "week";
    const u = insightUnits(data);
    /** Every stat block is rendered through one shared unit formatter. */
    const seriesStats = (points: SeriesPoint[], format: (v: number) => string): Stat[] => {
      const values = points.map((p) => p.value).filter((v): v is number => v != null);
      if (values.length === 0) return [];
      const sum = values.reduce((s, v) => s + v, 0);
      return [
        { label: "Latest", value: format(values[values.length - 1]!) },
        { label: "Average", value: format(sum / values.length) },
        { label: "Best", value: format(Math.max(...values)) },
        { label: "Lowest", value: format(Math.min(...values)) },
      ];
    };

    switch (meta.slug) {
      case "adherence": {
        const now = latest(data.adherence);
        return {
          headline: u.percent(now),
          caption: `Doses taken on schedule per ${bucketWord}`,
          delta: deltaAcross(data.adherence, "avg") as Delta,
          deltaGoodWhen: "up" as const,
          empty: !hasData(data.adherence),
          emptyText: "Log a few doses and your adherence trend appears here.",
          stats: seriesStats(data.adherence, (v) => u.percent(v)),
          table: data.adherence,
          tableSuffix: "%",
          formatValue: (v: number) => u.percent(v),
          chartData: data.adherence as unknown as Record<string, unknown>[],
          series: [{ key: "value", label: "Adherence" }],
          valueSuffix: "%",
          variants: ["area", "line", "bar", "stacked"] as ChartVariant[],
        };
      }
      case "doses":
        return {
          headline: u.count(total(data.dosesLogged)),
          caption: "Confirmed doses this window",
          delta: deltaAcross(data.dosesLogged, "sum") as Delta,
          deltaGoodWhen: "up" as const,
          empty: !hasData(data.dosesLogged),
          emptyText: "Nothing logged in this window yet.",
          stats: seriesStats(data.dosesLogged, (v) => u.count(v)),
          table: data.dosesLogged,
          tableSuffix: "",
          formatValue: (v: number) => u.count(v),
          chartData: data.dosesLogged as unknown as Record<string, unknown>[],
          series: [{ key: "value", label: "Doses" }],
          defaultVariant: "bar" as ChartVariant,
          allowDecimals: false,
          variants: ["bar", "line", "area", "stacked"] as ChartVariant[],
        };
      case "weight": {
        const now = latest(data.weight);
        const bodyData = data.weight.map((p, i) => ({
          label: p.label,
          weight: p.value,
          bodyFat: data.bodyFat[i]?.value ?? null,
        }));
        return {
          headline: u.weight(now),
          caption: "From your check-ins",
          delta: deltaAcross(data.weight, "avg") as Delta,
          deltaGoodWhen: "down" as const,
          empty: !hasData(data.weight),
          emptyText: "Add a check-in to start your body trend.",
          stats: seriesStats(data.weight, (v) => u.weight(v)),
          table: data.weight,
          tableSuffix: ` ${u.weightUnit}`,
          formatValue: (v: number) => u.weight(v),
          chartData: bodyData as unknown as Record<string, unknown>[],
          series: [
            { key: "weight", label: `Weight (${u.weightUnit})` },
            { key: "bodyFat", label: "Body fat (%)", dashed: true },
          ],
          valueSuffix: u.weightUnit,
          defaultVariant: "line" as ChartVariant,
          variants: ["line", "area", "bar", "stacked"] as ChartVariant[],
        };
      }
      case "training":
        return {
          headline: u.duration(total(data.trainingMinutes)),
          caption: u.count(total(data.sessions), "completed session"),
          delta: deltaAcross(data.trainingMinutes, "sum") as Delta,
          deltaGoodWhen: "up" as const,
          empty: !hasData(data.trainingMinutes),
          emptyText: "Log a workout to see your training volume.",
          stats: seriesStats(data.trainingMinutes, (v) => u.minutes(v)),
          table: data.trainingMinutes,
          tableSuffix: " min",
          formatValue: (v: number) => u.minutes(v),
          chartData: data.trainingMinutes as unknown as Record<string, unknown>[],
          series: [{ key: "value", label: "Minutes" }],
          valueSuffix: "min",
          defaultVariant: "bar" as ChartVariant,
          allowDecimals: false,
          variants: ["bar", "line", "area", "stacked"] as ChartVariant[],
        };
      case "rotation":
        return {
          headline: u.count(data.rotation.sites.length, "site"),
          caption: "Spread across sites to avoid overuse",
          empty: data.rotation.sites.length === 0,
          emptyText: "Log an injection site to see your rotation.",
          stats: data.rotation.sites.slice(0, 4).map((site) => ({
            label: site,
            value: u.count(
              data.rotation.data.reduce((sum, row) => sum + (Number(row[site]) || 0), 0),
              "shot",
            ),
          })),
          chartData: data.rotation.data as unknown as Record<string, unknown>[],
          series: data.rotation.sites.map((site) => ({ key: site, label: site })),
          stackAsBars: true,
          allowDecimals: false,
          defaultVariant: "stacked" as ChartVariant,
          variants: ["stacked", "bar", "line", "area"] as ChartVariant[],
        };
      case "supply":
        return {
          headline: data.vials.length ? `${u.count(data.vials.length)} tracked` : "—",
          caption: "Doses remaining before you reorder",
          empty: data.vials.length === 0,
          emptyText: "Add doses-per-vial to track your supply.",
          stats: data.vials.slice(0, 4).map((v) => ({
            label: v.label,
            value: v.note ?? `${u.count(v.value)} left`,
          })),
          chart: <SupplyBars rows={data.vials} warnBelow={5} />,
        };
      case "spend":
        return {
          headline: u.money(data.monthlySpendTotal),
          caption: "Estimated from vial price and dose frequency",
          empty: data.spend.length === 0,
          emptyText: "Add vial prices to see your monthly burn.",
          stats: data.spend.slice(0, 4).map((v) => ({
            label: v.label,
            value: v.note ?? u.moneyPerMonth(v.value),
          })),
          chart: <SupplyBars rows={data.spend} />,
        };
      case "body-fat":
      default: {
        const now = latest(data.bodyFat);
        return {
          headline: u.percent(now, 1),
          caption: "From your check-ins",
          delta: deltaAcross(data.bodyFat, "avg") as Delta,
          deltaGoodWhen: "down" as const,
          empty: !hasData(data.bodyFat),
          emptyText: "Record body fat in a check-in to track it.",
          stats: seriesStats(data.bodyFat, (v) => u.percent(v, 1)),
          table: data.bodyFat,
          tableSuffix: "%",
          formatValue: (v: number) => u.percent(v, 1),
          chartData: data.bodyFat as unknown as Record<string, unknown>[],
          series: [{ key: "value", label: "Body fat" }],
          valueSuffix: "%",
          variants: ["area", "line", "bar", "stacked"] as ChartVariant[],
        };
      }
    }
  }, [meta.slug, data]);
}

function MetricDetailPage() {
  const { meta } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const days: InsightWindow = search.days ?? 90;
  const focusedAt = search.at;
  const setDays = (w: InsightWindow) =>
    navigate({ search: (prev) => ({ ...prev, days: w }), replace: true });
  const chartMotion = useChartMotionProfile();
  const reducedMotion = !chartMotion.animate;

  const { data, isLoading } = useQuery({
    queryKey: ["insights", days],
    queryFn: () => fetchInsightsData(days),
    staleTime: 60_000,
  });

  const view = data ?? emptyInsights(days);
  const metric = useMetricView(meta, view, !reducedMotion);
  const variants = "variants" in metric ? metric.variants : undefined;
  const [variantChoice, setVariantChoice] = useState<ChartVariant | null>(null);
  const variant: ChartVariant =
    variantChoice && variants?.includes(variantChoice)
      ? variantChoice
      : ((("defaultVariant" in metric && metric.defaultVariant) ||
          variants?.[0] ||
          "area") as ChartVariant);
  const chartSeries = ("series" in metric ? metric.series : undefined) ?? [];
  const seriesSignature = chartSeries.map((s) => s.key).join("|");
  const [hiddenBySignature, setHiddenBySignature] = useState<Record<string, string[]>>({});
  const hiddenKeys = hiddenBySignature[seriesSignature] ?? [];
  const toggleSeries = (key: string) =>
    setHiddenBySignature((prev) => {
      const current = prev[seriesSignature] ?? [];
      return {
        ...prev,
        [seriesSignature]: current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key],
      };
    });
  const rows = "table" in metric && metric.table ? metric.table.filter((p) => p.value != null) : [];

  return (
    <ChartMotionContext.Provider value={chartMotion}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <PageHeader title={meta.title} />
        <p className="mt-2 text-sm text-muted-foreground">{meta.blurb}</p>

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
              className={`tap-target rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300 ease-out motion-reduce:transition-none ${
                days === w
                  ? "scale-105 border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
              }`}
            >
              {windowLabel(w)}
            </button>
          ))}
        </div>

        {focusedAt && (
          <div className="mt-3 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-foreground w-fit">
            <span className="font-medium">Focused on {focusedAt}</span>
            <button
              type="button"
              onClick={() =>
                navigate({ search: (prev) => ({ ...prev, at: undefined }), replace: true })
              }
              className="tap-target text-muted-foreground underline hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}

        <section
          className={`mt-4 rounded-2xl border border-border bg-card p-4 transition-opacity duration-300 ${
            isLoading ? "opacity-60" : "opacity-100"
          }`}
          aria-busy={isLoading}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-3xl font-semibold leading-tight">
                {metric.headline}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{metric.caption}</p>
            </div>
            {"delta" in metric && metric.delta && !metric.empty && (
              <DeltaBadge delta={metric.delta} goodWhen={metric.deltaGoodWhen} />
            )}
          </div>

          {((variants && variants.length > 1) || chartSeries.length > 1) && !metric.empty && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <ChartSeriesLegend
                series={chartSeries}
                hiddenKeys={hiddenKeys}
                onToggle={toggleSeries}
              />
              {variants && variants.length > 1 && (
                <ChartVariantToggle
                  value={variant}
                  onChange={setVariantChoice}
                  options={variants}
                  className="ml-auto"
                />
              )}
            </div>
          )}

          <div
            key={chartMotion.lite ? meta.slug : `${meta.slug}-${days}-${variant}`}
            className={`mt-4 min-h-[280px] [contain:layout_paint] ${
              chartMotion.lite ? "" : "animate-fade-in motion-reduce:animate-none"
            }`}
          >
            {metric.empty ? (
              <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
                {metric.emptyText}
              </div>
            ) : "chartData" in metric ? (
              <VariantChart
                data={metric.chartData ?? []}
                series={chartSeries}
                hiddenKeys={hiddenKeys}
                variant={variant}
                valueSuffix={"valueSuffix" in metric ? metric.valueSuffix : undefined}
                formatValue={
                  "formatValue" in metric && metric.formatValue
                    ? (v: number) => metric.formatValue(v)
                    : undefined
                }
                stackAsBars={"stackAsBars" in metric ? metric.stackAsBars : false}
                allowDecimals={"allowDecimals" in metric ? metric.allowDecimals : true}
                animate={!reducedMotion}
                ariaLabel={`${meta.title} — last ${days} days`}
              />
            ) : (
              metric.chart
            )}
          </div>

          {!metric.empty && (
            <p className="mt-2 hidden text-center text-[11px] text-muted-foreground [@media(hover:none)]:block">
              Tap and hold the chart, then slide to read values.
            </p>
          )}
        </section>

        {metric.stats.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metric.stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-3">
                <dt className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </dt>
                <dd className="mt-1 font-display text-lg font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {rows.length > 0 && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {windowLabel(days)} breakdown
            </h2>
            <ul className="mt-2 divide-y divide-border text-sm">
              {rows
                .slice()
                .reverse()
                .slice(0, 20)
                .map((p) => (
                  <li key={p.date} className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="tabular-nums font-medium">
                      {"formatValue" in metric && metric.formatValue
                        ? metric.formatValue(p.value ?? 0)
                        : `${round(p.value ?? 0, 1)}${metric.tableSuffix ?? ""}`}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <Link
          to={meta.appHref}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {meta.appLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </ChartMotionContext.Provider>
  );
}
