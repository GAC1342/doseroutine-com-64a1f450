import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, ExternalLink, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBlogSearchPerformance } from "@/lib/blog-search-performance.functions";
import { BlogPostSearchDetailSheet } from "@/components/admin/blog-post-search-detail-sheet";

export const Route = createFileRoute("/_authenticated/admin/blog-seo")({
  head: () => ({
    meta: [
      { title: "Blog SEO dashboard — DoseRoutine" },
      {
        name: "description",
        content:
          "Internal Search Console dashboard: impressions, clicks, CTR and average position per blog post.",
      },
      { property: "og:title", content: "Blog SEO dashboard — DoseRoutine" },
      { property: "og:description", content: "Per-post search performance for the blog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BlogSeoDashboard,
});

const PERIODS = [7, 28, 90] as const;

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" />0
      </span>
    );
  }
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs ${good ? "text-primary" : "text-destructive"}`}
    >
      <Icon className="size-3" />
      {Math.abs(value) < 1 ? Math.abs(value).toFixed(1) : Math.round(Math.abs(value))}
    </span>
  );
}

function BlogSeoDashboard() {
  const [days, setDays] = useState<number>(28);
  const [longTailOnly, setLongTailOnly] = useState(true);
  const [drilldown, setDrilldown] = useState<{ slug: string; title: string } | null>(null);
  const fetchPerf = useServerFn(getBlogSearchPerformance);

  const { data, isFetching, error } = useQuery({
    queryKey: ["admin", "blog-seo", days, longTailOnly],
    queryFn: () => fetchPerf({ data: { days, longTailOnly } }),
    staleTime: 300_000,
  });

  const rows = data?.rows ?? [];
  const totals = data?.totals;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Blog SEO dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Impressions, clicks, CTR and average position per post, straight from Search Console.
          Data lags about three days.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={days === p ? "default" : "outline"}
            onClick={() => setDays(p)}
          >
            Last {p} days
          </Button>
        ))}
        <Button
          size="sm"
          variant={longTailOnly ? "default" : "outline"}
          onClick={() => setLongTailOnly((v) => !v)}
        >
          {longTailOnly ? "Long-tail posts" : "All posts"}
        </Button>
        {isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Couldn’t load performance: {(error as Error).message}
        </p>
      )}
      {data && !data.connected && (
        <p className="text-sm text-muted-foreground">{data.error}</p>
      )}
      {data?.connected && data.error && (
        <p className="text-sm text-destructive">{data.error}</p>
      )}

      {totals && data?.period && (
        <Card className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-5">
          <Stat label="Clicks" value={String(totals.clicks)} />
          <Stat label="Impressions" value={String(totals.impressions)} />
          <Stat label="CTR" value={pct(totals.ctr)} />
          <Stat
            label="Avg position"
            value={totals.position ? totals.position.toFixed(1) : "—"}
          />
          <Stat label="Posts with data" value={`${totals.withData} of ${totals.posts}`} />
          <p className="col-span-2 text-xs text-muted-foreground sm:col-span-5">
            {data.period.startDate} → {data.period.endDate} (vs {data.previous.startDate} →{" "}
            {data.previous.endDate})
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.slug} className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium hover:underline"
                >
                  {row.title}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
                <p className="text-xs text-muted-foreground">/blog/{row.slug}</p>
              </div>
              {row.impressions === 0 ? (
                <Badge variant="outline">No impressions yet</Badge>
              ) : (
                <Badge variant="secondary">
                  Position {row.position ? row.position.toFixed(1) : "—"}
                </Badge>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat
                label="Impressions"
                value={String(row.impressions)}
                extra={<Delta value={row.deltaImpressions} />}
              />
              <Stat
                label="Clicks"
                value={String(row.clicks)}
                extra={<Delta value={row.deltaClicks} />}
              />
              <Stat label="CTR" value={pct(row.ctr)} />
              <Stat
                label="Avg position"
                value={row.position ? row.position.toFixed(1) : "—"}
                extra={<Delta value={row.deltaPosition} invert />}
              />
            </dl>

            {row.topQueries.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Top queries</p>
                <ul className="space-y-1 text-sm">
                  {row.topQueries.map((q) => (
                    <li key={q.query} className="flex items-baseline justify-between gap-3">
                      <span className="truncate">{q.query}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {q.impressions} impr · {q.clicks} clicks · pos {q.position.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setDrilldown({ slug: row.slug, title: row.title })}
              aria-label={`View the full Search Console query list for ${row.title}`}
            >
              View all queries
            </Button>
          </Card>
        ))}
      </div>

      <BlogPostSearchDetailSheet
        slug={drilldown?.slug ?? null}
        title={drilldown?.title ?? ""}
        days={days}
        open={Boolean(drilldown)}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 font-medium">
        {value}
        {extra}
      </dd>
    </div>
  );
}
