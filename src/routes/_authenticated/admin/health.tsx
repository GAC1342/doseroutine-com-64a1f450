import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, Gauge, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { getHealthSummary, type HealthWindow } from "@/lib/health-monitor.functions";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/admin/health")({
  errorComponent: routeErrorComponent("admin-health"),
  head: () => ({
    meta: [
      { title: "Production health — DoseRoutine admin" },
      {
        name: "description",
        content: "Client error groups and performance percentiles from real DoseRoutine traffic.",
      },
      { property: "og:title", content: "Production health — DoseRoutine admin" },
      { property: "og:description", content: "Client errors and performance from real traffic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HealthPage,
});

const WINDOWS: HealthWindow[] = ["24h", "7d", "30d"];

const VITAL_UNITS: Record<string, string> = {
  CLS: "",
  LCP: "ms",
  INP: "ms",
  FCP: "ms",
  TTFB: "ms",
};

function fmt(value: number, unit: string) {
  if (unit === "bytes") return `${Math.round(value / 1024)} KB`;
  if (unit === "") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function unitFor(metric: string) {
  if (metric.endsWith("_bytes")) return "bytes";
  if (metric in VITAL_UNITS) return VITAL_UNITS[metric] as string;
  return "ms";
}

function HealthPage() {
  const [win, setWin] = useState<HealthWindow>("7d");
  const fetchHealth = useServerFn(getHealthSummary);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return Boolean(data);
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["health-summary", win],
    queryFn: () => fetchHealth({ data: { window: win } }),
    staleTime: 60_000,
    enabled: !!isAdmin,
  });

  if (adminLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Checking access…</div>
    );
  }
  if (!isAdmin) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Admins only.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24">
      <header className="space-y-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Admin
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold">Production health</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-user errors and speed from live traffic — the regressions the test suite can&apos;t
          see. Bots excluded; back/forward-cache loads excluded from vitals.
        </p>
        <div className="flex gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWin(w)}
              className={`rounded-md border px-3 py-1 text-sm ${
                win === w ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <Card className="border-destructive/40 p-4 text-sm text-destructive">
          Could not load health data: {(error as Error).message}
        </Card>
      ) : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Client errors</p>
              <p className="text-3xl font-bold">{data.totalErrors}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Sessions affected</p>
              <p className="text-3xl font-bold">{data.affectedSessions}</p>
            </Card>
          </div>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden /> Top error groups
            </h2>
            {data.errorGroups.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">
                No client errors in this window.
              </Card>
            ) : (
              <div className="space-y-2">
                {data.errorGroups.map((g) => (
                  <Card key={g.fingerprint} className="space-y-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="break-words font-medium">{g.message}</p>
                      <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs">
                        {g.count}×
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {g.kind} · {g.sessions} session{g.sessions === 1 ? "" : "s"} · last{" "}
                      {new Date(g.lastSeen).toLocaleString()}
                    </p>
                    {g.paths.length ? (
                      <p className="text-xs text-muted-foreground">On: {g.paths.join(", ")}</p>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Gauge className="h-5 w-5 text-primary" aria-hidden /> Core Web Vitals (p75)
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.vitals.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground sm:col-span-3">
                  No vitals collected yet.
                </Card>
              ) : (
                data.vitals.map((v) => (
                  <Card key={v.metric} className="p-4">
                    <p className="text-sm text-muted-foreground">{v.metric}</p>
                    <p className="text-2xl font-bold">{fmt(v.p75, unitFor(v.metric))}</p>
                    <p className="text-xs text-muted-foreground">
                      p50 {fmt(v.p50, unitFor(v.metric))} · p95 {fmt(v.p95, unitFor(v.metric))} ·{" "}
                      {v.samples} samples
                    </p>
                  </Card>
                ))
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Timer className="h-5 w-5 text-primary" aria-hidden /> Load &amp; blocking (p75)
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.perf.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground sm:col-span-3">
                  No timing data yet.
                </Card>
              ) : (
                data.perf.map((p) => (
                  <Card key={p.metric} className="p-4">
                    <p className="text-sm text-muted-foreground">{p.metric.replace(/_/g, " ")}</p>
                    <p className="text-2xl font-bold">{fmt(p.p75, unitFor(p.metric))}</p>
                    <p className="text-xs text-muted-foreground">{p.samples} samples</p>
                  </Card>
                ))
              )}
            </div>
          </section>

          {data.slowRoutes.length ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Slowest pages (p75 load)</h2>
              <Card className="divide-y">
                {data.slowRoutes.map((r) => (
                  <div key={r.path} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="truncate">{r.path}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {Math.round(r.p75LoadMs)} ms · {r.samples}
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}

          {data.slowResources.length ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Slowest resources</h2>
              <Card className="divide-y">
                {data.slowResources.map((r) => (
                  <div
                    key={r.resource}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <span className="truncate">{r.resource}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {Math.round(r.p75Ms)} ms · {r.samples}
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
