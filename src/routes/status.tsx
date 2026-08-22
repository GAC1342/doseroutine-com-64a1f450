import { cn } from "@/lib/utils";
import { canonicalLinks } from "@/lib/hreflang";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { cardClassName } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import { PublicBackHeader } from "@/components/public-back-header";
import { useEffect, useState } from "react";
import { BUILD_ID } from "@/lib/asset-url";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { STATUS_FAQ } from "@/lib/aeo-faqs-index";

type Check = {
  name: string;
  ok: boolean;
  latency_ms: number | null;
  detail?: string;
};

type StatusPayload = {
  status: "ok" | "degraded";
  build_id: string;
  server_started_at: string;
  uptime_seconds: number;
  now: string;
  checks: Check[];
};

export const Route = createFileRoute("/status")({
  // Server-rendered so crawlers see the heading and page copy in the initial
  // HTML. The live payload is still fetched client-side in useEffect.

  head: () => ({
    meta: [
      { title: "System Status — DoseRoutine Uptime and Live Checks" },
      {
        name: "description",
        content:
          "Live build version, uptime, and API connectivity for DoseRoutine. Check it against your full supplement, TRT, or peptide routine with DoseRoutine.",
      },
      { property: "og:title", content: "System Status — DoseRoutine Uptime and Live Checks" },
      {
        property: "og:description",
        content:
          "Live build version, uptime, and API connectivity for DoseRoutine. Check it against your full supplement, TRT, or peptide routine with DoseRoutine.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://doseroutine.com/status" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "System Status — DoseRoutine Uptime and Live Checks" },
      {
        name: "twitter:description",
        content:
          "Live build version, uptime, and API connectivity for DoseRoutine. Check it against your full supplement, TRT, or peptide routine with DoseRoutine.",
      },
    ],
    links: [...canonicalLinks("https://doseroutine.com/status")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/status", [{ name: "Status", path: "/status" }]),
      aeoFaqScript("https://doseroutine.com/status", STATUS_FAQ),
    ],
  }),
  component: StatusPage,
});

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/status?t=${Date.now()}`, { cache: "no-store" });
      const json = (await res.json()) as StatusPayload;
      setData(json);
      setFetchedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const buildMatches = data ? data.build_id === BUILD_ID : true;

  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">System Status</h1>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        {data && (
          <>
            <div
              className={`rounded-xl border p-4 mb-6 flex items-center gap-3 ${
                data.status === "ok"
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              {data.status === "ok" ? (
                <CheckCircle2 className="h-6 w-6 text-success-strong" />
              ) : (
                <XCircle className="h-6 w-6 text-warning" />
              )}
              <div>
                <div className="font-semibold">
                  {data.status === "ok" ? "All systems operational" : "Degraded"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Checked {fetchedAt?.toLocaleTimeString() ?? ""} · auto-refresh every 30s
                </div>
              </div>
            </div>

            <section className={cn(cardClassName, "p-4 mb-6")}>
              <h2 className="font-semibold mb-3">Build</h2>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Server build</dt>
                <dd className="font-mono break-all">{data.build_id}</dd>
                <dt className="text-muted-foreground">Client build</dt>
                <dd className="font-mono break-all">{BUILD_ID}</dd>
                <dt className="text-muted-foreground">Match</dt>
                <dd>
                  {buildMatches ? (
                    <span className="font-medium text-success-strong">✓ in sync</span>
                  ) : (
                    <span className="font-medium text-warning">⚠ reload for latest</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">Server started</dt>
                <dd>{new Date(data.server_started_at).toLocaleString()}</dd>
                <dt className="text-muted-foreground">Uptime</dt>
                <dd>{formatUptime(data.uptime_seconds)}</dd>
              </dl>
            </section>

            <section className={cn(cardClassName, "p-4")}>
              <h2 className="font-semibold mb-3">Connectivity</h2>
              <ul className="space-y-2">
                {data.checks.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between border-b border-border/50 last:border-0 pb-2 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      {c.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-success-strong" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-sm">{c.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {c.latency_ms != null && <span>{c.latency_ms}ms</span>}
                      {c.detail && <div>{c.detail}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <p className="mt-6 text-xs text-muted-foreground">
              Raw JSON:{" "}
              <a href="/api/public/status" className="underline" target="_blank" rel="noreferrer">
                /api/public/status
              </a>
            </p>
          </>
        )}
        <AeoFaq pairs={STATUS_FAQ} />
        <ProseContainer>
          <PageProse id="status" />
        </ProseContainer>
      </main>
    </div>
  );
}
