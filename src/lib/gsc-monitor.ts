// Pure helpers for the daily Google Search Console monitor.
// Kept free of network/db access so they can be unit-tested.

export interface SitemapStatus {
  path: string | null;
  lastDownloaded: string | null;
  lastSubmitted: string | null;
  isPending: boolean | null;
  submittedUrls: number | null;
  indexedUrls: number | null;
  errors: number | null;
  warnings: number | null;
}

export interface CoverageCounts {
  inspected: number;
  indexed: number;
  notIndexed: number;
  excluded: number;
  crawlErrors: number;
  robotsBlocked: number;
  richResultFails: number;
  breakdown: Record<string, number>;
}

export interface PerformanceTotals {
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  avgPosition: number | null;
  rangeStart: string | null;
  rangeEnd: string | null;
}

export interface MonitorIssue {
  kind:
    | "sitemap_errors"
    | "sitemap_warnings"
    | "sitemap_stale"
    | "sitemap_unreachable"
    | "sitemap_url_drop"
    | "indexed_drop"
    | "crawl_errors"
    | "robots_blocked"
    | "api_error";
  message: string;
  before?: string;
  after?: string;
}

/** How many days without a Google fetch before the sitemap counts as stale. */
export const SITEMAP_STALE_DAYS = 7;
/** Fractional drop in indexed pages (vs. previous snapshot) that triggers an alert. */
export const INDEXED_DROP_RATIO = 0.15;
/** Fractional drop in sitemap URL count that triggers an alert. */
export const SITEMAP_URL_DROP_RATIO = 0.1;

/** Parse a Search Console `sitemaps` entry into our flat shape. */
export function parseSitemapEntry(entry: unknown): SitemapStatus {
  const e = (entry ?? {}) as Record<string, unknown>;
  const contents = Array.isArray(e["contents"]) ? (e["contents"] as Record<string, unknown>[]) : [];
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const sumContents = (key: string): number | null => {
    if (contents.length === 0) return null;
    let total = 0;
    let seen = false;
    for (const c of contents) {
      const n = num(c[key]);
      if (n !== null) {
        total += n;
        seen = true;
      }
    }
    return seen ? total : null;
  };
  const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
  return {
    path: str(e["path"]),
    lastDownloaded: str(e["lastDownloaded"]),
    lastSubmitted: str(e["lastSubmitted"]),
    isPending: typeof e["isPending"] === "boolean" ? (e["isPending"] as boolean) : null,
    submittedUrls: sumContents("submitted"),
    indexedUrls: sumContents("indexed"),
    errors: num(e["errors"]),
    warnings: num(e["warnings"]),
  };
}

/** Roll per-URL inspection snapshots into aggregate coverage counts. */
export function summarizeCoverage(
  rows: Array<{
    indexing_verdict?: string | null;
    coverage_state?: string | null;
    rich_result_types?: string[] | null;
  }>,
): CoverageCounts {
  const breakdown: Record<string, number> = {};
  let indexed = 0;
  let notIndexed = 0;
  let excluded = 0;
  let crawlErrors = 0;
  let robotsBlocked = 0;
  let inspected = 0;

  for (const r of rows) {
    const verdict = r.indexing_verdict ?? null;
    const coverage = r.coverage_state ?? null;
    if (!verdict && !coverage) continue;
    inspected += 1;
    const key = coverage ?? verdict ?? "Unknown";
    breakdown[key] = (breakdown[key] ?? 0) + 1;

    const c = (coverage ?? "").toLowerCase();
    if (verdict === "PASS" && !/not indexed/.test(c)) indexed += 1;
    else notIndexed += 1;
    if (/excluded|discovered|crawled - currently not indexed|duplicate|alternate/.test(c))
      excluded += 1;
    if (/error|server error|not found|redirect error|soft 404/.test(c)) crawlErrors += 1;
    if (/robots|blocked/.test(c)) robotsBlocked += 1;
  }

  return {
    inspected,
    indexed,
    notIndexed,
    excluded,
    crawlErrors,
    robotsBlocked,
    richResultFails: 0,
    breakdown,
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

/**
 * Compare today's readings against the previous snapshot and return every
 * issue worth alerting on. Missing prior data never produces an alert.
 */
export function detectIssues(input: {
  sitemap: SitemapStatus | null;
  sitemapFetchOk: boolean | null;
  sitemapUrlCount: number | null;
  coverage: CoverageCounts;
  prior: {
    indexed_urls?: number | null;
    sitemap_url_count?: number | null;
  } | null;
  apiError?: string | null;
  now?: Date;
}): MonitorIssue[] {
  const issues: MonitorIssue[] = [];
  const now = input.now ?? new Date();

  if (input.apiError) {
    issues.push({ kind: "api_error", message: `Search Console API error: ${input.apiError}` });
  }

  const s = input.sitemap;
  if (s) {
    if ((s.errors ?? 0) > 0) {
      issues.push({
        kind: "sitemap_errors",
        message: `Search Console reports ${s.errors} sitemap error(s) for ${s.path ?? "the sitemap"}`,
      });
    }
    if ((s.warnings ?? 0) > 0) {
      issues.push({
        kind: "sitemap_warnings",
        message: `Search Console reports ${s.warnings} sitemap warning(s) for ${s.path ?? "the sitemap"}`,
      });
    }
    if (s.lastDownloaded) {
      const age = daysBetween(now, new Date(s.lastDownloaded));
      if (age > SITEMAP_STALE_DAYS) {
        issues.push({
          kind: "sitemap_stale",
          message: `Google last fetched the sitemap ${Math.round(age)} days ago`,
        });
      }
    }
  }

  if (input.sitemapFetchOk === false) {
    issues.push({ kind: "sitemap_unreachable", message: "sitemap.xml did not return 200" });
  }

  const priorUrls = input.prior?.sitemap_url_count ?? null;
  if (priorUrls && input.sitemapUrlCount !== null) {
    const drop = (priorUrls - input.sitemapUrlCount) / priorUrls;
    if (drop > SITEMAP_URL_DROP_RATIO) {
      issues.push({
        kind: "sitemap_url_drop",
        message: `Sitemap URL count dropped ${Math.round(drop * 100)}%`,
        before: String(priorUrls),
        after: String(input.sitemapUrlCount),
      });
    }
  }

  const priorIndexed = input.prior?.indexed_urls ?? null;
  if (priorIndexed && priorIndexed > 0 && input.coverage.inspected > 0) {
    const drop = (priorIndexed - input.coverage.indexed) / priorIndexed;
    if (drop > INDEXED_DROP_RATIO) {
      issues.push({
        kind: "indexed_drop",
        message: `Indexed page count dropped ${Math.round(drop * 100)}%`,
        before: String(priorIndexed),
        after: String(input.coverage.indexed),
      });
    }
  }

  if (input.coverage.crawlErrors > 0) {
    issues.push({
      kind: "crawl_errors",
      message: `${input.coverage.crawlErrors} monitored page(s) report a crawl error`,
    });
  }
  if (input.coverage.robotsBlocked > 0) {
    issues.push({
      kind: "robots_blocked",
      message: `${input.coverage.robotsBlocked} monitored page(s) are blocked by robots.txt`,
    });
  }

  return issues;
}

/** Count <loc> entries in a sitemap (handles sitemap index files too). */
export function countSitemapLocs(xml: string): number {
  const matches = xml.match(/<loc>/gi);
  return matches ? matches.length : 0;
}
