import { memo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Scatter,
  Line,
  LineChart,
  ReferenceLine,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useSeriesMotion } from "@/lib/insights/chart-motion";
import type { SeriesPoint } from "@/lib/insights/aggregate";

/** Recharts keyboard/tooltip accessibility: Tab to the plot, arrows to scrub. */
function a11yChart(label: string) {
  return {
    accessibilityLayer: true,
    role: "application" as const,
    "aria-label": `${label}. Interactive chart — press Tab to focus, then use the left and right arrow keys to move between data points.`,
  };
}

const ACCENT = "var(--primary)";
const MUTED = "var(--muted-foreground)";

/** Shared height so cards never shift while data loads. */
export const CHART_HEIGHT = "h-[132px]";

/** Vertical crosshair that follows the pointer on line/area charts. */
const HOVER_CURSOR = {
  stroke: ACCENT,
  strokeOpacity: 0.45,
  strokeWidth: 1.5,
  strokeDasharray: "4 4",
} as const;

/** Highlight drawn behind the hovered bar. */
const ACTIVE_BAR = <Rectangle fill={ACCENT} fillOpacity={0.85} stroke={ACCENT} strokeWidth={1} />;

const BAR_CURSOR = { fill: ACCENT, fillOpacity: 0.08 } as const;

/**
 * Shared draw-in motion lives in the chart-motion budget so phones can use a
 * shorter, cheaper draw-in than desktop.
 */

/** Wires Recharts' chart-level click to a label callback (click-to-drilldown). */
function chartClickProps(onPointClick?: (label: string) => void) {
  if (!onPointClick) return {};
  return {
    style: { cursor: "pointer" },
    onClick: (
      state: { activeLabel?: string | number } | undefined,
      event?: { stopPropagation?: () => void },
    ) => {
      const label = state?.activeLabel;
      if (label != null && label !== "") event?.stopPropagation?.();
      if (label != null && label !== "") onPointClick(String(label));
    },
  } as const;
}

function axisProps() {
  return {
    tickLine: false,
    axisLine: false,
    tick: { fontSize: 10 },
    minTickGap: 24,
  } as const;
}

