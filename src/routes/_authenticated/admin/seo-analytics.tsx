import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSeoAnalytics, type SeoAnalyticsWindow } from "@/lib/seo-analytics.functions";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/admin/seo-analytics")({
  errorComponent: routeErrorComponent("admin-seo-analytics"),
  head: () => ({
    meta: [
      { title: "SEO analytics — keywords & conversions | DoseRoutine" },
      {
        name: "description",
        content:
          "Internal dashboard: site-wide Search Console keyword performance joined with sign-up conversions by landing page.",
      },
      { property: "og:title", content: "SEO analytics — DoseRoutine" },
      {
        property: "og:description",
        content: "Keyword performance and conversions by landing page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SeoAnalyticsPage,
});

const PERIODS: SeoAnalyticsWindow[] = [7, 28, 90];

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs ${good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value)}
    </span>
  );
}

function SeoAnalyticsPage() {
  const [days, setDays] = useState<SeoAnalyticsWindow>(28);
  const fetchAnalytics = useServerFn(getSeoAnalytics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "seo-analytics", days],
    queryFn: () => fetchAnalytics({ data: { days } }),
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">SEO analytics</h1>
        <p className="text-sm text-muted-foreground">
          Site-wide keyword performance from Search Console, joined with first-party sign-up
          conversions by landing page. Bot sessions are filtered out.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === days ? "default" : "outline"}
            onClick={() => setDays(p)}
          >
            Last {p} days
          </Button>
        ))}
        {data?.period ? (
          <span className="text-xs text-muted-foreground">
            {data.period.startDate} → {data.period.endDate}
          </span>
        ) : null}
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? (
        <Card className="p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load"}
        </Card>
      ) : null}
      {data && !data.connected ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Search Console isn’t connected yet, so keyword metrics are empty. Conversion data below
          still works.
        </Card>
      ) : null}
      {data?.error ? <Card className="p-4 text-sm text-destructive">{data.error}</Card> : null}

      {data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Clicks", value: String(data.totals.clicks) },
            { label: "Impressions", value: String(data.totals.impressions) },
            { label: "CTR", value: pct(data.totals.ctr) },
            { label: "Sessions", value: String(data.totals.sessions) },
            { label: "Signups", value: String(data.totals.signups) },
            { label: "Signup rate", value: pct(data.totals.conversionRate) },
          ].map((s) => (
            <Card key={s.label} className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold">{s.value}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Keyword performance</h2>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Query</th>
                <th className="p-2">Landing page</th>
                <th className="p-2 text-right">Clicks</th>
                <th className="p-2 text-right">Impr.</th>
                <th className="p-2 text-right">CTR</th>
                <th className="p-2 text-right">Position</th>
              </tr>
            </thead>
            <tbody>
              {(data?.keywords ?? []).map((k) => (
                <tr key={k.query} className="border-b last:border-0">
                  <td className="p-2 font-medium">{k.query}</td>
                  <td className="p-2 text-xs text-muted-foreground">{k.topPage ?? "—"}</td>
                  <td className="p-2 text-right">
                    {k.clicks} <Delta value={k.deltaClicks} />
                  </td>
                  <td className="p-2 text-right">
                    {k.impressions} <Delta value={k.deltaImpressions} />
                  </td>
                  <td className="p-2 text-right">{pct(k.ctr)}</td>
                  <td className="p-2 text-right">
                    {k.position.toFixed(1)} <Delta value={k.deltaPosition} invert />
                  </td>
                </tr>
              ))}
              {!isLoading && (data?.keywords.length ?? 0) === 0 ? (
                <tr>
                  <td className="p-3 text-sm text-muted-foreground" colSpan={6}>
                    No keyword data for this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Conversions by landing page</h2>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Landing page</th>
                <th className="p-2 text-right">Search clicks</th>
                <th className="p-2 text-right">Impr.</th>
                <th className="p-2 text-right">Position</th>
                <th className="p-2 text-right">Sessions</th>
                <th className="p-2 text-right">Signups</th>
                <th className="p-2 text-right">Signup rate</th>
                <th className="p-2 text-right">Upgrade intent</th>
              </tr>
            </thead>
            <tbody>
              {(data?.landings ?? []).map((l) => (
                <tr key={l.path} className="border-b align-top last:border-0">
                  <td className="p-2">
                    <div className="font-medium">{l.path}</div>
                    {l.topQueries.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.topQueries.map((q) => (
                          <Badge key={q.query} variant="secondary" className="text-[10px]">
                            {q.query} · {q.clicks}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-2 text-right">{l.clicks}</td>
                  <td className="p-2 text-right">{l.impressions}</td>
                  <td className="p-2 text-right">{l.position > 0 ? l.position.toFixed(1) : "—"}</td>
                  <td className="p-2 text-right">{l.sessions}</td>
                  <td className="p-2 text-right">{l.signups}</td>
                  <td className="p-2 text-right">{pct(l.conversionRate)}</td>
                  <td className="p-2 text-right">{l.upgradeIntent}</td>
                </tr>
              ))}
              {!isLoading && (data?.landings.length ?? 0) === 0 ? (
                <tr>
                  <td className="p-3 text-sm text-muted-foreground" colSpan={8}>
                    No landing page data for this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
