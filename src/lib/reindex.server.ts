// One-click "submit sitemap + request indexing" workflow.
//
// What this can and cannot do:
//  - Sitemap resubmission to Google Search Console: supported (PUT /sitemaps/{url}).
//    This is the supported way to tell Google "re-read my sitemap now".
//  - Per-URL "Request indexing": Google exposes NO public API for it. The URL
//    Inspection API only READS the indexed state. So instead we ping IndexNow
//    (Bing, Yandex, Seznam, Naver) with every sitemap URL, which is the real
//    push-notification channel that does exist, and we read the sitemap state
//    back from Google so the result reflects what Google actually recorded.

import { GSC_SITE_URL, SITE_ORIGIN } from "@/lib/seo-monitor-urls";
import { discoverSitemapUrls, type SitemapFetchResult } from "@/lib/sitemap-url-health";

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const TIMEOUT_MS = 20_000;

export const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const INDEXNOW_HOST = new URL(SITE_ORIGIN).hostname;
const INDEXNOW_KEY = "ff78cf5b72e80ee9f44cbdc91300d780";
const INDEXNOW_BATCH = 10_000;

export interface ReindexResult {
  siteUrl: string;
  sitemapUrl: string;
  sitemapSubmitOk: boolean;
  sitemapSubmitError: string | null;
  sitemapUrlCount: number | null;
  sitemapLastDownloaded: string | null;
  sitemapIsPending: boolean | null;
  indexnowOk: boolean;
  indexnowSubmitted: number;
  indexnowError: string | null;
  durationMs: number;
  notes: string[];
}

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

async function withTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

const fetcher = async (url: string): Promise<SitemapFetchResult> => {
  const res = await withTimeout(url, { headers: { "User-Agent": "DoseRoutineReindex/1.0" } });
  return { ok: res.ok, status: res.status, text: await res.text(), finalUrl: res.url };
};

/** Resubmit the sitemap to Search Console and read Google's state back. */
async function submitSitemap(headers: Record<string, string>): Promise<{
  ok: boolean;
  error: string | null;
  lastDownloaded: string | null;
  isPending: boolean | null;
}> {
  const base = `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
  try {
    const put = await withTimeout(base, { method: "PUT", headers });
    if (!put.ok) {
      return {
        ok: false,
        error: `submit ${put.status}: ${(await put.text()).slice(0, 400)}`,
        lastDownloaded: null,
        isPending: null,
      };
    }
    // Read the entry back so the recorded result is Google's own state.
    let lastDownloaded: string | null = null;
    let isPending: boolean | null = null;
    const get = await withTimeout(base, { headers });
    if (get.ok) {
      const entry = (await get.json()) as { lastDownloaded?: string; isPending?: boolean };
      lastDownloaded = entry.lastDownloaded ?? null;
      isPending = typeof entry.isPending === "boolean" ? entry.isPending : null;
    }
    return { ok: true, error: null, lastDownloaded, isPending };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      lastDownloaded: null,
      isPending: null,
    };
  }
}

/** Push every sitemap URL to IndexNow in batches. */
async function pingIndexNow(
  urls: string[],
): Promise<{ ok: boolean; submitted: number; error: string | null }> {
  if (urls.length === 0) return { ok: false, submitted: 0, error: "no sitemap URLs discovered" };
  let submitted = 0;
  for (let i = 0; i < urls.length; i += INDEXNOW_BATCH) {
    const batch = urls.slice(i, i + INDEXNOW_BATCH);
    try {
      const res = await withTimeout("https://api.indexnow.org/IndexNow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: INDEXNOW_HOST,
          key: INDEXNOW_KEY,
          keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
          urlList: batch,
        }),
      });
      if (!res.ok) {
        return {
          ok: false,
          submitted,
          error: `IndexNow ${res.status}: ${(await res.text()).slice(0, 200)}`,
        };
      }
      submitted += batch.length;
    } catch (err) {
      return { ok: false, submitted, error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { ok: true, submitted, error: null };
}

/** Run the full submit-and-notify workflow. */
export async function runReindex(): Promise<ReindexResult> {
  const started = Date.now();
  const notes: string[] = [];

  const discovery = await discoverSitemapUrls(SITEMAP_URL, fetcher);
  const urls = discovery.urls;
  for (const f of discovery.failures.slice(0, 5)) notes.push(`sitemap: ${f.url} — ${f.reason}`);

  const headers = gscHeaders();
  let sitemap = {
    ok: false,
    error: "Search Console credentials not configured" as string | null,
    lastDownloaded: null as string | null,
    isPending: null as boolean | null,
  };
  if (headers) sitemap = await submitSitemap(headers);

  const indexnow = await pingIndexNow(urls);

  notes.push(
    'Google has no public "request indexing" API — resubmitting the sitemap is the supported signal; IndexNow covers Bing, Yandex, Seznam and Naver.',
  );

  return {
    siteUrl: GSC_SITE_URL,
    sitemapUrl: SITEMAP_URL,
    sitemapSubmitOk: sitemap.ok,
    sitemapSubmitError: sitemap.error,
    sitemapUrlCount: urls.length,
    sitemapLastDownloaded: sitemap.lastDownloaded,
    sitemapIsPending: sitemap.isPending,
    indexnowOk: indexnow.ok,
    indexnowSubmitted: indexnow.submitted,
    indexnowError: indexnow.error,
    durationMs: Date.now() - started,
    notes,
  };
}

/** Persist a run so the admin page can show history. */
export async function recordReindex(
  result: ReindexResult,
  meta: { source: string; triggeredBy?: string | null },
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("index_submissions").insert({
    triggered_by: meta.triggeredBy ?? null,
    source: meta.source,
    site_url: result.siteUrl,
    sitemap_url: result.sitemapUrl,
    sitemap_submit_ok: result.sitemapSubmitOk,
    sitemap_submit_error: result.sitemapSubmitError,
    sitemap_url_count: result.sitemapUrlCount,
    sitemap_last_downloaded: result.sitemapLastDownloaded,
    sitemap_is_pending: result.sitemapIsPending,
    indexnow_ok: result.indexnowOk,
    indexnow_submitted: result.indexnowSubmitted,
    indexnow_error: result.indexnowError,
    duration_ms: result.durationMs,
    details: { notes: result.notes },
  } as never);
}
