/**
 * Shared crawl cache for the live-site SEO tests.
 *
 * The FAQ anchor-parity test, the internal anchor-text lint, the anchor-lint
 * CI report and the live compound/sitemap audits all crawl the same sitemap
 * pages. Without a cache each page is downloaded once per consumer and
 * re-parsed for every assertion. This module gives them:
 *
 *  - an in-process map, so a page fetched by one test is free for the other,
 *  - a disk layer with ETag / Last-Modified revalidation, so repeat runs get
 *    cheap 304s instead of full bodies,
 *  - memoised JSON-LD extraction, so each HTML body is parsed once,
 *  - `crawlSitemap()`, a per-process shared sitemap crawl: the first caller
 *    pays for discovery + fetching and every later caller gets the same
 *    `CachedPage` objects (same HTML string, same parsed JSON-LD array),
 *  - `cachedFetchText()` / `fetchResource()` for XML, robots.txt and other
 *    non-HTML resources, matching the `fetchText` shape the sitemap-health
 *    helpers expect,
 *  - `crawlCacheStats()` for CI summaries of downloads vs. cache reuse.
 *
 * Env switches:
 *   CRAWL_CACHE=0            bypass all caching (always fetch, never write)
 *   CRAWL_CACHE_DIR=<path>   override the disk cache location
 *   CRAWL_CACHE_TTL_MS=<ms>  freshness window before revalidating (default 1h)
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type Fetcher = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

export interface CachedPage {
  url: string;
  status: number;
  html: string;
  /** Parsed application/ld+json blocks, computed once per body. */
  jsonLd: unknown[];
  /** True when this run served the body from memory or disk. */
  fromCache: boolean;
}

interface DiskEntry {
  url: string;
  status: number;
  body: string;
  etag?: string;
  lastModified?: string;
  storedAt: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export function cacheEnabled(): boolean {
  return process.env["CRAWL_CACHE"] !== "0";
}

/**
 * Freshness window. `CRAWL_CACHE_TTL_MS=0` means "never trust a stored body
 * blindly" — every disk hit is revalidated with the origin (cheap 304s), which
 * is what CI wants so a fresh deploy can never be masked by a stale body.
 */
function ttlMs(): number {
  const raw = Number(process.env["CRAWL_CACHE_TTL_MS"]);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_TTL_MS;
}


function cacheDir(): string {
  return (
    process.env["CRAWL_CACHE_DIR"] ??
    join(process.cwd(), "node_modules", ".cache", "doseroutine-crawl")
  );
}

function entryPath(url: string): string {
  let host = "unknown";
  try {
    host = new URL(url).host.replace(/[^a-z0-9.-]/gi, "_");
  } catch {
    /* keep fallback host */
  }
  const hash = createHash("sha1").update(url).digest("hex");
  return join(cacheDir(), host, `${hash}.json`);
}

async function readDisk(url: string): Promise<DiskEntry | null> {
  if (!cacheEnabled()) return null;
  try {
    const raw = await readFile(entryPath(url), "utf8");
    const parsed = JSON.parse(raw) as DiskEntry;
    if (typeof parsed?.body !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeDisk(entry: DiskEntry): Promise<void> {
  if (!cacheEnabled()) return;
  try {
    const file = entryPath(entry.url);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(entry), "utf8");
  } catch {
    /* cache writes are best-effort */
  }
}

/** Extract and parse every application/ld+json block in an HTML document. */
export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const text = (match[1] ?? "").trim();
    if (!text) continue;
    try {
      out.push(JSON.parse(text));
    } catch {
      /* malformed blocks are the rich-results test's problem, not ours */
    }
  }
  return out;
}

const memory = new Map<string, CachedPage>();

export interface CrawlCacheStats {
  /** Bodies served from the in-process map. */
  memoryHits: number;
  /** Bodies served from disk without touching the network. */
  diskHits: number;
  /** Conditional requests answered with 304. */
  revalidated: number;
  /** Full bodies downloaded. */
  downloads: number;
  /** Requests that failed or returned a non-OK status. */
  misses: number;
  /** Bytes of HTML downloaded this run. */
  bytesDownloaded: number;
}

const stats: CrawlCacheStats = {
  memoryHits: 0,
  diskHits: 0,
  revalidated: 0,
  downloads: 0,
  misses: 0,
  bytesDownloaded: 0,
};

/** Snapshot of this run's cache effectiveness (for CI summaries). */
export function crawlCacheStats(): CrawlCacheStats {
  return { ...stats };
}

/** Clear the in-process layer (tests). */
export function resetCrawlCache(): void {
  memory.clear();
  crawls.clear();
  for (const key of Object.keys(stats) as Array<keyof CrawlCacheStats>) stats[key] = 0;
}


const defaultFetcher: Fetcher = (url, init) =>
  fetch(url, { headers: { accept: "text/html", ...(init?.headers ?? {}) } });

export interface FetchPageOptions {
  fetcher?: Fetcher;
  /** Extra request headers merged into the conditional request. */
  headers?: Record<string, string>;
}

/**
 * Fetch a URL through the cache. Returns null when the page is unreachable or
 * responds with a non-OK status and nothing usable is cached.
 */
export async function fetchPage(
  url: string,
  options: FetchPageOptions = {},
): Promise<CachedPage | null> {
  const cached = memory.get(url);
  if (cached) {
    stats.memoryHits += 1;
    return cached;
  }

  const fetcher = options.fetcher ?? defaultFetcher;
  const disk = await readDisk(url);
  const fresh = disk !== null && Date.now() - disk.storedAt < ttlMs();

  if (disk && fresh) {
    stats.diskHits += 1;
    const page = toPage(disk.url, disk.status, disk.body, true);
    memory.set(url, page);
    return page;
  }

  const headers: Record<string, string> = { accept: "text/html", ...(options.headers ?? {}) };
  if (disk?.etag) headers["if-none-match"] = disk.etag;
  if (disk?.lastModified) headers["if-modified-since"] = disk.lastModified;

  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(url, { headers });
  } catch {
    if (disk) {
      stats.diskHits += 1;
      const page = toPage(disk.url, disk.status, disk.body, true);
      memory.set(url, page);
      return page;
    }
    stats.misses += 1;
    return null;
  }

