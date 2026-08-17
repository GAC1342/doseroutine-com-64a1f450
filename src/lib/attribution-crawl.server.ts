// Attribution / content-credit crawler. Server-only.
//
// Verifies that every public page in the sitemap still carries the three
// signals that make scrapers and LLMs credit DoseRoutine:
//
//   1. HTTP headers  — X-Content-Attribution,
//                      Link: rel="cite-as"
//   2. Visible credit — a human-readable "© DoseRoutine / published by
//                      DoseRoutine" line in the rendered body
//   3. JSON-LD       — a publisher / Organization node naming DoseRoutine,
//                      plus a canonical URL and author meta
//
// Used by:
//  - src/routes/api/public/hooks/attribution-crawl.ts (daily cron)
//  - src/lib/attribution-crawl.functions.ts (on-demand admin server fn)

const SITE = "https://doseroutine.com";
const SITEMAP_URL = `${SITE}/sitemap.xml`;
// Crawl as an AI/scraper UA — that is the traffic this check exists for.
const UA =
  "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot) DoseRoutineAttributionCheck/1.0";
const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;

export type CheckId =
  | "header_attribution"
  | "header_cite_as"
  | "visible_credit"
  | "jsonld_publisher"
  | "meta_author"
  | "canonical";

export interface AttributionIssue {
  check: CheckId;
  severity: "error" | "warning";
  message: string;
}

export interface AttributionUrlReport {
  url: string;
  status: number | null;
  issues: AttributionIssue[];
  fetchError?: string;
}

export interface AttributionReport {
  checkedAt: string;
  sitemapUrl: string;
  totalUrls: number;
  checkedUrls: number;
  urlsWithIssues: number;
  errorCount: number;
  warningCount: number;
  /** Per-check failure tallies, e.g. { visible_credit: 3 } */
  byCheck: Record<string, number>;
  reports: AttributionUrlReport[];
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

function parseSitemap(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) urls.push(m[1].trim());
  return urls;
}

/**
 * React SSR splits adjacent text nodes with `<!-- -->` comments, which breaks
 * naive substring matching on rendered copy. Strip them before matching.
 */
function normalizeHtml(html: string): string {
  return html.replace(/<!--\s*-->/g, "");
}

/** Human-readable credit-line variants used across the site. */
const CREDIT_PATTERNS: RegExp[] = [
  /Original (research|editorial compilation) by DoseRoutine/i,
  /Published by DoseRoutine/i,
  /DoseRoutine\s*[—–-]\s*original content/i,
  /©\s*\d{4}\s*(<[^>]+>\s*)?DoseRoutine/i,
  /©\s*DoseRoutine/i,
];

function hasVisibleCredit(html: string): boolean {
  return CREDIT_PATTERNS.some((re) => re.test(html));
}

/**
 * True when any JSON-LD block names DoseRoutine as publisher/author/provider,
 * or declares an Organization named DoseRoutine.
 */
function hasPublisherJsonLd(html: string): boolean {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (jsonLdCreditsDoseRoutine(parsed)) return true;
  }
  return false;
}

function jsonLdCreditsDoseRoutine(node: unknown, depth = 0): boolean {
  if (depth > 8 || node === null || typeof node !== "object") return false;
  if (Array.isArray(node)) {
    return node.some((n) => jsonLdCreditsDoseRoutine(n, depth + 1));
  }
  const obj = node as Record<string, unknown>;

  for (const key of ["publisher", "author", "provider", "copyrightHolder"]) {
    const value = obj[key];
    if (typeof value === "string" && /doseroutine/i.test(value)) return true;
    if (value && typeof value === "object") {
      const name = (value as Record<string, unknown>).name;
      if (typeof name === "string" && /doseroutine/i.test(name)) return true;
      if (jsonLdCreditsDoseRoutine(value, depth + 1)) return true;
    }
  }

  const types = ([] as unknown[]).concat(obj["@type"] ?? []);
  const name = obj.name;
  if (
    types.some((t) => typeof t === "string" && /Organization/i.test(t)) &&
    typeof name === "string" &&
    /doseroutine/i.test(name)
  ) {
    return true;
  }

  return Object.values(obj).some((v) =>
    v && typeof v === "object" ? jsonLdCreditsDoseRoutine(v, depth + 1) : false,
  );
}

