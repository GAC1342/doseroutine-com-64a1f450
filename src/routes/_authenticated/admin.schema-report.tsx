import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runSchemaValidationFn } from "@/lib/schema-validation.functions";
import type { SchemaReport, UrlReport } from "@/lib/schema-validation.server";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/schema-report")({
  head: () => ({
    meta: [
      { title: "Structured data report — DoseRoutine" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SchemaReportPage,
});

function SchemaReportPage() {
  const navigate = useNavigate();
  const run = useServerFn(runSchemaValidationFn);
  const [report, setReport] = useState<SchemaReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "errors" | "warnings">("errors");
  const [limitMode, setLimitMode] = useState<"sample" | "full">("sample");

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
  });

  const runCheck = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await run({
        data: { limit: limitMode === "sample" ? 30 : undefined },
      });
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const filtered = useMemo<UrlReport[]>(() => {
    if (!report) return [];
    return report.reports.filter((r) => {
      if (filter === "all") return true;
      const wantErr = filter === "errors";
      return (
        r.issues.some((i) => (wantErr ? i.severity === "error" : i.severity === "warning")) ||
        (wantErr && !!r.fetchError)
      );
    });
  }, [report, filter]);

  if (adminLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">Checking access…</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <button
          onClick={() => navigate({ to: "/more" })}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Card className="rounded-2xl border-border p-6">
          <h1 className="font-display text-2xl font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The structured-data report is restricted to DoseRoutine admins.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        to="/more"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to More
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Structured data report
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Validates every <code>&lt;script type="application/ld+json"&gt;</code> block across the
          live site. Catches JSON parse errors, missing required Schema.org fields (Article,
          BreadcrumbList, ItemList, MedicalWebPage, FAQPage, …), and pages missing structured data
          entirely. A scheduled version runs daily and emails when issues appear.
        </p>
      </div>

      <Card className="mb-6 rounded-2xl border-border p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-background p-1 text-xs">
            <button
              onClick={() => setLimitMode("sample")}
              className={`rounded-full px-3 py-1.5 font-medium transition ${limitMode === "sample" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Sample (30 URLs)
            </button>
            <button
              onClick={() => setLimitMode("full")}
              className={`rounded-full px-3 py-1.5 font-medium transition ${limitMode === "full" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Full crawl (all URLs)
            </button>
          </div>
          <button
            onClick={runCheck}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {running ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Running…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> {report ? "Run again" : "Run validation"}
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Sample runs in ~5 seconds. Full crawl takes ~60 seconds and hits every URL in the sitemap.
        </p>
        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</p>
        )}
      </Card>

      {report && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="URLs checked" value={report.checkedUrls} />
            <Stat label="JSON-LD blocks" value={report.totalBlocks} />
            <Stat
              label="Errors"
              value={report.errorCount}
              tone={report.errorCount > 0 ? "danger" : "ok"}
            />
            <Stat
              label="Warnings"
              value={report.warningCount}
              tone={report.warningCount > 0 ? "warn" : "ok"}
            />
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {report.urlsWithIssues === 0 ? (
                <span className="inline-flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> All {report.checkedUrls} URLs passed
                  structured-data validation.
                </span>
              ) : (
                <>
                  {report.urlsWithIssues} of {report.checkedUrls} URLs need attention. Checked at{" "}
                  {new Date(report.checkedAt).toLocaleString()}.
                </>
              )}
            </div>
            <div className="flex gap-1 rounded-full bg-background p-1 text-xs">
              {(["errors", "warnings", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 font-medium transition ${filter === f ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No URLs match this filter.
              </p>
            ) : (
              filtered.map((r) => <UrlCard key={r.url} r={r} />)
            )}
          </div>
        </>
      )}

      {!report && !running && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Click <strong>Run validation</strong> to crawl the live sitemap and score every JSON-LD
          block.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "danger";
}) {
  const color =
    tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card className="rounded-2xl border-border p-4">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-semibold ${color}`}>
        {value.toLocaleString()}
      </div>
    </Card>
  );
}

function UrlCard({ r }: { r: UrlReport }) {
  const errs = r.issues.filter((i) => i.severity === "error");
  const warns = r.issues.filter((i) => i.severity === "warning");
  const clean = errs.length === 0 && warns.length === 0 && !r.fetchError;
  return (
    <Card className="rounded-2xl border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sm font-medium text-primary hover:underline"
        >
          {r.url.replace(/^https?:\/\//, "")}
        </a>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-background px-2 py-0.5 text-muted-foreground">
            {r.status ?? "—"} · {r.blockCount} block{r.blockCount === 1 ? "" : "s"}
          </span>
          {errs.length > 0 && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
              {errs.length} error{errs.length === 1 ? "" : "s"}
            </span>
          )}
          {warns.length > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700">
              {warns.length} warning{warns.length === 1 ? "" : "s"}
            </span>
          )}
          {clean && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> clean
            </span>
          )}
        </div>
      </div>
      {r.types.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {r.types.map((t) => (
            <span
              key={t}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {r.fetchError && (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {r.fetchError}
        </p>
      )}
      {r.issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {r.issues.map((i, idx) => (
            <li
              key={idx}
              className={`flex items-start gap-2 rounded-lg p-2 text-xs ${
                i.severity === "error"
                  ? "bg-destructive/5 text-destructive"
                  : "bg-amber-500/5 text-amber-800"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <strong>[block {i.blockIndex >= 0 ? i.blockIndex + 1 : "—"}]</strong>{" "}
                {i.typeHint ? `${i.typeHint}: ` : ""}
                {i.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