  if (response.status === 304 && disk) {
    stats.revalidated += 1;
    await writeDisk({ ...disk, storedAt: Date.now() });
    const page = toPage(disk.url, disk.status, disk.body, true);
    memory.set(url, page);
    return page;
  }

  if (!response.ok) {
    stats.misses += 1;
    return null;
  }

  const body = await response.text();
  stats.downloads += 1;
  stats.bytesDownloaded += body.length;
  await writeDisk({
    url,
    status: response.status,
    body,
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
    storedAt: Date.now(),
  });

  const page = toPage(url, response.status, body, false);
  memory.set(url, page);
  return page;
}

function toPage(url: string, status: number, html: string, fromCache: boolean): CachedPage {
  let jsonLd: unknown[] | null = null;
  return {
    url,
    status,
    html,
    fromCache,
    get jsonLd() {
      jsonLd ??= extractJsonLd(html);
      return jsonLd;
    },
  } as CachedPage;
}

/** Convenience: fetch `${baseUrl}${path}` through the cache and return the HTML. */
export async function fetchHtml(
  url: string,
  options: FetchPageOptions = {},
): Promise<string | null> {
  const page = await fetchPage(url, options);
  return page?.html ?? null;
}

/** Fetch the sitemap and return unique pathnames, capped at `max`. */
export async function fetchSitemapPaths(
  baseUrl: string,
  max: number,
  options: FetchPageOptions = {},
): Promise<string[] | null> {
  const xml = await fetchHtml(`${baseUrl.replace(/\/+$/, "")}/sitemap.xml`, options);
  if (xml === null) return null;
  const paths = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => {
      try {
        return new URL(m[1]!.trim()).pathname;
      } catch {
        return null;
      }
    })
    .filter((p): p is string => Boolean(p));
  return Array.from(new Set(paths)).slice(0, max);
}

/** Run `worker` over `items` with a bounded number of in-flight tasks. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        out[index] = await worker(items[index]!);
      }
    }),
  );
  return out;
}

/**
 * Fetch any text resource (XML, robots.txt, JSON feeds) through the same
 * cache. Sitemap and robots checks share bodies with the HTML crawlers.
 */
