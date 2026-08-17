// Pure logic for the recurring sitemap URL health check.
//
// Responsibilities:
//  - Parse a sitemap that may be either a <sitemapindex> or a <urlset>
//  - Recursively discover every child sitemap file listed in an index
//  - Classify each crawled URL as healthy or failing, catching:
//      * non-200 status codes
//      * redirects (any 3xx, including redirects to a different URL/host)
//      * auth walls (redirect to /auth, /login, 401/403, or a sign-in body)

export interface UrlFailure {
  url: string;
  reason: string;
  status?: number;
  finalUrl?: string;
  sitemap?: string;
}

export type SitemapKind = "index" | "urlset" | "unknown";

export interface ParsedSitemap {
  kind: SitemapKind;
  locs: string[];
}

/** Extract every <loc> value and detect whether the doc is an index or a urlset. */
export function parseSitemapXml(xml: string): ParsedSitemap {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const isUrlset = /<urlset[\s>]/i.test(xml);
  const locs: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1]
      .trim()
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    if (raw) locs.push(raw);
  }
  return { kind: isIndex ? "index" : isUrlset ? "urlset" : "unknown", locs };
}

export interface SitemapFetchResult {
  ok: boolean;
  status: number;
  text: string;
  contentType?: string;
  finalUrl?: string;
}

export type SitemapFetcher = (url: string) => Promise<SitemapFetchResult>;

export interface DiscoveryResult {
  /** Every sitemap document that was fetched (root + children). */
  sitemaps: string[];
  /** Deduped page URLs from every urlset. */
  urls: string[];
  /** URL -> sitemap file it came from. */
  source: Record<string, string>;
  /** Failures fetching/parsing sitemap documents themselves. */
  failures: UrlFailure[];
}

/**
 * Fetch the root sitemap and, when it is an index, every sitemap file it lists
 * (recursively, guarding against loops and runaway depth).
 */
export async function discoverSitemapUrls(
  rootUrl: string,
  fetcher: SitemapFetcher,
  options: { maxDepth?: number; maxSitemaps?: number } = {},
): Promise<DiscoveryResult> {
  const maxDepth = options.maxDepth ?? 3;
  const maxSitemaps = options.maxSitemaps ?? 50;

  const sitemaps: string[] = [];
  const urls: string[] = [];
  const source: Record<string, string> = {};
  const failures: UrlFailure[] = [];
  const seenSitemaps = new Set<string>();
  const seenUrls = new Set<string>();

  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl, depth: 0 }];

  while (queue.length > 0) {
    const { url, depth } = queue.shift()!;
    if (seenSitemaps.has(url)) continue;
    if (sitemaps.length >= maxSitemaps) {
      failures.push({ url, reason: `Sitemap limit (${maxSitemaps}) reached; not fetched` });
      continue;
    }
    seenSitemaps.add(url);

    let res: SitemapFetchResult;
    try {
      res = await fetcher(url);
    } catch (err) {
      failures.push({ url, reason: err instanceof Error ? err.message : String(err) });
      continue;
    }

    if (!res.ok) {
      failures.push({ url, reason: `Sitemap fetch failed HTTP ${res.status}`, status: res.status });
      continue;
    }

    sitemaps.push(url);
    const parsed = parseSitemapXml(res.text);

    if (parsed.kind === "unknown" || parsed.locs.length === 0) {
      failures.push({
        url,
        reason: "Sitemap has no <loc> entries or is not valid sitemap XML",
        status: res.status,
      });
      continue;
    }

    if (parsed.kind === "index") {
      if (depth >= maxDepth) {
        failures.push({
          url,
          reason: `Sitemap index nesting deeper than ${maxDepth}`,
          status: res.status,
        });
        continue;
      }
      for (const child of parsed.locs) queue.push({ url: child, depth: depth + 1 });
      continue;
    }

    for (const loc of parsed.locs) {
      if (seenUrls.has(loc)) continue;
      seenUrls.add(loc);
      urls.push(loc);
      source[loc] = url;
    }
  }

  return { sitemaps, urls, source, failures };
}

export interface UrlResponseInfo {
  url: string;
  status: number;
  /** Location header when the response is a 3xx (redirect: 'manual'). */
  location?: string | null;
  contentType?: string | null;
  body?: string;
  /** Set false to skip canonical verification (e.g. non-indexable utility pages). */
  checkCanonical?: boolean;
}

const AUTH_PATH_RE = /^\/(auth|login|sign-?in|signin|register|sign-?up)(\/|\?|$)/i;
/** Private, logged-in-only areas. A public page must never bounce into these. */
const PRIVATE_PATH_RE =
  /^\/(admin|settings|today|dashboard|account|onboarding|_authenticated)(\/|\?|$)/i;

function pathOf(target: string, base: string): string | null {
  try {
    return new URL(target, base).pathname;
  } catch {
    return null;
  }
}