async function checkUrl(url: string): Promise<AttributionUrlReport> {
  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (e) {
    return {
      url,
      status: null,
      issues: [],
      fetchError: e instanceof Error ? e.message : String(e),
    };
  }

  if (!res.ok) {
    return {
      url,
      status: res.status,
      issues: [],
      fetchError: `HTTP ${res.status}`,
    };
  }

  const html = normalizeHtml(await res.text());
  const issues: AttributionIssue[] = [];

  const attribution = res.headers.get("x-content-attribution") ?? "";
  if (!/doseroutine\.com/i.test(attribution)) {
    issues.push({
      check: "header_attribution",
      severity: "error",
      message: attribution
        ? `X-Content-Attribution does not reference doseroutine.com (got "${attribution}")`
        : "Missing X-Content-Attribution header",
    });
  }

  const link = res.headers.get("link") ?? "";
  if (!/rel=["']?cite-as/i.test(link)) {
    issues.push({
      check: "header_cite_as",
      severity: "error",
      message: 'Missing Link: rel="cite-as" header',
    });
  }

  if (!hasVisibleCredit(html)) {
    issues.push({
      check: "visible_credit",
      severity: "error",
      message: "No visible DoseRoutine credit line in the rendered page",
    });
  }

  if (!hasPublisherJsonLd(html)) {
    issues.push({
      check: "jsonld_publisher",
      severity: "error",
      message: "No JSON-LD node credits DoseRoutine as publisher/author",
    });
  }

  if (!/<meta[^>]+name=["']author["']/i.test(html)) {
    issues.push({
      check: "meta_author",
      severity: "warning",
      message: 'Missing <meta name="author">',
    });
  }

  if (!/rel=["']canonical["']/i.test(html)) {
    issues.push({
      check: "canonical",
      severity: "error",
      message: 'Missing <link rel="canonical">',
    });
  }

  return { url, status: res.status, issues };
}

async function runPool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

export interface RunOptions {
  /** If set, only checks the first N sitemap URLs. Useful for on-demand runs. */
  limit?: number;
}

export async function runAttributionCrawl(opts: RunOptions = {}): Promise<AttributionReport> {
  const sitemapRes = await fetchWithTimeout(SITEMAP_URL);
  if (!sitemapRes.ok) {
    throw new Error(`Sitemap fetch failed: HTTP ${sitemapRes.status}`);
  }
  const xml = await sitemapRes.text();
  let urls = parseSitemap(xml).filter((u) => u.startsWith(SITE));
  const totalUrls = urls.length;
  if (opts.limit && opts.limit > 0) urls = urls.slice(0, opts.limit);

  const reports = await runPool(urls, checkUrl, CONCURRENCY);

  let errorCount = 0;
  let warningCount = 0;
  let urlsWithIssues = 0;
  const byCheck: Record<string, number> = {};

  for (const r of reports) {
    const errs = r.issues.filter((i) => i.severity === "error").length;
    const warns = r.issues.filter((i) => i.severity === "warning").length;
    errorCount += errs;
    warningCount += warns;
    if (r.fetchError) errorCount++;
    if (errs > 0 || warns > 0 || r.fetchError) urlsWithIssues++;
    for (const issue of r.issues) {
      byCheck[issue.check] = (byCheck[issue.check] ?? 0) + 1;
    }
    if (r.fetchError) byCheck.fetch = (byCheck.fetch ?? 0) + 1;
  }

  return {
    checkedAt: new Date().toISOString(),
    sitemapUrl: SITEMAP_URL,
    totalUrls,
    checkedUrls: reports.length,
    urlsWithIssues,
    errorCount,
    warningCount,
    byCheck,
    reports,
  };
}

export { SITE, SITEMAP_URL, hasVisibleCredit, hasPublisherJsonLd, normalizeHtml, CREDIT_PATTERNS };
