import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  isDisallowedByRobots,
  nonIndexableProbePaths,
  notFoundProbePaths,
  parseRobotsDisallow,
} from "@/lib/non-indexable";

const TITLE = "Noindex Audit — DoseRoutine";
const DESC =
  "Internal smoke test: scans every non-indexable path and reports mismatches between robots.txt, meta robots and server headers.";

export const Route = createFileRoute("/debug/noindex-audit")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NoindexAuditPage,
});

type Target = {
  rule: string;
  path: string;
  group: "noindex" | "404";
  requiresRobotsRule: boolean;
  expect404: boolean;
};

type Row = Target & {
  httpStatus?: number;
  robotsDisallowed: boolean;
  headerNoindex: boolean;
  metaNoindex: boolean;
  headerValue: string | null;
  metaValue: string | null;
  cacheValue: string | null;
  cacheOk: boolean;
  mismatches: string[];
};

async function auditPath(target: Target, disallow: string[]): Promise<Row> {
  const { path } = target;
  const robotsDisallowed = isDisallowedByRobots(path, disallow);
  let httpStatus: number | undefined;
  let headerValue: string | null = null;
  let metaValue: string | null = null;
  let cacheValue: string | null = null;
  const mismatches: string[] = [];

  try {
    const res = await fetch(path, { cache: "no-store", credentials: "omit" });
    httpStatus = res.status;
    headerValue = res.headers.get("x-robots-tag");
    cacheValue = res.headers.get("cache-control");
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const html = await res.text();
      metaValue =
        html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;
    }
  } catch (err) {
    mismatches.push(err instanceof Error ? err.message : "request failed");
  }

  const headerNoindex = (headerValue ?? "").toLowerCase().includes("noindex");
  const metaNoindex = (metaValue ?? "").toLowerCase().includes("noindex");
  const isHtml = metaValue !== null || httpStatus === 200 || httpStatus === 404;

  if (target.expect404 && httpStatus !== 404) {
    mismatches.push(`expected HTTP 404, got ${httpStatus ?? "no response"}`);
  }
  if (target.requiresRobotsRule && !robotsDisallowed) {
    mismatches.push("robots.txt does not disallow this path");
  }
  const cache = (cacheValue ?? "").toLowerCase();
  const cacheOk =
    !target.expect404 ||
    (cache.includes("no-store") && cache.includes("private") && !cache.includes("public"));
  if (!headerNoindex) mismatches.push("missing X-Robots-Tag: noindex");
  if (!cacheOk) {
    mismatches.push(`404 must send Cache-Control: private, no-store (got ${cacheValue ?? "none"})`);
  }
  if (isHtml && !metaNoindex) mismatches.push('missing <meta name="robots" content="noindex">');

  return {
    ...target,
    httpStatus,
    robotsDisallowed,
    headerNoindex,
    metaNoindex,
    headerValue,
    metaValue,
    cacheValue,
    cacheOk,
    mismatches,
  };
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
        ok ? "border-secondary text-secondary" : "border-destructive text-destructive"
      }`}
    >
      {ok ? "✓" : "✕"} {label}
    </span>
  );
}

function NoindexAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(true);

  const run = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setError(null);
    setRows([]);
    try {
      const robotsRes = await fetch("/robots.txt", { cache: "no-store" });
      const disallow = parseRobotsDisallow(await robotsRes.text());
      const targets: Target[] = [
        ...nonIndexableProbePaths().map((t) => ({
          ...t,
          group: "noindex" as const,
          requiresRobotsRule: true,
          expect404: false,
        })),
        ...notFoundProbePaths().map((t) => ({
          rule: t.rule,
          path: t.path,
          group: "404" as const,
          requiresRobotsRule: t.requiresRobotsRule,
          expect404: true,
        })),
      ];
      const queue = [...targets];
      const results: Row[] = [];
      const workers = Array.from({ length: 6 }, async () => {
        for (;;) {
          const next = queue.shift();
          if (!next) return;
          results.push(await auditPath(next, disallow));

          setRows([...results].sort((a, b) => a.path.localeCompare(b.path)));
        }
      });
      await Promise.all(workers);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  }, []);

  const failing = rows.filter((r) => r.mismatches.length > 0);
  const visible = onlyProblems ? failing : rows;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Noindex audit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Smoke test for private surfaces. Every non-indexable path is fetched and checked three ways:
        a <code>Disallow</code> rule in robots.txt, an <code>X-Robots-Tag: noindex</code> response
        header, and a <code>&lt;meta name="robots"&gt;</code> noindex tag. Any path where the three
        disagree is reported below.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {running ? "Scanning…" : "Run audit"}
        </button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyProblems}
            onChange={(e) => setOnlyProblems(e.target.checked)}
          />
          Only show mismatches
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {rows.length > 0 && (
        <p className="mt-6 text-sm text-foreground">
          Scanned <strong>{rows.length}</strong> paths ·{" "}
          {failing.length === 0 ? (
            <span className="text-secondary">no mismatches{done ? "" : " so far"}</span>
          ) : (
            <span className="text-destructive">{failing.length} with mismatches</span>
          )}
        </p>
      )}

      {(["noindex", "404"] as const).map((group) => {
        const groupRows = visible.filter((r) => r.group === group);
        if (groupRows.length === 0 && !done) return null;
        return (
          <section key={group} className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group === "404" ? "404 / not-found" : "Non-indexable paths"}
            </h2>
            <div className="mt-3 space-y-3">
              {groupRows.map((row) => (
                <div key={row.path} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm text-foreground">{row.path}</span>
                    <span className="text-xs text-muted-foreground">
                      rule {row.rule} · HTTP {row.httpStatus ?? "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.requiresRobotsRule && (
                      <Flag ok={row.robotsDisallowed} label="robots.txt" />
                    )}
                    <Flag ok={row.headerNoindex} label="X-Robots-Tag" />
                    <Flag ok={row.metaNoindex} label="meta robots" />
                    {row.group === "404" && <Flag ok={row.httpStatus === 404} label="HTTP 404" />}
                    {row.group === "404" && <Flag ok={row.cacheOk} label="no-store" />}
                  </div>
                  {row.mismatches.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-destructive">
                      {row.mismatches.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {done && groupRows.length === 0 && (
                <p className="text-sm text-secondary">
                  {group === "404"
                    ? "Every 404 response returns noindex on the header and the meta tag."
                    : "All non-indexable paths agree across robots.txt, headers and meta tags."}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
