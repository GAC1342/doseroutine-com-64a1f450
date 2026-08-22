import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listCronRunMetrics } from "@/lib/cron-metrics.functions";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/admin/cron-metrics")({
  errorComponent: routeErrorComponent("admin-cron-metrics"),
  head: () => ({
    meta: [
      { title: "Reminder job metrics — DoseRoutine" },
      {
        name: "description",
        content:
          "Internal view of reminder job runs: database query counts, delivery volume and budget breaches.",
      },
      { property: "og:title", content: "Reminder job metrics — DoseRoutine" },
      { property: "og:description", content: "Reminder job query and delivery monitoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CronMetricsPage,
});

function CronMetricsPage() {
  const fetchMetrics = useServerFn(listCronRunMetrics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "cron-metrics", 24],
    queryFn: () => fetchMetrics({ data: { hours: 24, limit: 100 } }),
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Reminder job metrics</h1>
        <p className="text-sm text-muted-foreground">
          Last 24 hours of <code>send-reminders</code> and <code>send-routine-reminders</code> runs
          — database round trips per run and how many alerts actually went out.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn’t load metrics: {(error as Error).message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(data?.summary ?? []).map((s) => (
          <Card key={s.job} className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{s.job}</h2>
              {s.overBudgetRuns > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" /> {s.overBudgetRuns} over budget
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="size-3" /> within budget
                </Badge>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Runs" value={String(s.runs)} />
              <Stat label="Avg duration" value={`${s.avgDurationMs} ms`} />
              <Stat
                label="Queries / run"
                value={`${s.avgQueries} avg · ${s.maxQueries} max (budget ${s.queryBudget})`}
              />
              <Stat
                label="Alerts sent (24h)"
                value={`${s.deliveries} (per-run budget ${s.deliveryBudget})`}
              />
              <Stat label="Errors" value={String(s.errors)} />
            </dl>
          </Card>
        ))}
        {!isLoading && !(data?.summary ?? []).length && (
          <p className="text-sm text-muted-foreground">No runs recorded in the last 24 hours.</p>
        )}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Run</th>
              <th className="p-2">Job</th>
              <th className="p-2">ms</th>
              <th className="p-2">Queries</th>
              <th className="p-2">Rows</th>
              <th className="p-2">Push</th>
              <th className="p-2">Email</th>
              <th className="p-2">Inbox</th>
              <th className="p-2">Capped</th>
              <th className="p-2">Errors</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-2 whitespace-nowrap">
                  {new Date(r.started_at).toLocaleString()}
                  {r.over_budget && (
                    <span className="block text-xs text-destructive">{r.budget_note}</span>
                  )}
                </td>
                <td className="p-2">{r.job}</td>
                <td className="p-2">{r.duration_ms}</td>
                <td className="p-2" title={JSON.stringify(r.query_breakdown)}>
                  {r.db_queries}
                </td>
                <td className="p-2">{r.db_rows_read}</td>
                <td className="p-2">{r.push_sent}</td>
                <td className="p-2">{r.email_sent}</td>
                <td className="p-2">{r.inbox_queued}</td>
                <td className="p-2">{r.capped}</td>
                <td className="p-2">{r.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
