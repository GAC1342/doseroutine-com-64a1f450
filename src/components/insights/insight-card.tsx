import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardClassName } from "@/components/ui/card";
import type { Delta } from "@/lib/insights/aggregate";
import { round } from "@/lib/insights/aggregate";

export function DeltaBadge({
  delta,
  goodWhen = "up",
  suffix,
}: {
  delta: Delta;
  /** Which direction counts as an improvement for this metric. */
  goodWhen?: "up" | "down" | "neutral";
  suffix?: string;
}) {
  if (delta.change === null) return null;
  const Icon =
    delta.direction === "flat" ? Minus : delta.direction === "up" ? TrendingUp : TrendingDown;
  const good =
    goodWhen === "neutral" || delta.direction === "flat"
      ? null
      : (goodWhen === "up") === (delta.direction === "up");
  // 700-level in light mode so the 12px badge clears WCAG AA on card surfaces;
  // 400-level in dark mode where the lighter hue is the readable one.
  const tone =
    good === null
      ? "text-muted-foreground"
      : good
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-amber-700 dark:text-amber-400";
  const value =
    delta.pct !== null
      ? `${Math.abs(round(delta.pct, 1))}%`
      : `${Math.abs(round(delta.change, 1))}${suffix ? ` ${suffix}` : ""}`;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {delta.direction === "flat" ? "Steady" : `${delta.direction === "up" ? "+" : "−"}${value}`}
    </span>
  );
}

export interface InsightCardProps {
  title: string;
  /** Big number / short phrase summarising the card. */
  headline?: ReactNode;
  /** Small line under the headline. */
  caption?: ReactNode;
  delta?: Delta;
  deltaGoodWhen?: "up" | "down" | "neutral";
  deltaSuffix?: string;
  /** When false the chart is replaced with a friendly empty state. */
  hasData?: boolean;
  emptyText?: string;
  /** Optional deep link into the matching detail page. */
  href?: string;
  /** Drill-down target for the metric itself (title + chart become clickable). */
  detailTo?: string;
  /** Accessible label for the drill-down link. Defaults to "<title> details". */
  detailLabel?: string;
  hrefLabel?: string;
  className?: string;
  children: ReactNode;
}

export function InsightCard({
  title,
  headline,
  caption,
  delta,
  deltaGoodWhen = "up",
  deltaSuffix,
  hasData = true,
  emptyText = "No data in this window yet.",
  href,
  hrefLabel = "Open",
  detailTo,
  detailLabel,
  className,
  children,
}: InsightCardProps) {
  const navigate = useNavigate();
  const drillLabel = detailLabel ?? `${title} details`;
  return (
    <section
      data-testid="insight-card"
      className={cn(cardClassName, "flex flex-col rounded-2xl p-4 [contain:layout_paint]", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {detailTo ? (
            <Link
              to={detailTo}
              aria-label={drillLabel}
              className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        {delta && hasData && (
          <DeltaBadge delta={delta} goodWhen={deltaGoodWhen} suffix={deltaSuffix} />
        )}
      </div>

      {(headline || caption) && (
        <div className="mt-1">
          {headline && (
            <div className="font-display text-2xl font-semibold leading-tight">{headline}</div>
          )}
          {caption && <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>}
        </div>
      )}

      <div
        className={cn("mt-3 flex-1", detailTo && hasData && "cursor-pointer")}
        onClick={detailTo && hasData ? () => navigate({ to: detailTo }) : undefined}
      >
        {hasData ? (
          children
        ) : (
          <div className="flex h-[132px] items-center justify-center rounded-xl border border-dashed border-border px-3 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        )}
      </div>

      {(detailTo || href) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          {detailTo && (
            <Link
              to={detailTo}
              aria-label={drillLabel}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              See details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          {href && (
            <Link
              to={href}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              {hrefLabel}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
