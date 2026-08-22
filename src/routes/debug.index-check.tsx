import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

const TITLE = "Index Check — DoseRoutine";
const DESC =
  "Internal build check: indexability, canonical and sitemap inclusion for library routes.";

export const Route = createFileRoute("/debug/index-check")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IndexCheckPage,
});

type RowStatus = "pending" | "ok" | "warn" | "fail";

type Row = {
  path: string;
  inSitemap: boolean;
  httpStatus?: number;
  robotsHeader?: string | null;
  canonical?: string | null;
  status: RowStatus;
  notes: string[];
};

const ORIGIN_CANONICAL = "https://doseroutine.com";

function parseSitemapPaths(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => m[1].trim())
    .map((loc) => {
      try {
        return new URL(loc).pathname;
      } catch {
        return loc;
      }
    });
}

async function checkPath(path: string, inSitemap: boolean): Promise<Row> {
  const notes: string[] = [];
  let httpStatus: number | undefined;
  let robotsHeader: string | null = null;
  let canonical: string | null = null;

  try {
    const res = await fetch(path, { cache: "no-store", credentials: "omit" });
    httpStatus = res.status;
    robotsHeader = res.headers.get("x-robots-tag");
    const html = await res.text();
    canonical =
      html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? null;
    const canonicalCount = (html.match(/rel=["']canonical["']/gi) ?? []).length;
    const metaRobots =
      html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;

    if (res.status !== 200) notes.push(`HTTP ${res.status}`);
    if ((robotsHeader ?? "").toLowerCase().includes("noindex"))
      notes.push(`X-Robots-Tag: ${robotsHeader}`);
    if ((metaRobots ?? "").toLowerCase().includes("noindex"))
      notes.push(`meta robots: ${metaRobots}`);
    if (canonicalCount > 1) notes.push(`${canonicalCount} canonical tags`);
    if (!canonical) notes.push("missing canonical");
    else if (!canonical.startsWith(ORIGIN_CANONICAL))
      notes.push("canonical not on doseroutine.com");
    else if (canonical.replace(ORIGIN_CANONICAL, "").replace(/\/$/, "") !== path.replace(/\/$/, ""))
      notes.push("canonical points elsewhere");
    if (!inSitemap) notes.push("not in sitemap.xml");
  } catch (err) {
    notes.push(err instanceof Error ? err.message : "request failed");
  }

  const fatal =
    httpStatus !== 200 ||
    notes.some((n) => n.includes("canonical") || n.startsWith("HTTP") || n === "request failed");
  const status: RowStatus = notes.length === 0 ? "ok" : fatal ? "fail" : "warn";
  return { path, inSitemap, httpStatus, robotsHeader, canonical, status, notes };
}

type IssueType = "canonical" | "robots" | "sitemap" | "http";

const ISSUE_LABELS: Record<IssueType, string> = {
  canonical: "Canonical",
  robots: "Robots / indexability",
  sitemap: "Sitemap inclusion",
  http: "HTTP / request",
};

function issueTypeOf(note: string): IssueType {
  const n = note.toLowerCase();
  if (n.includes("canonical")) return "canonical";
  if (n.includes("robots") || n.includes("noindex")) return "robots";
  if (n.includes("sitemap")) return "sitemap";
  return "http";
}

function issueTypesOf(row: Row): IssueType[] {
  return Array.from(new Set(row.notes.map(issueTypeOf)));
}

function badgeClass(status: RowStatus) {
  return status === "ok"
    ? "border-secondary text-secondary"
    : status === "warn"
      ? "border-primary text-primary"
      : status === "fail"
        ? "border-destructive text-destructive"
        : "border-border text-muted-foreground";
}

function IndexCheckPage() {
  const [sitemapPaths, setSitemapPaths] = useState<string[] | null>(null);
  const [current, setCurrent] = useState<Row | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(25);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "type">("none");
  const [typeFilter, setTypeFilter] = useState<"all" | IssueType>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/sitemap.xml", { cache: "no-store" });
        const xml = await res.text();
        if (cancelled) return;
        setSitemapPaths(parseSitemapPaths(xml));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load sitemap.xml");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sitemapPaths) return;
    const path = window.location.pathname;
    checkPath(path, sitemapPaths.includes(path)).then(setCurrent);
  }, [sitemapPaths]);

  const libraryPaths = (sitemapPaths ?? []).filter(
    (p) => p === "/library" || p.startsWith("/library/"),
  );

  const run = useCallback(async () => {
    if (!sitemapPaths) return;
    setRunning(true);
    setRows([]);
    const targets = libraryPaths.slice(0, limit);
    const queue = [...targets];
    const results: Row[] = [];
    const workers = Array.from({ length: 6 }, async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        const row = await checkPath(next, true);
        results.push(row);
        setRows([...results].sort((a, b) => a.path.localeCompare(b.path)));
      }
    });
    await Promise.all(workers);
    setRunning(false);
  }, [sitemapPaths, libraryPaths, limit]);

  const failing = rows.filter((r) => r.status !== "ok");
  const visibleRows = rows.filter((row) => {
    if (onlyProblems && row.status === "ok") return false;
    if (typeFilter !== "all" && !issueTypesOf(row).includes(typeFilter)) return false;
    return true;
  });
  const groups = (Object.keys(ISSUE_LABELS) as IssueType[])
    .filter((type) => typeFilter === "all" || typeFilter === type)
    .map((type) => ({
      type,
      rows: visibleRows.filter((row) => issueTypesOf(row).includes(type)),
    }))
    .filter((g) => g.rows.length > 0);
  const cleanRows = visibleRows.filter((row) => row.notes.length === 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Index check</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Internal build verification. Checks indexability (X-Robots-Tag + meta robots), the canonical
        tag, and sitemap.xml inclusion for the current URL and every library route.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link
          to="/debug/env"
          className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-foreground hover:border-primary hover:text-primary"
        >
          Environment check →
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <section className="mt-8 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">This URL</h2>
        {!current ? (
          <p className="mt-2 text-sm text-muted-foreground">Checking…</p>
        ) : (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Path</dt>
            <dd className="font-mono text-foreground">{current.path}</dd>
            <dt className="text-muted-foreground">HTTP</dt>
            <dd className="text-foreground">{current.httpStatus ?? "—"}</dd>
            <dt className="text-muted-foreground">X-Robots-Tag</dt>
            <dd className="text-foreground">{current.robotsHeader ?? "none"}</dd>
            <dt className="text-muted-foreground">Canonical</dt>
            <dd className="break-all font-mono text-foreground">
              {current.canonical ?? "missing"}
            </dd>
            <dt className="text-muted-foreground">In sitemap</dt>
            <dd className="text-foreground">
              {current.inSitemap ? "yes" : "no (expected for this page)"}
            </dd>
          </dl>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Library section{sitemapPaths ? ` — ${libraryPaths.length} URLs in sitemap` : ""}
          </h2>
          <label className="text-xs text-muted-foreground">
            Check first{" "}
            <input
              type="number"
              min={1}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={run}
            disabled={!sitemapPaths || running}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {running ? `Checking… (${rows.length})` : "Run check"}
          </button>
          {rows.length > 0 && !running && (
            <span
              className={`rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass(failing.length ? "fail" : "ok")}`}
            >
              {failing.length
                ? `${failing.length} of ${rows.length} need attention`
                : `All ${rows.length} pass`}
            </span>
          )}
        </div>

        {rows.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyProblems}
                onChange={(e) => setOnlyProblems(e.target.checked)}
                className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
              />
              Only WARN/FAIL
            </label>
            <label className="flex items-center gap-2 text-muted-foreground">
              Error type
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | IssueType)}
                className="rounded border border-border bg-background px-2 py-1 text-foreground"
              >
                <option value="all">All</option>
                {(Object.keys(ISSUE_LABELS) as IssueType[]).map((type) => (
                  <option key={type} value={type}>
                    {ISSUE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-muted-foreground">
              Group by
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as "none" | "type")}
                className="rounded border border-border bg-background px-2 py-1 text-foreground"
              >
                <option value="none">None (flat list)</option>
                <option value="type">Error type</option>
              </select>
            </label>
            <span className="text-muted-foreground">
              Showing {visibleRows.length} of {rows.length}
            </span>
          </div>
        )}

        {rows.length > 0 && visibleRows.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No rows match the current filters.</p>
        )}

        {visibleRows.length > 0 && groupBy === "none" && (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
            {visibleRows.map((row) => (
              <RowItem key={row.path} row={row} />
            ))}
          </ul>
        )}

        {visibleRows.length > 0 && groupBy === "type" && (
          <div className="mt-4 space-y-4">
            {groups.map((group) => (
              <div key={group.type} className="rounded-lg border border-border bg-card">
                <h3 className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {ISSUE_LABELS[group.type]} — {group.rows.length}
                </h3>
                <ul className="divide-y divide-border">
                  {group.rows.map((row) => (
                    <RowItem key={row.path} row={row} filterType={group.type} />
                  ))}
                </ul>
              </div>
            ))}
            {cleanRows.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {cleanRows.length} page{cleanRows.length === 1 ? "" : "s"} passed with no issues
                (not grouped).
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function RowItem({ row, filterType }: { row: Row; filterType?: IssueType }) {
  const notes = filterType ? row.notes.filter((n) => issueTypeOf(n) === filterType) : row.notes;
  // Text fragment jumps straight to the <loc> line when the browser supports it,
  // and harmlessly falls back to the top of sitemap.xml when it doesn't.
  const sitemapHref = `/sitemap.xml#:~:text=${encodeURIComponent(row.path)}`;
  const linkClass = "underline underline-offset-2 hover:text-primary";
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
      <span
        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
      >
        {row.status === "ok" ? "OK" : row.status === "warn" ? "WARN" : "FAIL"}
      </span>
      <a
        href={row.path}
        target="_blank"
        rel="noreferrer"
        className={`font-mono text-foreground ${linkClass}`}
        title="Open this page in a new tab"
      >
        {row.path}
      </a>
      <span className="text-muted-foreground">{row.httpStatus ?? "—"}</span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {row.inSitemap ? (
          <a
            href={sitemapHref}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
            title={`Find ${row.path} in sitemap.xml`}
          >
            sitemap ↗
          </a>
        ) : (
          <span className="text-destructive">not in sitemap</span>
        )}
        {row.canonical && (
          <a
            href={row.canonical}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
            title={row.canonical}
          >
            canonical ↗
          </a>
        )}
      </span>
      {notes.length > 0 && <span className="text-destructive">{notes.join(" · ")}</span>}
    </li>
  );
}
