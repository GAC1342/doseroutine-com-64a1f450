import { GSC_SITE_URL, SITE_ORIGIN } from "@/lib/seo-monitor-urls";
import {
  buildBlogPerformance,
  currentPeriod,
  indexPageRows,
  indexQueryRows,
  previousPeriod,
  totalsOf,
  type RawRow,
} from "@/lib/blog-search-performance";

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

const BLOG_FILTER = {
  dimensionFilterGroups: [
    {
      filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }],
    },
  ],
};

export async function loadBlogSearchPerformance(opts: { days: number; longTailOnly: boolean }) {
  const headers = gscHeaders();
  const cur = currentPeriod(opts.days);
  const prev = previousPeriod(opts.days);
  if (!headers) {
    return {
      connected: false as const,
      error: "Search Console isn’t connected for this project yet.",
      period: cur,
      previous: prev,
      rows: [],
      totals: totalsOf([]),
    };
  }

  try {
    const [curRows, prevRows, queryRows] = await Promise.all([
      query(headers, { ...cur, dimensions: ["page"], rowLimit: 500, ...BLOG_FILTER }),
      query(headers, { ...prev, dimensions: ["page"], rowLimit: 500, ...BLOG_FILTER }),
      query(headers, { ...cur, dimensions: ["page", "query"], rowLimit: 2000, ...BLOG_FILTER }),
    ]);
    const rows = buildBlogPerformance(
      indexPageRows(curRows),
      indexPageRows(prevRows),
      indexQueryRows(queryRows),
      { longTailOnly: opts.longTailOnly, origin: SITE_ORIGIN },
    );
    return {
      connected: true as const,
      error: null as string | null,
      period: cur,
      previous: prev,
      rows,
      totals: totalsOf(rows),
    };
  } catch (err) {
    return {
      connected: true as const,
      error: err instanceof Error ? err.message : String(err),
      period: cur,
      previous: prev,
      rows: [],
      totals: totalsOf([]),
    };
  }
}
