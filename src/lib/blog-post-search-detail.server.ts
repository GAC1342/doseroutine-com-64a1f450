import { GSC_SITE_URL, SITE_ORIGIN } from "@/lib/seo-monitor-urls";
import { currentPeriod, previousPeriod, type RawRow } from "@/lib/blog-search-performance";
import {
  buildDailySeries,
  buildQueryRows,
  indexByKey,
  totalsOfQueries,
  type BlogPostSearchDetail,
  type DailyPoint,
} from "@/lib/blog-post-search-detail";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const TIMEOUT_MS = 20_000;

function gscHeaders(): Record<string, string> | null {
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!apiKey || !connKey) return null;
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
}

async function query(
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<RawRow[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
      { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal },
    );
    if (!res.ok) {
      throw new Error(`Search Console query failed [${res.status}]: ${await res.text()}`);
    }
    const data = (await res.json()) as { rows?: RawRow[] };
    return data.rows ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Scope to one post. `equals` on the canonical URL is the precise filter, but
 * Search Console also reports trailing-slash / parameter variants, so we use a
 * `contains` filter on the path and rely on it matching only this post's URLs.
 */
function pageFilter(slug: string) {
  return {
    dimensionFilterGroups: [
      { filters: [{ dimension: "page", operator: "contains", expression: `/blog/${slug}` }] },
    ],
  };
}

function queryFilter(slug: string, searchQuery: string) {
  return {
    dimensionFilterGroups: [
      {
        filters: [
          { dimension: "page", operator: "contains", expression: `/blog/${slug}` },
          { dimension: "query", operator: "equals", expression: searchQuery },
        ],
      },
    ],
  };
}

function emptyDetail(
  slug: string,
  days: number,
  error: string | null,
  connected: boolean,
): BlogPostSearchDetail {
  return {
    slug,
    url: `${SITE_ORIGIN}/blog/${slug}`,
    connected,
    error,
    period: currentPeriod(days),
    previous: previousPeriod(days),
    totals: totalsOfQueries([]),
    queries: [],
    daily: [],
  };
}

/** Full query list + daily series for a single blog post. */
export async function loadBlogPostSearchDetail(opts: {
  slug: string;
  days: number;
}): Promise<BlogPostSearchDetail> {
  const headers = gscHeaders();
  if (!headers) {
    return emptyDetail(
      opts.slug,
      opts.days,
      "Search Console isn’t connected for this project yet.",
      false,
    );
  }

  const cur = currentPeriod(opts.days);
  const prev = previousPeriod(opts.days);
  const filter = pageFilter(opts.slug);

  try {
    const [curQueries, prevQueries, dailyRows] = await Promise.all([
      query(headers, { ...cur, dimensions: ["query"], rowLimit: 1000, ...filter }),
      query(headers, { ...prev, dimensions: ["query"], rowLimit: 1000, ...filter }),
      query(headers, { ...cur, dimensions: ["date"], rowLimit: 500, ...filter }),
    ]);

    const queries = buildQueryRows(indexByKey(curQueries), indexByKey(prevQueries));
    return {
      slug: opts.slug,
      url: `${SITE_ORIGIN}/blog/${opts.slug}`,
      connected: true,
      error: null,
      period: cur,
      previous: prev,
      totals: totalsOfQueries(queries),
      queries,
      daily: buildDailySeries(dailyRows),
    };
  } catch (err) {
    return emptyDetail(
      opts.slug,
      opts.days,
      err instanceof Error ? err.message : String(err),
      true,
    );
  }
}

/** Daily series for one query on one post (loaded when a row is expanded). */
export async function loadBlogQueryTrend(opts: {
  slug: string;
  query: string;
  days: number;
}): Promise<{ connected: boolean; error: string | null; daily: DailyPoint[] }> {
  const headers = gscHeaders();
  if (!headers) {
    return {
      connected: false,
      error: "Search Console isn’t connected for this project yet.",
      daily: [],
    };
  }
  const cur = currentPeriod(opts.days);
  try {
    const rows = await query(headers, {
      ...cur,
      dimensions: ["date"],
      rowLimit: 500,
      ...queryFilter(opts.slug, opts.query),
    });
    return { connected: true, error: null, daily: buildDailySeries(rows) };
  } catch (err) {
    return {
      connected: true,
      error: err instanceof Error ? err.message : String(err),
      daily: [],
    };
  }
}
