import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdherenceRing } from "@/components/adherence-ring";
import { buildMonthlyReport, fetchLabeledAdherenceEvents } from "@/lib/adherence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/adherence")({
  head: () => ({
    meta: [
      { title: "Adherence Report — DoseRoutine" },
      {
        name: "description",
        content: "Your monthly adherence score, day-by-day consistency and per-compound breakdown.",
      },
      { property: "og:title", content: "Adherence Report — DoseRoutine" },
      {
        property: "og:description",
        content: "Track how consistently you take your protocol, month by month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdherencePage,
});

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString([], {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + by);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function AdherencePage() {
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const thisMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [month, setMonth] = useState(thisMonth);

  // 400 days covers a full year of history plus the previous-month comparison.
  const { data: events, isLoading } = useQuery({
    queryKey: ["adherence-events-400"],
    queryFn: () => fetchLabeledAdherenceEvents(400),
    staleTime: 5 * 60_000,
  });

  const report = useMemo(
    () => (events ? buildMonthlyReport(events, { month, zone: tz }) : null),
    [events, month, tz],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <Link
        to="/today"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Today
      </Link>

      <h1 className="mt-3 font-display text-2xl font-semibold">Adherence report</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How consistently you took your protocol. Intentional skips are not counted against you.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-display text-sm font-semibold">{monthLabel(month)}</div>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={month >= thisMonth}
          className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isLoading || !report ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <Card className="mt-4 flex items-center gap-5 rounded-2xl border-border p-5">
            <AdherenceRing score={report.score} size={104} strokeWidth={10} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly score
                </span>
                {report.delta != null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      report.delta > 0
                        ? "bg-[color:var(--severity-synergy-bg))] text-[color:var(--severity-synergy)]"
                        : report.delta < 0
                          ? "bg-[color:var(--severity-avoid-bg))] text-[color:var(--severity-avoid)]"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {report.delta > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : report.delta < 0 ? (
                      <ArrowDownRight className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {Math.abs(report.delta)} pts
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.scored === 0
                  ? "No resolved doses this month yet."
                  : `${report.taken} taken · ${report.missed} missed · ${report.skipped} skipped`}
              </p>
              {report.previousScore != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Previous month: {report.previousScore}%
                </p>
              )}
            </div>
          </Card>

          {report.days.length > 0 && (
            <Card className="mt-3 rounded-2xl border-border p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Day by day
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {report.days.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.taken}/${d.total} taken`}
                    className="h-7 w-7 rounded-md border border-border text-[10px] leading-7 text-center tabular-nums"
                    style={{
                      backgroundColor:
                        d.total === 0
                          ? undefined
                          : `color-mix(in oklch, var(--primary) ${Math.round(d.ratio * 100)}%, var(--card))`,
                      color: d.ratio > 0.6 ? "var(--primary-foreground)" : undefined,
                    }}
                  >
                    {Number(d.date.slice(-2))}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(report.best.length > 0 || report.worst.length > 0) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Card className="rounded-2xl border-border p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Most consistent
                </h2>
                <ul className="mt-2 space-y-2">
                  {report.best.map((c) => (
                    <li key={c.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{c.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{c.score}%</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="rounded-2xl border-border p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Needs work
                </h2>
                {report.worst.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nothing lagging behind this month.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {report.worst.map((c) => (
                      <li key={c.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">{c.label}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{c.score}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
