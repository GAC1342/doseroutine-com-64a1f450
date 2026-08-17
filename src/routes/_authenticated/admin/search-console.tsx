import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listGscSnapshots } from "@/lib/gsc-monitor.functions";
import { listIndexSubmissions, submitSitemapAndReindex } from "@/lib/reindex.functions";

export const Route = createFileRoute("/_authenticated/admin/search-console")({
  head: () => ({
    meta: [
      { title: "Search Console monitor — DoseRoutine" },
      {
        name: "description",
        content:
          "Internal history of Search Console sitemap fetch status, indexing counts and reported errors.",
      },
      { property: "og:title", content: "Search Console monitor — DoseRoutine" },
      { property: "og:description", content: "Sitemap and indexing history tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SearchConsolePage,
});

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

function delta(current: number | null, previous: number | null | undefined): string {
  if (current === null || previous === null || previous === undefined) return "";
  const diff = current - previous;
  if (diff === 0) return " (±0)";
  return ` (${diff > 0 ? "+" : ""}${diff})`;
}

function SearchConsolePage() {
  const fetchSnapshots = useServerFn(listGscSnapshots);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "gsc-snapshots", 60],
    queryFn: () => fetchSnapshots({ data: { days: 60 } }),
    refetchInterval: 300_000,
  });

  const rows = data?.rows ?? [];
  const latest = rows[0];
  const previous = rows[1];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Search Console monitor</h1>
        <p className="text-sm text-muted-foreground">
          Daily snapshot of sitemap fetch status, indexing counts and reported errors. Recorded
          automatically each morning; alerts email out only when something regresses.
        </p>
      </header>

      <SubmitCard />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn’t load snapshots: {(error as Error).message}
        </p>
      )}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No snapshots recorded yet — the first one lands after tonight’s run.
        </p>
      )}

      {latest && (
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Latest — {latest.snapshot_date}</h2>
            {latest.issues.length > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" /> {latest.issues.length} issue
                {latest.issues.length === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="size-3" /> all clear
              </Badge>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Stat
              label="Sitemap last fetched by Google"
              value={fmtDate(latest.sitemap_last_downloaded)}
            />
            <Stat
              label="Sitemap errors / warnings"
              value={`${latest.sitemap_errors ?? 0} / ${latest.sitemap_warnings ?? 0}`}
            />
            <Stat
              label="URLs in sitemap"
              value={`${latest.sitemap_url_count ?? "—"}${delta(latest.sitemap_url_count, previous?.sitemap_url_count)}`}
            />
            <Stat
              label="Indexed (monitored pages)"
              value={`${latest.indexed_urls} of ${latest.inspected_urls}${delta(latest.indexed_urls, previous?.indexed_urls)}`}
            />
            <Stat label="Crawl errors" value={String(latest.crawl_error_urls)} />
            <Stat label="Blocked by robots" value={String(latest.robots_blocked_urls)} />
            <Stat
              label="Clicks (28d)"
              value={`${latest.clicks ?? "—"}${delta(latest.clicks, previous?.clicks)}`}
            />
            <Stat
              label="Impressions (28d)"
              value={`${latest.impressions ?? "—"}${delta(latest.impressions, previous?.impressions)}`}
            />
            <Stat
              label="Avg position"
              value={latest.avg_position ? latest.avg_position.toFixed(1) : "—"}
            />
          </dl>
          {latest.api_error && (
            <p className="text-sm text-destructive">API error: {latest.api_error}</p>
          )}
          {latest.issues.length > 0 && (
            <ul className="space-y-1 text-sm">
              {latest.issues.map((i, idx) => (
                <li key={`${i.kind}-${idx}`} className="text-destructive">
                  <span className="font-medium">{i.kind}</span> — {i.message}
                  {i.before ? ` (${i.before} → ${i.after})` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Sitemap fetched</th>
                <th className="p-3">Err / Warn</th>
                <th className="p-3">Sitemap URLs</th>
                <th className="p-3">Indexed</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">Impr.</th>
                <th className="p-3">Issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.snapshot_date} className="border-b border-border/50">
                  <td className="p-3 font-medium">{r.snapshot_date}</td>
                  <td className="p-3">{fmtDate(r.sitemap_last_downloaded)}</td>
                  <td className="p-3">
                    {r.sitemap_errors ?? 0} / {r.sitemap_warnings ?? 0}
                  </td>
                  <td className="p-3">{r.sitemap_url_count ?? "—"}</td>
                  <td className="p-3">
                    {r.indexed_urls}/{r.inspected_urls}
                  </td>
                  <td className="p-3">{r.clicks ?? "—"}</td>
                  <td className="p-3">{r.impressions ?? "—"}</td>
                  <td className="p-3">{r.issues.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
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

/** One-click: resubmit sitemap.xml to Google + push all URLs to IndexNow. */
function SubmitCard() {
  const queryClient = useQueryClient();
  const runSubmit = useServerFn(submitSitemapAndReindex);
  const fetchHistory = useServerFn(listIndexSubmissions);

  const history = useQuery({
    queryKey: ["admin", "index-submissions"],
    queryFn: () => fetchHistory({ data: { limit: 10 } }),
  });

  const mutation = useMutation({
    mutationFn: () => runSubmit({ data: undefined }),
    onSuccess: (res) => {
      if (res.sitemapSubmitOk) {
        toast.success(
          `Sitemap resubmitted (${res.sitemapUrlCount ?? 0} URLs) · IndexNow: ${res.indexnowSubmitted} URLs`,
        );
      } else {
        toast.error(`Sitemap submit failed: ${res.sitemapSubmitError ?? "unknown error"}`);
      }
      void queryClient.invalidateQueries({ queryKey: ["admin", "index-submissions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const last = history.data?.rows?.[0];
  const result = mutation.data;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Submit sitemap &amp; request indexing</h2>
          <p className="text-sm text-muted-foreground">
            Run this right after you publish. It resubmits{" "}
            <code className="text-xs">sitemap.xml</code> to Google Search Console and pushes every
            sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver).
          </p>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {mutation.isPending ? "Submitting…" : "Submit now"}
        </Button>
      </div>

      {result && (
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Sitemap submitted" value={result.sitemapSubmitOk ? "Yes" : "Failed"} />
          <Stat label="URLs in sitemap" value={String(result.sitemapUrlCount ?? "—")} />
          <Stat label="IndexNow URLs pushed" value={String(result.indexnowSubmitted)} />
          <Stat label="Took" value={`${(result.durationMs / 1000).toFixed(1)}s`} />
        </dl>
      )}
      {result?.sitemapSubmitError && (
        <p className="text-sm text-destructive">Google: {result.sitemapSubmitError}</p>
      )}
      {result?.indexnowError && (
        <p className="text-sm text-destructive">IndexNow: {result.indexnowError}</p>
      )}

      {last && !result && (
        <p className="text-sm text-muted-foreground">
          Last run {fmtDate(last.created_at)} — sitemap{" "}
          {last.sitemap_submit_ok ? "submitted" : "failed"}, {last.indexnow_submitted} URLs pushed
          to IndexNow.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Google has no public API to force-index a single page — resubmitting the sitemap is the
        supported signal, and IndexNow covers the other engines instantly. The same job runs from{" "}
        <code className="text-xs">/api/public/hooks/reindex</code> if you want it automated in CI.
      </p>
    </Card>
  );
}
