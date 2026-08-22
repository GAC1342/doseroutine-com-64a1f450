import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, Barcode, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routeErrorComponent } from "@/components/route-error-panel";
import { getScanMisses, getScanStats } from "@/lib/scan-analytics.functions";
import { msLabel, pct, scanSourceLabel } from "@/lib/scan-analytics";
import { supabase } from "@/integrations/supabase/client";
import { userFacingErrorMessage } from "@/lib/error-classify";

export const Route = createFileRoute("/_authenticated/admin/scan-analytics")({
  errorComponent: routeErrorComponent("admin-scan-analytics"),
  head: () => ({
    meta: [
      { title: "Barcode scan analytics — DoseRoutine" },
      {
        name: "description",
        content:
          "Internal view of barcode scan volume, time-to-result, per-database hit rates and unresolved products.",
      },
      { property: "og:title", content: "Barcode scan analytics — DoseRoutine" },
      { property: "og:description", content: "Internal barcode scan monitoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ScanAnalyticsPage,
});

const RANGES = [7, 14, 30, 90] as const;

function ScanAnalyticsPage() {
  const [days, setDays] = useState<number>(14);
  const fetchStats = useServerFn(getScanStats);
  const fetchMisses = useServerFn(getScanMisses);

  // Gate on the role first, so a signed-in non-admin sees a plain "Admins only"
  // instead of the server function's raw Forbidden error boundary.
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return Boolean(data);
    },
  });

  const stats = useQuery({
    queryKey: ["admin", "scan-stats", days],
    queryFn: () => fetchStats({ data: { days } }),
    enabled: !!isAdmin,
  });
  const misses = useQuery({
    queryKey: ["admin", "scan-misses", days],
    queryFn: () => fetchMisses({ data: { days, limit: 50 } }),
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

  const totals = stats.data?.totals;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Barcode scan analytics</h1>
        <p className="text-sm text-muted-foreground">
          How people scan, how fast we answer, which database wins, and the codes we still
          can&rsquo;t identify.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={days === r ? "default" : "outline"}
            onClick={() => setDays(r)}
          >
            Last {r} days
          </Button>
        ))}
      </div>

      {stats.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {stats.error && (
        <p className="text-sm text-destructive">
          Couldn&rsquo;t load scan stats: {userFacingErrorMessage(stats.error, "please try again.")}
        </p>
      )}

      {totals && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Scans" value={String(totals.scans)} />
          <Stat
            label="Resolved"
            value={`${totals.resolved} (${pct(totals.resolved, totals.scans)}%)`}
          />
          <Stat label="Median time to result" value={msLabel(totals.p50_ms)} />
          <Stat label="95th percentile" value={msLabel(totals.p95_ms)} />
        </div>
      )}

      {stats.data && (
        <>
          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">By capture method</h2>
            <Table
              head={["Method", "Scans", "Resolved", "Median"]}
              rows={stats.data.by_scan_source.map((r) => [
                scanSourceLabel(r.scan_source),
                String(r.scans),
                `${r.resolved} (${pct(r.resolved, r.scans)}%)`,
                msLabel(r.p50_ms),
              ])}
            />
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Per-database performance</h2>
            <p className="text-xs text-muted-foreground">
              Every lookup queries the cache plus the four catalogs in parallel; a &ldquo;hit&rdquo;
              means that source returned a usable product.
            </p>
            <Table
              head={["Database", "Calls", "Hit rate", "Errors", "Avg time"]}
              rows={stats.data.by_api.map((r) => [
                r.api,
                String(r.calls),
                `${r.hits} (${pct(r.hits, r.calls)}%)`,
                String(r.errors),
                msLabel(r.avg_ms),
              ])}
            />
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="space-y-3 p-4">
              <h2 className="font-semibold">Winning source</h2>
              <Table
                head={["Source", "Scans"]}
                rows={stats.data.by_winning_source.map((r) => [r.source, String(r.scans)])}
              />
            </Card>
            <Card className="space-y-3 p-4">
              <h2 className="font-semibold">Category mix</h2>
              <Table
                head={["Category", "Scans"]}
                rows={stats.data.by_category.map((r) => [r.category, String(r.scans)])}
              />
            </Card>
          </div>
        </>
      )}

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Barcode className="size-4" />
          <h2 className="font-semibold">Unknown products &amp; misses</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Codes that failed to resolve, most frequent first. &ldquo;Resolved later&rdquo; means the
          product is now in the shared cache — usually thanks to a label photo or a user correction.
        </p>
        {misses.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {misses.error && (
          <p className="text-sm text-destructive">
            Couldn&rsquo;t load misses: {(misses.error as Error).message}
          </p>
        )}
        {misses.data && misses.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No unresolved scans in this window. Nice.</p>
        )}
        {misses.data && misses.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Barcode</th>
                  <th className="py-2 pr-3">Misses</th>
                  <th className="py-2 pr-3">Methods</th>
                  <th className="py-2 pr-3">Cached entry</th>
                  <th className="py-2 pr-3">Fixes</th>
                  <th className="py-2 pr-3">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {misses.data.map((row) => (
                  <tr key={row.code} className="border-t border-border/60 align-top">
                    <td className="py-2 pr-3 font-mono tabular-nums">{row.code}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.misses}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {(row.scan_sources ?? []).map(scanSourceLabel).join(", ") || "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {row.resolved_later ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-primary" />
                          <span>
                            {row.cached_name ?? "Cached"}
                            {row.cached_category ? ` · ${row.cached_category}` : ""}
                            {row.cached_source ? ` · ${row.cached_source}` : ""}
                          </span>
                        </span>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" /> still unknown
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{row.corrections}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {new Date(row.last_seen).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet for this window.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="py-2 pr-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells) => (
            <tr key={cells.join("|")} className="border-t border-border/60">
              {cells.map((c, i) => (
                <td key={`${c}-${i}`} className="py-2 pr-3 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
