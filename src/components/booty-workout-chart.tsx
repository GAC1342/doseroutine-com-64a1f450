import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Link } from "@tanstack/react-router";
import { BarChart3, Download, AlertCircle, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  monthlyCompletionSeries,
  weeklyCompletionSeries,
  type BootyWorkoutProgress,
  type CompletionPoint,
} from "@/lib/booty-workout-progress";

type ChartDataStatus = "loading" | "error" | "success";

type Range = "week" | "month";

const EXPORT_WIDTH = 1200;
const EXPORT_HEIGHT = 720;
const EXPORT_BG = "#ffffff";

function inlineSvgStyles(source: Element, target: Element) {
  const computed = getComputedStyle(source);
  const targetEl = target as HTMLElement;

  const fill = computed.fill;
  if (fill && fill !== "none" && !fill.startsWith("rgba(0, 0, 0,")) {
    targetEl.setAttribute("fill", fill);
  }
  const stroke = computed.stroke;
  if (stroke && stroke !== "none" && !stroke.startsWith("rgba(0, 0, 0,")) {
    targetEl.setAttribute("stroke", stroke);
  }
  const color = computed.color;
  if (color && color !== "rgba(0, 0, 0, 0)") {
    targetEl.setAttribute("color", color);
  }

  const fontSize = computed.fontSize;
  if (fontSize) targetEl.style.fontSize = fontSize;
  const fontFamily = computed.fontFamily;
  if (fontFamily) targetEl.style.fontFamily = fontFamily;

  for (let i = 0; i < source.children.length; i++) {
    inlineSvgStyles(source.children[i], target.children[i]);
  }
}

async function exportChartPng(section: HTMLElement, filename: string) {
  const svg = section.querySelector(".booty-chart-svg svg");
  if (!svg) return;

  const svgRect = svg.getBoundingClientRect();
  const ratio = Math.min(EXPORT_WIDTH / svgRect.width, (EXPORT_HEIGHT - 80) / svgRect.height);
  const chartWidth = Math.round(svgRect.width * ratio);
  const chartHeight = Math.round(svgRect.height * ratio);

  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineSvgStyles(svg, clone);

  clone.setAttribute("width", String(chartWidth));
  clone.setAttribute("height", String(chartHeight));
  clone.setAttribute("viewBox", `0 0 ${svgRect.width} ${svgRect.height}`);
  clone.style.backgroundColor = EXPORT_BG;

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.src = url;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to load SVG for export"));
  });

  const title = section.querySelector("h2")?.textContent?.trim() ?? "Completed days";
  const subtitle = section.querySelector("p")?.textContent?.trim() ?? "";

  const padding = 32;
  const width = Math.max(chartWidth + padding * 2, 480);
  const height = chartHeight + padding * 3 + 48;

  const canvas = document.createElement("canvas");
  const scale = window.devicePixelRatio || 1;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  ctx.fillStyle = EXPORT_BG;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f172a";
  ctx.font = "600 22px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, padding, padding + 20);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillText(subtitle, padding, padding + 48);

  const chartX = Math.round((width - chartWidth) / 2);
  ctx.drawImage(image, chartX, padding + 64, chartWidth, chartHeight);
  URL.revokeObjectURL(url);

  const pngUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = pngUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const config = {
  days: { label: "Completed days", color: "var(--primary)" },
} satisfies ChartConfig;

const SAMPLE_WEEK_DATA: CompletionPoint[] = [
  { key: "sample-w1", label: "W1", days: 1, current: false },
  { key: "sample-w2", label: "W2", days: 0, current: false },
  { key: "sample-w3", label: "W3", days: 2, current: false },
  { key: "sample-w4", label: "W4", days: 1, current: false },
  { key: "sample-w5", label: "W5", days: 3, current: false },
  { key: "sample-w6", label: "W6", days: 2, current: true },
  { key: "sample-w7", label: "W7", days: 0, current: false },
  { key: "sample-w8", label: "W8", days: 1, current: false },
];

const SAMPLE_MONTH_DATA: CompletionPoint[] = [
  { key: "sample-m1", label: "Mar", days: 2, current: false },
  { key: "sample-m2", label: "Apr", days: 1, current: false },
  { key: "sample-m3", label: "May", days: 3, current: false },
  { key: "sample-m4", label: "Jun", days: 2, current: false },
  { key: "sample-m5", label: "Jul", days: 4, current: false },
  { key: "sample-m6", label: "Aug", days: 2, current: true },
];