export async function fetchResource(
  url: string,
  options: FetchPageOptions & { accept?: string } = {},
): Promise<string | null> {
  const { accept, ...rest } = options;
  return fetchHtml(url, {
    ...rest,
    headers: { accept: accept ?? "text/html,application/xml;q=0.9,*/*;q=0.8", ...(rest.headers ?? {}) },
  });
}

export interface TextFetchResult {
  ok: boolean;
  status: number;
  text: string;
  finalUrl: string;
}

/**
 * Adapter matching the `fetchText` signature used by the sitemap-health and
 * compound-audit helpers, so those tests share this cache instead of doing
 * their own uncached `fetch` calls.
 */
export async function cachedFetchText(
  url: string,
  options: FetchPageOptions & { accept?: string } = {},
): Promise<TextFetchResult> {
  const { accept, ...rest } = options;
  const page = await fetchPage(url, {
    ...rest,
    headers: { accept: accept ?? "text/html,application/xml;q=0.9,*/*;q=0.8", ...(rest.headers ?? {}) },
  });
  if (!page) return { ok: false, status: 0, text: "", finalUrl: url };
  return { ok: page.status >= 200 && page.status < 400, status: page.status, text: page.html, finalUrl: page.url };
}

/** Fetch the sitemap and return unique absolute URLs, capped at `max`. */
export async function fetchSitemapUrls(
  baseUrl: string,
  max: number,
  options: FetchPageOptions = {},
): Promise<string[] | null> {
  const paths = await fetchSitemapPaths(baseUrl, max, options);
  if (paths === null) return null;
  const root = baseUrl.replace(/\/+$/, "");
  return paths.map((p) => `${root}${p}`);
}

export interface CrawlOptions {
  /** Origin to crawl, e.g. http://localhost:8080. */
  baseUrl: string;
  /** Cap on pages fetched (default 120). */
  max?: number;
  /** In-flight request limit (default 6). */
  concurrency?: number;
  /** Optional path filter; also part of the memo key via `key`. */
  include?: (path: string) => boolean;
  /** Distinguishes crawls that share a base URL but use a different filter. */
  key?: string;
  fetchOptions?: FetchPageOptions;
}

export interface CrawledPage extends CachedPage {
  path: string;
}

export interface CrawlResult {
  baseUrl: string;
  /** False when the sitemap could not be fetched (server down). */
  reachable: boolean;
  paths: string[];
  pages: CrawledPage[];
  stats: CrawlCacheStats;
}

const crawls = new Map<string, Promise<CrawlResult>>();

/**
 * Crawl a site's sitemap once per process and hand every caller the same
 * `CachedPage` objects — one HTML body and one JSON-LD parse shared by the
 * FAQ-parity, anchor-text, JSON-LD and metadata sweeps in the same CI run.
 */
export function crawlSitemap(options: CrawlOptions): Promise<CrawlResult> {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const max = options.max ?? 120;
  const memoKey = `${baseUrl}|${max}|${options.key ?? (options.include ? "filtered" : "all")}`;
  const existing = crawls.get(memoKey);
  if (existing) return existing;

  const run = (async (): Promise<CrawlResult> => {
    const discovered = await fetchSitemapPaths(baseUrl, max, options.fetchOptions);
    if (discovered === null) {
      return { baseUrl, reachable: false, paths: [], pages: [], stats: crawlCacheStats() };
    }
    const paths = options.include ? discovered.filter(options.include) : discovered;
    const fetched = await mapWithConcurrency(paths, options.concurrency ?? 6, async (path) => {
      const page = await fetchPage(`${baseUrl}${path}`, options.fetchOptions);
      // Object.create keeps the lazy jsonLd getter on the shared CachedPage.
      return page ? (Object.assign(Object.create(page) as CachedPage, { path }) as CrawledPage) : null;
    });
    return {
      baseUrl,
      reachable: true,
      paths,
      pages: fetched.filter((p): p is CrawledPage => p !== null),
      stats: crawlCacheStats(),
    };
  })();

  crawls.set(memoKey, run);
  return run;
}
