import { currentPeriod, previousPeriod, type RawRow } from "@/lib/blog-search-performance";
import { GSC_SITE_URL } from "@/lib/seo-monitor-urls";

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
      const text = await res.text();
      console.error(`Search Console query failed [${res.status}]: ${text}`);
      throw new Error(`Search Console query failed [${res.status}]: ${text}`);
    }
    const data = (await res.json()) as { rows?: RawRow[] };
    return data.rows ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export type SiteSearchData = {
  connected: boolean;
  error: string | null;
  period: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
  queriesCurrent: RawRow[];
  queriesPrevious: RawRow[];
  pages: RawRow[];
  pageQuery: RawRow[];
};

/** Site-wide (not blog-only) Search Console pull used by the SEO analytics dashboard. */
export async function loadSiteSearchData(days: number): Promise<SiteSearchData> {
  const cur = currentPeriod(days);
  const prev = previousPeriod(days);
  const empty = {
    period: cur,
    previous: prev,
    queriesCurrent: [] as RawRow[],
    queriesPrevious: [] as RawRow[],
    pages: [] as RawRow[],
    pageQuery: [] as RawRow[],
  };

  const headers = gscHeaders();
  if (!headers) {
    return {
      connected: false,
      error: "Search Console isn’t connected for this project yet.",
      ...empty,
    };
  }

  try {
    const [queriesCurrent, queriesPrevious, pages, pageQuery] = await Promise.all([
      query(headers, { ...cur, dimensions: ["query"], rowLimit: 500 }),
      query(headers, { ...prev, dimensions: ["query"], rowLimit: 500 }),
      query(headers, { ...cur, dimensions: ["page"], rowLimit: 500 }),
      query(headers, { ...cur, dimensions: ["page", "query"], rowLimit: 2000 }),
    ]);
    return {
      connected: true,
      error: null,
      period: cur,
      previous: prev,
      queriesCurrent,
      queriesPrevious,
      pages,
      pageQuery,
    };
  } catch (err) {
    return {
      connected: true,
      error: err instanceof Error ? err.message : String(err),
      ...empty,
    };
  }
}