/** Normalise a URL for canonical comparison: drop the hash and any trailing slash. */
export function normaliseForCanonical(target: string, base?: string): string | null {
  try {
    const u = new URL(target, base);
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/"))
      u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return null;
  }
}

/** Pull every <link rel="canonical"> href out of an HTML document. */
export function extractCanonicals(html: string): string[] {
  const out: string[] = [];
  const linkRe = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0];
    if (!/\brel\s*=\s*["']?canonical["']?/i.test(tag)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (href?.[1]) out.push(href[1].trim());
  }
  return out;
}

/**
 * Verify a page's canonical tag: exactly one, absolute, and self-referencing.
 * Returns a failure reason string, or null when the canonical is correct.
 */
export function checkCanonicalTag(url: string, html: string): string | null {
  const canonicals = extractCanonicals(html);
  if (canonicals.length === 0) return 'Missing <link rel="canonical">';
  if (canonicals.length > 1) {
    return `Multiple canonical tags (${canonicals.length}): ${canonicals.join(", ")}`;
  }
  const raw = canonicals[0]!;
  if (!/^https?:\/\//i.test(raw)) {
    return `Canonical is not an absolute URL: ${raw}`;
  }
  const canon = normaliseForCanonical(raw);
  const self = normaliseForCanonical(url);
  if (!canon) return `Canonical is not a valid URL: ${raw}`;
  if (canon !== self) {
    return `Canonical points elsewhere: ${raw} (expected ${self})`;
  }
  return null;
}

/** Classify a single crawled sitemap URL. Returns null when healthy. */
export function classifyUrlResponse(info: UrlResponseInfo): UrlFailure | null {
  const { url, status } = info;

  if (status === 401 || status === 403) {
    return { url, status, reason: `Blocked by auth (HTTP ${status})` };
  }

  if (status >= 300 && status < 400) {
    const location = info.location || "";
    const target = location ? new URL(location, url).toString() : "(no Location header)";
    const p = location ? pathOf(location, url) : null;
    if (p && AUTH_PATH_RE.test(p)) {
      return {
        url,
        status,
        finalUrl: target,
        reason: `Redirects to auth wall (HTTP ${status} -> ${target})`,
      };
    }
    if (p && PRIVATE_PATH_RE.test(p)) {
      return {
        url,
        status,
        finalUrl: target,
        reason: `Redirects into a private area (HTTP ${status} -> ${target})`,
      };
    }
    return {
      url,
      status,
      finalUrl: target,
      reason: `Unexpected redirect (HTTP ${status} -> ${target})`,
    };
  }

  if (status !== 200) {
    return { url, status, reason: `HTTP ${status}` };
  }

  const ct = info.contentType || "";
  if (ct && !ct.includes("html")) {
    return { url, status, reason: `Non-HTML content-type: ${ct}` };
  }

  const body = info.body ?? "";
  if (body) {
    if (body.length < 500) {
      return { url, status, reason: `Suspiciously small body (${body.length} bytes)` };
    }
    if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(body)) {
      return { url, status, reason: "Page has noindex meta tag" };
    }
    if (!/<title[^>]*>[^<]+<\/title>/i.test(body)) {
      return { url, status, reason: "Missing or empty <title>" };
    }
    // Client-side auth gate: page renders but only contains a sign-in prompt.
    if (
      /<meta[^>]+http-equiv=["']refresh["'][^>]+url=\/?(auth|login|admin|settings|today)/i.test(
        body,
      )
    ) {
      return { url, status, reason: "Meta-refresh redirect away from the public page" };
    }
    if (info.checkCanonical !== false) {
      const canonicalIssue = checkCanonicalTag(url, body);
      if (canonicalIssue) return { url, status, reason: canonicalIssue };
    }
  }

  return null;
}

/** Small helper: run an async worker over items with bounded concurrency. */
export async function runPool<T, R>(
  items: T[],
  worker: (t: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    async () => {
      for (;;) {
        const i = idx++;
        if (i >= items.length) return;
        results[i] = await worker(items[i]!);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

/**
 * Key public pages that must always be crawlable with a correct self-canonical,
 * whether or not they happen to appear in the sitemap. Checked every run.
 */
export const KEY_PUBLIC_PATHS = [
  "/",
  "/about",
  "/faq",
  "/library",
  "/calculators",
  "/interactions",
  "/interaction-checker",
  "/privacy",
] as const;

/** Merge key public pages into the crawl list without duplicating sitemap entries. */
export function withKeyPublicPages(site: string, urls: string[]): string[] {
  const seen = new Set(urls.map((u) => normaliseForCanonical(u) ?? u));
  const out = [...urls];
  for (const p of KEY_PUBLIC_PATHS) {
    const abs = new URL(p, site).toString();
    const key = normaliseForCanonical(abs) ?? abs;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(abs);
    }
  }
  return out;
}
