import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Eye,
  Globe,
  MousePointer,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { LandingConversionsCard } from "@/components/admin/landing-conversions-card";
import { SearchInsightsCard } from "@/components/admin/search-insights-card";
import { ZeroResultAnalyzerCard } from "@/components/admin/zero-result-analyzer-card";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { getFunnelSummary, type FunnelWindow } from "@/lib/funnel.functions";
import { getTrafficSummary, type TrafficSummary } from "@/lib/traffic.functions";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  errorComponent: routeErrorComponent("admin-analytics", "Traffic data couldn't load"),
  head: () => ({
    meta: [
      { title: "Traffic & conversion — DoseRoutine admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function AnalyticsPage() {
  const navigate = useNavigate();
  const [win, setWin] = useState<FunnelWindow>("7d");
  const fetchFunnel = useServerFn(getFunnelSummary);
  const fetchTraffic = useServerFn(getTrafficSummary);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
  });

  const {
    data: funnel,
    isLoading: funnelLoading,
    error: funnelError,
  } = useQuery({
    queryKey: ["funnel-summary", win],
    queryFn: () => fetchFunnel({ data: { window: win } }),
    staleTime: 60_000,
    enabled: !!isAdmin,
  });

  const {
    data: traffic,
    isLoading: trafficLoading,
    error: trafficError,
  } = useQuery({
    queryKey: ["traffic-summary", win],
    queryFn: () => fetchTraffic({ data: { window: win } }),
    staleTime: 60_000,
    enabled: !!isAdmin,
  });

  if (adminLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Checking access…</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <button
          onClick={() => navigate({ to: "/more" })}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Card className="rounded-2xl border-border p-6">
          <h1 className="font-display text-2xl font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The analytics dashboard is restricted to DoseRoutine admins.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link
        to="/more"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to More
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Traffic & conversion
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Human-only numbers. Bot and AI-crawler traffic is counted separately so you can see what
            real visitors are doing.
          </p>
        </div>
        <div
          role="tablist"
          className="inline-flex rounded-full border border-border bg-surface-track p-1 text-xs"
        >
          {(["7d", "30d"] as const).map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={win === w}
              onClick={() => setWin(w)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                win === w
                  ? "border border-border bg-card font-semibold text-primary shadow-sm"
                  : "border border-transparent text-foreground/75 hover:text-foreground"
              }`}
            >
              {w === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      {(funnelError || trafficError) && (
        <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          {funnelError?.message || trafficError?.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4 text-primary" />}
          label="Human visitors"
          value={traffic?.humanVisitors ?? "—"}
          sub={traffic ? `${formatDate(traffic.from)} – today` : undefined}
          loading={trafficLoading}
        />
        <StatCard
          icon={<Eye className="h-4 w-4 text-primary" />}
          label="Human pageviews"
          value={traffic?.humanPageviews ?? "—"}
          sub={traffic ? `pages / visitor: ${traffic.pagesPerHuman.toFixed(1)}` : undefined}
          loading={trafficLoading}
        />
        <StatCard
          icon={<MousePointer className="h-4 w-4 text-primary" />}
          label="Visit → sign-up"
          value={funnel ? `${(funnel.signupRate * 100).toFixed(1)}%` : "—"}
          sub={funnel ? `${funnel.signups} signups / ${funnel.authViews} auth views` : undefined}
          loading={funnelLoading}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          label="Signup → first dose"
          value={funnel ? `${(funnel.activationRate * 100).toFixed(1)}%` : "—"}
          sub={funnel ? `${funnel.activations} activated / ${funnel.signups} signups` : undefined}
          loading={funnelLoading}
        />
      </div>

      <Card className="mt-6 rounded-2xl border-border p-5">
        <h2 className="font-display text-lg font-semibold">Real people vs automated traffic</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          The left column is what a raw dashboard reports. The right two split it into people and
          machines.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <SplitStat
            label="Reported (unfiltered)"
            visitors={traffic?.rawVisitors}
            views={traffic?.rawPageviews}
            loading={trafficLoading}
          />
          <SplitStat
            label="Real people"
            visitors={traffic?.humanVisitors}
            views={traffic?.humanPageviews}
            loading={trafficLoading}
            tone="good"
          />
          <SplitStat
            label="Bots & crawlers"
            visitors={traffic?.botVisitors}
            views={traffic?.botHits}
            loading={trafficLoading}
            tone="muted"
          />
        </div>
        {traffic && traffic.behavioralBotHits > 0 && (
          <p className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            {traffic.behavioralBotVisitors} session
            {traffic.behavioralBotVisitors === 1 ? " was" : "s were"} caught by crawl speed alone (
            {traffic.behavioralBotHits} views) — these use a normal desktop browser signature, so
            user-agent checks miss them.
          </p>
        )}
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border p-5">
          <h2 className="font-display text-lg font-semibold">Top human pages</h2>
          <TopPagesTable rows={traffic?.topPages ?? []} loading={trafficLoading} />
        </Card>

        <Card className="rounded-2xl border-border p-5">
          <h2 className="font-display text-lg font-semibold">Top sources</h2>
          <TopSourcesTable rows={traffic?.topSources ?? []} loading={trafficLoading} />
        </Card>
      </div>

      <Card className="mt-6 rounded-2xl border-border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Crawler traffic</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          AI crawlers and search engines indexing your library is good for SEO. This section
          separates them from human numbers.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-muted/40 p-4 text-center">
            <div className="text-2xl font-semibold tabular-nums">{traffic?.botHits ?? "—"}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Bot pageviews</div>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 text-center">
            <div className="text-2xl font-semibold tabular-nums">
              {traffic?.aiCrawlerHits ?? "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">AI crawler hits</div>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 text-center">
            <div className="text-2xl font-semibold tabular-nums">{traffic?.topBotAgent ?? "—"}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Top bot agent</div>
          </div>
        </div>
        {traffic?.botBreakdown && traffic.botBreakdown.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Agent family</th>
                <th className="pb-2 font-medium text-right">Hits</th>
              </tr>
            </thead>
            <tbody>
              {traffic.botBreakdown.map((b: { family: string; hits: number }) => (
                <tr key={b.family} className="border-t border-border">
                  <td className="py-2 text-foreground">{b.family}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{b.hits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {traffic?.botTopPages && traffic.botTopPages.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-semibold text-foreground">Pages bots hit most</h3>
            <TopPagesTable rows={traffic.botTopPages} loading={false} />
          </>
        )}
      </Card>

      <LandingConversionsCard enabled={!!isAdmin} window={win} />

      <SearchInsightsCard enabled={!!isAdmin} />

      <ZeroResultAnalyzerCard enabled={!!isAdmin} />

      <p className="mt-6 text-xs text-muted-foreground">
        <Globe className="inline h-3 w-3 mr-1" />
        Lovable's project analytics dashboard cannot filter bots. Use this page for accurate
        conversion metrics.
      </p>
    </div>
  );
}

function SplitStat({
  label,
  visitors,
  views,
  loading,
  tone = "neutral",
}: {
  label: string;
  visitors?: number;
  views?: number;
  loading?: boolean;
  tone?: "neutral" | "good" | "muted";
}) {
  const ring =
    tone === "good"
      ? "border-primary/40 bg-primary/5"
      : tone === "muted"
        ? "border-border bg-muted/40"
        : "border-border bg-background";
  return (
    <div className={`rounded-xl border p-4 ${ring}`}>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {visitors ?? "—"}
            <span className="ml-1 text-xs font-normal text-muted-foreground">visitors</span>
          </div>
          <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {views ?? "—"} page views
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-border p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
          {sub ? <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div> : null}
        </>
      )}
    </Card>
  );
}

function TopPagesTable({ rows, loading }: { rows: TrafficSummary["topPages"]; loading?: boolean }) {
  if (loading) return <p className="mt-4 text-xs text-muted-foreground">Loading…</p>;
  if (!rows.length)
    return <p className="mt-4 text-xs text-muted-foreground">No human pageviews yet.</p>;
  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th className="pb-2 font-medium">Page</th>
          <th className="pb-2 font-medium text-right">Views</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: { path: string; views: number }) => (
          <tr key={r.path} className="border-t border-border">
            <td className="py-2 text-foreground">{r.path}</td>
            <td className="py-2 text-right tabular-nums text-muted-foreground">{r.views}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopSourcesTable({
  rows,
  loading,
}: {
  rows: TrafficSummary["topSources"];
  loading?: boolean;
}) {
  if (loading) return <p className="mt-4 text-xs text-muted-foreground">Loading…</p>;
  if (!rows.length)
    return <p className="mt-4 text-xs text-muted-foreground">No source data yet.</p>;
  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th className="pb-2 font-medium">Source</th>
          <th className="pb-2 font-medium text-right">Visitors</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: { source: string; visitors: number }) => (
          <tr key={r.source} className="border-t border-border">
            <td className="py-2 text-foreground">{r.source}</td>
            <td className="py-2 text-right tabular-nums text-muted-foreground">{r.visitors}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
