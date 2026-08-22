import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Bot, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { getInstallFunnel, type InstallFunnelWindow } from "@/lib/install-funnel.functions";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/admin/install-funnel")({
  errorComponent: routeErrorComponent("admin-install-funnel"),
  head: () => ({
    meta: [
      { title: "Install → sign-up funnel — DoseRoutine admin" },
      {
        name: "description",
        content:
          "Internal DoseRoutine report: install page visits, closed-testing landing clicks and real tester account creations with conversion rates.",
      },
      { property: "og:title", content: "Install → sign-up funnel — DoseRoutine admin" },
      {
        property: "og:description",
        content: "Internal conversion report for the closed-testing recruitment funnel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InstallFunnelPage,
});

function pct(v: number | null) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(v * 100 < 10 ? 1 : 0)}%`;
}

function InstallFunnelPage() {
  const [win, setWin] = useState<InstallFunnelWindow>("7d");
  const fetchFunnel = useServerFn(getInstallFunnel);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["install-funnel", win],
    queryFn: () => fetchFunnel({ data: { window: win } }),
    staleTime: 60_000,
    enabled: !!isAdmin,
  });

  if (adminLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">Checking access…</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="rounded-2xl p-6 text-sm text-muted-foreground">
          This report is restricted to DoseRoutine admins.
        </Card>
      </div>
    );
  }

  const top = data?.stages[0]?.count ?? 0;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to admin tools
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Install → sign-up funnel
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every step from the install page to a real tester account. Bot traffic and our own
            automated test runs are removed, so these are people.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => void refetch()}
            aria-label="Refresh report"
            className="rounded-full border border-border p-2 text-muted-foreground transition hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isLoading && (
        <Card className="rounded-2xl p-6 text-sm text-muted-foreground">
          Crunching the numbers…
        </Card>
      )}

      {error && (
        <Card className="rounded-2xl border-destructive/40 p-6 text-sm text-destructive">
          Couldn’t load the funnel: {(error as Error).message}
        </Card>
      )}

      {data && (
        <>
          <Card className="rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Download className="h-4 w-4 text-primary" />
              Funnel steps
            </div>
            <ul className="space-y-4">
              {data.stages.map((s) => {
                const width =
                  top > 0 ? Math.max((s.count / top) * 100, s.count > 0 ? 4 : 1.5) : 1.5;
                return (
                  <li key={s.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{s.label}</span>
                      <span className="tabular-nums text-sm font-semibold text-foreground">
                        {s.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span>{s.hint}</span>
                      {s.fromPrevious != null && (
                        <span className="font-medium text-foreground/80">
                          {pct(s.fromPrevious)} of previous step
                        </span>
                      )}
                      {s.fromTop != null && <span>{pct(s.fromTop)} of all install visits</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Card className="rounded-2xl p-4">
              <div className="text-xs text-muted-foreground">Tester accounts created</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{data.accountsCreated}</div>
            </Card>
            <Card className="rounded-2xl p-4">
              <div className="text-xs text-muted-foreground">Install visit → account</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {pct(data.installToAccountRate)}
              </div>
            </Card>
            <Card className="rounded-2xl p-4">
              <div className="text-xs text-muted-foreground">Landing click → account</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {pct(data.landingToAccountRate)}
              </div>
            </Card>
          </div>

          <Card className="mt-4 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-muted-foreground" />
              Removed from the numbers above
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.excludedBotSessions.toLocaleString()} sessions /{" "}
              {data.excludedBotHits.toLocaleString()} page hits excluded as bots or automation —{" "}
              {data.excludedAutomationSessions.toLocaleString()} of those were caught by crawl speed
              (this is what our nightly speed tests look like).
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