/** Completed-day totals for the 10-Minute Booty Workout, bucketed by week or month. */
export function BootyWorkoutChart({
  progress,
  status = "success",
  onRetry,
  scheduleTo = "/fitness",
  scheduleSearch,
  scheduleLabel = "Schedule a day",
}: {
  progress: BootyWorkoutProgress;
  status?: ChartDataStatus;
  onRetry?: () => void;
  scheduleTo?: string;
  /** Extra search params (used to carry a post-sign-up redirect for guests). */
  scheduleSearch?: Record<string, string>;
  scheduleLabel?: string;
}) {
  const [range, setRange] = useState<Range>("week");

  const data = useMemo(
    () =>
      range === "week" ? weeklyCompletionSeries(progress, 8) : monthlyCompletionSeries(progress, 6),
    [progress, range],
  );

  const total = useMemo(() => data.reduce((sum, d) => sum + d.days, 0), [data]);
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.days)), [data]);

  const sampleData = useMemo(
    () => (range === "week" ? SAMPLE_WEEK_DATA : SAMPLE_MONTH_DATA),
    [range],
  );
  const sampleMax = useMemo(() => Math.max(1, ...sampleData.map((d) => d.days)), [sampleData]);

  const hasCompletedDays = progress.sessions.some((s) => s.completed);

  const sectionRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!sectionRef.current) return;
    setExporting(true);
    try {
      const date = new Date().toISOString().split("T")[0];
      await exportChartPng(sectionRef.current, `doseroutine-booty-progress-${date}.png`);
    } finally {
      setExporting(false);
    }
  };

  const isLoading = status === "loading";
  const isError = status === "error";

  return (
    <section ref={sectionRef} aria-labelledby="booty-chart-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="booty-chart-heading" className="text-base font-semibold">
            Completed days
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {range === "week"
              ? `${total} ${total === 1 ? "day" : "days"} across the last 8 weeks`
              : `${total} ${total === 1 ? "day" : "days"} across the last 6 months`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={!hasCompletedDays || exporting || isLoading || isError}
            aria-label="Export chart as PNG"
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {exporting ? "Saving…" : "Save image"}
          </Button>
          <div
            className="flex gap-1 rounded-lg border border-border p-0.5"
            role="group"
            aria-label="Chart range"
          >
            {(["week", "month"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={range === value ? "secondary" : "ghost"}
                className="h-8 px-3 text-xs"
                aria-pressed={range === value}
                disabled={isLoading || isError}
                onClick={() => setRange(value)}
              >
                {value === "week" ? "By week" : "By month"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading chart data">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <div className="flex justify-between gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ) : isError ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-muted/40 px-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Couldn’t load progress</h3>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Something went wrong reading your workout history. Try again in a moment.
          </p>
          {onRetry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-4 h-8 px-3 text-xs"
              onClick={onRetry}
            >
              Try again
            </Button>
          )}
        </div>
      ) : hasCompletedDays ? (
        <div className="booty-chart-svg">
          <ChartContainer config={config} className="mt-3 aspect-[16/9] w-full">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                minTickGap={8}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, max]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                width={32}
              />
              <ChartTooltip content={<ChartTooltipContent labelKey="label" nameKey="days" />} />
              <Bar dataKey="days" fill="var(--color-days)" radius={[4, 4, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ChartContainer>

          {/* Text equivalent for screen readers — bars alone are not announceable. */}
          <ul className="sr-only">
            {data.map((d) => (
              <li key={d.key}>
                {d.label}: {d.days} completed {d.days === 1 ? "day" : "days"}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No completed days yet</h3>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Schedule this workout and finish at least one day to see your completion chart here.
          </p>

          <Button type="button" size="sm" className="mt-4 h-9 gap-2 px-4 text-xs" asChild>
            <Link to={scheduleTo} search={scheduleSearch as never}>
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              {scheduleLabel}
            </Link>
          </Button>

          <p className="mt-5 text-xs font-medium text-muted-foreground">Preview</p>
          <div className="mt-2 w-full max-w-xs opacity-80" aria-hidden="true">
            <ChartContainer config={config} className="aspect-[16/9] w-full">
              <BarChart data={sampleData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  minTickGap={8}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, sampleMax]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={32}
                />
                <Bar
                  dataKey="days"
                  fill="var(--color-days)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </section>
  );
}