export const TrendAreaChart = memo(function TrendAreaChart({
  points,
  name,
  valueSuffix,
  className,
  animate = true,
  onPointClick,
}: {
  points: readonly SeriesPoint[];
  name: string;
  valueSuffix?: string;
  className?: string;
  animate?: boolean;
  onPointClick?: (label: string) => void;
}) {
  const motion = useSeriesMotion(animate);
  const gradientId = `insight-grad-${name.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <ChartContainer
      config={{ value: { label: name, color: ACCENT } }}
      className={cn("aspect-auto w-full", CHART_HEIGHT, className)}
    >
      <AreaChart
        {...a11yChart(name)}
        data={points as SeriesPoint[]}
        margin={{ top: 6, right: 6, bottom: 0, left: -8 }}
        {...chartClickProps(onPointClick)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={MUTED} strokeOpacity={0.18} />
        <XAxis dataKey="label" {...axisProps()} />
        <YAxis width={46} {...axisProps()} />
        <ChartTooltip
          cursor={HOVER_CURSOR}
          content={
            <ChartTooltipContent
              labelKey="label"
              formatter={(v) => {
                const n = Number(v);
                if (!Number.isFinite(n)) return "—";
                const isPercent = valueSuffix?.trim().startsWith("%");
                const rounded = n.toLocaleString(undefined, {
                  maximumFractionDigits: isPercent ? 0 : 1,
                });
                return `${rounded}${valueSuffix ? `${isPercent ? "" : " "}${valueSuffix.trim()}` : ""}`;
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          name={name}
          stroke={ACCENT}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          connectNulls
          {...motion()}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
});

export const TrendMultiLineChart = memo(function TrendMultiLineChart({
  data,
  series,
  className,
  animate = true,
  onPointClick,
}: {
  data: ReadonlyArray<Record<string, unknown>>;
  series: ReadonlyArray<{ key: string; label: string; color?: string; dashed?: boolean }>;
  className?: string;
  animate?: boolean;
  onPointClick?: (label: string) => void;
}) {
  const motion = useSeriesMotion(animate);
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color ?? ACCENT }]),
  );
  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", CHART_HEIGHT, className)}>
      <LineChart
        {...a11yChart(series.map((s) => s.label).join(", "))}
        data={data as Record<string, unknown>[]}
        margin={{ top: 6, right: 6, bottom: 0, left: -8 }}
        {...chartClickProps(onPointClick)}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={MUTED} strokeOpacity={0.18} />
        <XAxis dataKey="label" {...axisProps()} />
        <YAxis width={46} {...axisProps()} />
        <ChartTooltip cursor={HOVER_CURSOR} content={<ChartTooltipContent labelKey="label" />} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? ACCENT}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "4 3" : undefined}
            strokeOpacity={s.dashed ? 0.75 : 1}
            connectNulls
            {...motion(i)}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
});

export const SeriesBarChart = memo(function SeriesBarChart({
  points,
  name,
  className,
  animate = true,
  onPointClick,
}: {
  points: readonly SeriesPoint[];
  name: string;
  className?: string;
  animate?: boolean;
  onPointClick?: (label: string) => void;
}) {
  const motion = useSeriesMotion(animate);
  return (
    <ChartContainer
      config={{ value: { label: name, color: ACCENT } }}
      className={cn("aspect-auto w-full", CHART_HEIGHT, className)}
    >
      <BarChart
        {...a11yChart(name)}
        data={points as SeriesPoint[]}
        margin={{ top: 6, right: 6, bottom: 0, left: -8 }}
        {...chartClickProps(onPointClick)}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={MUTED} strokeOpacity={0.18} />
        <XAxis dataKey="label" {...axisProps()} />
        <YAxis width={46} allowDecimals={false} {...axisProps()} />
        <ChartTooltip cursor={BAR_CURSOR} content={<ChartTooltipContent labelKey="label" />} />
        <Bar
          dataKey="value"
          name={name}
          fill={ACCENT}
          fillOpacity={0.65}
          radius={[3, 3, 0, 0]}
          activeBar={ACTIVE_BAR}
          {...motion()}
        />
      </BarChart>
    </ChartContainer>
  );
});

/** Horizontal progress bars — used for vial supply and cycle position. */
export const SupplyBars = memo(function SupplyBars({
  rows,
  suffix,
  warnBelow,
}: {
  rows: ReadonlyArray<{ label: string; value: number; max: number; note?: string }>;
  suffix?: string;
  warnBelow?: number;
}) {
  return (
    <ul className={cn("flex flex-col justify-center gap-2.5", CHART_HEIGHT, "overflow-hidden")}>
      {rows.map((row) => {
        const pct = row.max > 0 ? Math.min(100, Math.max(2, (row.value / row.max) * 100)) : 2;
        const low = warnBelow != null && row.value <= warnBelow;
        return (
          <li
            key={row.label}
            className="group cursor-default rounded-md px-1 py-0.5 -mx-1 transition-colors hover:bg-muted/60"
            title={`${row.label}: ${row.note ?? `${Math.round(row.value)}${suffix ? ` ${suffix}` : ""}`}`}
          >
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium">{row.label}</span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  low ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {row.note ?? `${Math.round(row.value)}${suffix ? ` ${suffix}` : ""}`}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300 group-hover:brightness-110",
                  low ? "bg-destructive" : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
});

/** Dot-per-day rotation strip for injection sites. */
export const RotationChart = memo(function RotationChart({
  data,
  sites,
  className,
  animate = true,
  onPointClick,
}: {
  data: ReadonlyArray<Record<string, unknown>>;
  sites: readonly string[];
  className?: string;
  animate?: boolean;
  onPointClick?: (label: string) => void;
}) {
  const motion = useSeriesMotion(animate);
  return (
    <ChartContainer
      config={{ count: { label: "Injections", color: ACCENT } }}
      className={cn("aspect-auto w-full", CHART_HEIGHT, className)}
    >
      <BarChart
        {...a11yChart("Injections by site")}
        data={data as Record<string, unknown>[]}
        margin={{ top: 6, right: 6, bottom: 0, left: -8 }}
        {...chartClickProps(onPointClick)}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={MUTED} strokeOpacity={0.18} />
        <XAxis dataKey="label" {...axisProps()} />
        <YAxis width={46} allowDecimals={false} {...axisProps()} />
        <ChartTooltip cursor={BAR_CURSOR} content={<ChartTooltipContent labelKey="label" />} />
        <ReferenceLine y={0} stroke={MUTED} strokeOpacity={0.3} />
        {sites.map((site, i) => (
          <Bar
            key={site}
            dataKey={site}
            stackId="sites"
            name={site}
            fill={ACCENT}
            fillOpacity={1 - i * 0.13}
            radius={i === sites.length - 1 ? [3, 3, 0, 0] : undefined}
            activeBar={<Rectangle fillOpacity={1} stroke={ACCENT} strokeWidth={1} />}
            {...motion(i)}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
});

/**
 * Nutrition against the rest of the protocol: calories as bars, protein and
 * training minutes as lines, and a marker for each bucket where doses were
 * logged — all on one shared timeline so patterns line up visually.
 */
export const NutritionProtocolChart = memo(function NutritionProtocolChart({
  data,
  className,
  animate = true,
}: {
  data: ReadonlyArray<Record<string, unknown>>;
  className?: string;
  animate?: boolean;
}) {
  const motion = useSeriesMotion(animate);
  return (
    <ChartContainer
      config={{
        calories: { label: "Calories", color: ACCENT },
        protein: { label: "Protein (g)", color: "var(--chart-2)" },
        training: { label: "Training (min)", color: "var(--chart-4)" },
        doses: { label: "Doses logged", color: "var(--chart-5)" },
      }}
      className={cn("aspect-auto w-full h-[180px]", className)}
    >
      <ComposedChart
        {...a11yChart("Nutrition against doses and training")}
        data={data as Record<string, unknown>[]}
        margin={{ top: 6, right: 6, bottom: 0, left: -8 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={MUTED} strokeOpacity={0.18} />
        <XAxis dataKey="label" {...axisProps()} />
        <YAxis yAxisId="left" width={46} {...axisProps()} />
        <YAxis yAxisId="right" orientation="right" width={34} {...axisProps()} />
        <ChartTooltip cursor={HOVER_CURSOR} content={<ChartTooltipContent labelKey="label" />} />
        <Bar
          yAxisId="left"
          dataKey="calories"
          name="Calories"
          fill={ACCENT}
          fillOpacity={0.25}
          radius={[3, 3, 0, 0]}
          {...motion(0)}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="protein"
          name="Protein (g)"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
          connectNulls
          {...motion(1)}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="training"
          name="Training (min)"
          stroke="var(--chart-4)"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
          connectNulls
          {...motion(2)}
        />
        <Scatter
          yAxisId="right"
          dataKey="doseMarker"
          name="Doses logged"
          fill="var(--chart-5)"
          shape="circle"
        />
      </ComposedChart>
    </ChartContainer>
  );
});
