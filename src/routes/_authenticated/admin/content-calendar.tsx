import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTENT_CALENDAR, type CalendarEntry } from "@/lib/content-calendar";
import { LOCAL_ARTICLE_SLUGS } from "@/lib/local-articles";
import { linkPlan } from "@/lib/article-link-map";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/admin/content-calendar")({
  errorComponent: routeErrorComponent("admin-content-calendar"),
  head: () => ({
    meta: [
      { title: "Content calendar coverage — DoseRoutine" },
      {
        name: "description",
        content:
          "Internal dashboard: topic cluster coverage, search intent distribution and publish status across the 60-day editorial calendar.",
      },
      { property: "og:title", content: "Content calendar coverage — DoseRoutine" },
      {
        property: "og:description",
        content: "Cluster coverage and intent mix for the 60-day blog calendar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ContentCalendarDashboard,
});

function isPublished(entry: CalendarEntry): boolean {
  return LOCAL_ARTICLE_SLUGS.includes(entry.slug);
}

function Bar({ value, total, tone }: { value: number; total: number; tone: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ContentCalendarDashboard() {
  const [cluster, setCluster] = useState<string | null>(null);

  const stats = useMemo(() => {
    const clusters = new Map<string, { total: number; published: number }>();
    const intents = new Map<string, { total: number; published: number }>();
    const types = new Map<string, number>();

    for (const e of CONTENT_CALENDAR) {
      const c = clusters.get(e.cluster) ?? { total: 0, published: 0 };
      c.total += 1;
      if (isPublished(e)) c.published += 1;
      clusters.set(e.cluster, c);

      const i = intents.get(e.searchIntent) ?? { total: 0, published: 0 };
      i.total += 1;
      if (isPublished(e)) i.published += 1;
      intents.set(e.searchIntent, i);

      types.set(e.contentType, (types.get(e.contentType) ?? 0) + 1);
    }

    return {
      clusters: [...clusters.entries()].sort((a, b) => b[1].total - a[1].total),
      intents: [...intents.entries()].sort((a, b) => b[1].total - a[1].total),
      types: [...types.entries()].sort((a, b) => b[1] - a[1]),
      published: CONTENT_CALENDAR.filter(isPublished).length,
      words: CONTENT_CALENDAR.reduce((n, e) => n + e.targetWords, 0),
    };
  }, []);

  const rows = useMemo(
    () => (cluster ? CONTENT_CALENDAR.filter((e) => e.cluster === cluster) : CONTENT_CALENDAR),
    [cluster],
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Content calendar coverage</h1>
        <p className="text-sm text-muted-foreground">
          60 planned posts, Aug 19 – Oct 17 2026. {stats.published} published,{" "}
          {CONTENT_CALENDAR.length - stats.published} remaining · {stats.words.toLocaleString()}{" "}
          target words.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Cluster coverage</h2>
          {stats.clusters.map(([name, c]) => (
            <button
              key={name}
              type="button"
              onClick={() => setCluster(cluster === name ? null : name)}
              className={`w-full space-y-1 rounded-md p-2 text-left transition-colors ${
                cluster === name ? "bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span>{name}</span>
                <span className="text-muted-foreground">
                  {c.published}/{c.total}
                </span>
              </div>
              <Bar value={c.published} total={c.total} tone="bg-primary" />
            </button>
          ))}
        </Card>

        <Card className="space-y-4 p-4">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Search intent distribution</h2>
            {stats.intents.map(([name, i]) => (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-sm capitalize">
                  <span>{name}</span>
                  <span className="text-muted-foreground">
                    {i.total} posts ({Math.round((i.total / CONTENT_CALENDAR.length) * 100)}%)
                  </span>
                </div>
                <Bar
                  value={i.total}
                  total={CONTENT_CALENDAR.length}
                  tone={name === "commercial" ? "bg-primary" : "bg-secondary"}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Content types</h2>
            <div className="flex flex-wrap gap-1.5">
              {stats.types.map(([name, n]) => (
                <Badge key={name} variant="secondary" className="font-normal">
                  {name} · {n}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold">
            {cluster ? `${cluster} posts` : "All planned posts"} ({rows.length})
          </h2>
          {cluster ? (
            <Button variant="ghost" size="sm" onClick={() => setCluster(null)}>
              Clear filter
            </Button>
          ) : null}
        </div>
        <ul className="divide-y">
          {rows.map((e) => {
            const published = isPublished(e);
            const plan = linkPlan(e.slug);
            return (
              <li key={`${e.day}-${e.slug}`} className="space-y-1 p-4">
                <div className="flex items-start gap-2">
                  {published ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Day {e.day} · {e.publishDate} · {e.primaryKeyword} · {e.targetWords}w
                    </p>
                  </div>
                  <Badge variant={published ? "default" : "outline"} className="shrink-0">
                    {published ? "Live" : e.isRefresh ? "Refresh" : "Planned"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5">{e.cluster}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">{e.searchIntent}</span>
                  <span>pillar → {plan?.pillar}</span>
                  {published ? (
                    <Link
                      to="/articles/$slug"
                      params={{ slug: e.slug }}
                      className="text-primary underline underline-offset-2"
                    >
                      view
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
