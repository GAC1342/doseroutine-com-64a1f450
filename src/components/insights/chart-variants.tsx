import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import { AreaChart as AreaIcon, BarChart3, LineChart as LineIcon, Layers } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useSeriesMotion } from "@/lib/insights/chart-motion";

const ACCENT = "var(--primary)";
const MUTED = "var(--muted-foreground)";

export type ChartVariant = "area" | "line" | "bar" | "stacked";

export const CHART_VARIANT_META: Record<
  ChartVariant,
  { label: string; icon: typeof LineIcon; hint: string }
> = {
  area: { label: "Area", icon: AreaIcon, hint: "Filled trend" },
  line: { label: "Line", icon: LineIcon, hint: "Plain trend line" },
  bar: { label: "Bars", icon: BarChart3, hint: "Per-period bars" },
  stacked: { label: "Stacked", icon: Layers, hint: "Stacked / cumulative totals" },
};

export interface ChartSeries {
  key: string;
  label: string;
  /** Draw this series dashed in line mode (e.g. a secondary metric). */
  dashed?: boolean;
}



const axis = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 10 },
  minTickGap: 24,
} as const;

const HOVER_CURSOR = {
  stroke: ACCENT,
  strokeOpacity: 0.45,
  strokeWidth: 1.5,
  strokeDasharray: "4 4",
} as const;

const BAR_CURSOR = { fill: ACCENT, fillOpacity: 0.08 } as const;

function seriesOpacity(index: number) {
  return Math.max(0.35, 1 - index * 0.13);
}

/** Running totals — makes "stacked" meaningful for a single-series metric. */
function cumulative(rows: ReadonlyArray<Record<string, unknown>>, keys: string[]) {
  const totals: Record<string, number> = {};
  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const k of keys) {
      const v = row[k];
      if (typeof v === "number") {
        totals[k] = (totals[k] ?? 0) + v;
        next[k] = totals[k];
      } else {
        next[k] = totals[k] ?? null;
      }
    }
    return next;
  });
}

/**
 * One chart, four presentations. Keeps a single data/series contract so the
 * detail page can let people flip between line, area, bar and stacked views.
 */
export const VariantChart = memo(function VariantChart({
  data,
  series: allSeries,
  variant,
  valueSuffix,
  formatValue,
  className,
  animate = true,
  stackAsBars = false,
  allowDecimals = true,
  hiddenKeys,
  ariaLabel,
}: {
  data: ReadonlyArray<Record<string, unknown>>;
  series: readonly ChartSeries[];
  variant: ChartVariant;
  valueSuffix?: string;
  /** Metric-aware formatter (units, decimals). Falls back to a rounded number + suffix. */
  formatValue?: (value: number) => string;
  className?: string;
  animate?: boolean;
  /** Stack bars instead of areas (categorical metrics like injection sites). */
  stackAsBars?: boolean;
  allowDecimals?: boolean;
  /** Series keys toggled off in the legend. */
  hiddenKeys?: readonly string[];
  /** Describes what the chart shows, for screen readers. */
  ariaLabel?: string;
}) {
  const motion = useSeriesMotion(animate);
  const series = useMemo(
    () => (hiddenKeys?.length ? allSeries.filter((s) => !hiddenKeys.includes(s.key)) : allSeries),
    [allSeries, hiddenKeys],
  );
  const keys = useMemo(() => series.map((s) => s.key), [series]);
  const single = series.length === 1;
  const rows = useMemo(
    () => (variant === "stacked" && single ? cumulative(data, keys) : (data as Record<string, unknown>[])),
    [variant, single, data, keys],
  );


  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: ACCENT }]));
  const format = (v: unknown) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    if (formatValue) return formatValue(n);
    const isPercent = valueSuffix?.trim().startsWith("%");
    const rounded = n.toLocaleString(undefined, {
      maximumFractionDigits: isPercent ? 0 : allowDecimals ? 1 : 0,
    });
    return `${rounded}${valueSuffix ? `${isPercent ? "" : " "}${valueSuffix.trim()}` : ""}`;
  };

  const grid = (
    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={MUTED} strokeOpacity={0.18} />
  );
  // Recharts inspects direct children by component type, so axes must be
  // rendered inline in each chart rather than shared through a fragment.
  const tooltip = (cursor: unknown) => (
    <ChartTooltip
      cursor={cursor as never}
      content={<ChartTooltipContent labelKey="label" formatter={(v) => format(v)} />}
    />
  );

  // Recharts' accessibilityLayer makes the plot focusable and moves the active
  // point with Left/Right arrows; the tooltip is an aria-live region, so each
  // step is announced. The sr-only table below is the non-visual fallback.
  const a11y = {
    accessibilityLayer: true,
    role: "application" as const,
    "aria-label": `${ariaLabel ?? series.map((s) => s.label).join(", ")}. Interactive chart — press Tab to focus, then use the left and right arrow keys to move between data points.`,
  };

  const wrap = (children: React.ReactNode) => (
    <>
      <ChartContainer config={config} className={cn("aspect-auto w-full h-[280px]", className)}>
        {children as never}
      </ChartContainer>
      <table className="sr-only">
        <caption>{ariaLabel ?? "Chart data"}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${String(row["label"] ?? i)}-${i}`}>
              <th scope="row">{String(row["label"] ?? i + 1)}</th>
              {series.map((s) => (
                <td key={s.key}>{row[s.key] == null ? "No data" : format(row[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const margin = { top: 6, right: 6, bottom: 0, left: -8 };


  if (variant === "bar" || (variant === "stacked" && stackAsBars)) {
    const stacked = variant === "stacked";
    return wrap(
      <BarChart data={rows} margin={margin} {...a11y}>
        {grid}
        <XAxis dataKey="label" {...axis} />
        <YAxis width={46} allowDecimals={allowDecimals} {...axis} />
        {tooltip(BAR_CURSOR)}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? "stack" : undefined}
            fill={ACCENT}
            fillOpacity={single ? 0.65 : seriesOpacity(i)}
            radius={!stacked || i === series.length - 1 ? [3, 3, 0, 0] : undefined}
            activeBar={<Rectangle fillOpacity={1} stroke={ACCENT} strokeWidth={1} />}
            {...motion(i)}
          />
        ))}
      </BarChart>,
    );
  }

  if (variant === "line") {
    return wrap(
      <LineChart data={rows} margin={margin} {...a11y}>
        {grid}
        <XAxis dataKey="label" {...axis} />
        <YAxis width={46} allowDecimals={allowDecimals} {...axis} />
        {tooltip(HOVER_CURSOR)}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={ACCENT}
            strokeOpacity={s.dashed ? 0.75 : seriesOpacity(i)}
            strokeDasharray={s.dashed ? "4 3" : undefined}
            strokeWidth={2}
            connectNulls
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
            {...motion(i)}
          />
        ))}
      </LineChart>,
    );
  }

  // area + stacked area
  const stacked = variant === "stacked";
  return wrap(
    <AreaChart data={rows} margin={margin} {...a11y}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={s.key} id={`vgrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3 * seriesOpacity(i)} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      {grid}
      <XAxis dataKey="label" {...axis} />
      <YAxis width={46} allowDecimals={allowDecimals} {...axis} />
      {tooltip(HOVER_CURSOR)}
      {series.map((s, i) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.label}
          stackId={stacked && !single ? "stack" : undefined}
          stroke={ACCENT}
          strokeOpacity={seriesOpacity(i)}
          strokeWidth={2}
          fill={stacked && !single ? ACCENT : `url(#vgrad-${s.key})`}
          fillOpacity={stacked && !single ? 0.18 + 0.12 * (series.length - i) : 1}
          connectNulls
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
          {...motion(i)}
        />
      ))}
    </AreaChart>,
  );
});

/** Segmented control for picking the chart presentation. */
export function ChartVariantToggle({
  value,
  onChange,
  options,
  className,
}: {
  value: ChartVariant;
  onChange: (v: ChartVariant) => void;
  options: readonly ChartVariant[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Chart type"
      className={cn("inline-flex items-center gap-1 rounded-full border border-border p-0.5", className)}
    >
      {options.map((opt) => {
        const meta = CHART_VARIANT_META[opt];
        const Icon = meta.icon;
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${meta.label} chart — ${meta.hint}`}
            title={`${meta.label} — ${meta.hint}`}
            onClick={() => onChange(opt)}
            className={cn(
              "tap-target inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Legend chips that show/hide individual series on multi-series charts.
 * At least one series always stays visible so the chart never goes blank.
 */
export function ChartSeriesLegend({
  series,
  hiddenKeys,
  onToggle,
  className,
}: {
  series: readonly ChartSeries[];
  hiddenKeys: readonly string[];
  onToggle: (key: string) => void;
  className?: string;
}) {
  if (series.length < 2) return null;
  const visibleCount = series.filter((s) => !hiddenKeys.includes(s.key)).length;

  return (
    <div
      role="group"
      aria-label="Toggle chart series"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {series.map((s, i) => {
        const hidden = hiddenKeys.includes(s.key);
        const lastVisible = !hidden && visibleCount === 1;
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={!hidden}
            disabled={lastVisible}
            title={lastVisible ? "At least one series must stay visible" : undefined}
            aria-label={`${hidden ? "Show" : "Hide"} ${s.label} series`}
            onClick={() => !lastVisible && onToggle(s.key)}
            className={cn(
              "tap-target inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200",
              hidden
                ? "border-dashed border-border text-muted-foreground/70 hover:text-foreground"
                : "border-border bg-muted/50 text-foreground",
              lastVisible && "cursor-default opacity-80",
            )}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full border"
              style={{
                backgroundColor: hidden ? "transparent" : ACCENT,
                borderColor: ACCENT,
                opacity: hidden ? 0.5 : seriesOpacity(i),
              }}
            />
            <span className={cn(hidden && "line-through")}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
