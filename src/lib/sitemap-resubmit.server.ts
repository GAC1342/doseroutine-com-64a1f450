/**
 * Daily "rebuild the sitemap, resubmit only if it changed" job.
 *
 * The sitemap route regenerates itself on every request, so "rebuild" means
 * fetching it fresh. We fingerprint URLs + image entries (lastmod churn is
 * deliberately ignored) and compare with the previous run stored in
 * sitemap_snapshots. Google is only pinged when the fingerprint moved, and any
 * missing article URL or image entry is reported as a regression.
 */

import { runReindex, recordReindex, SITEMAP_URL } from "@/lib/reindex.server";
import {
  diffSitemaps,
  fingerprintSitemap,
  parseSitemap,
  type SitemapDiff,
} from "@/lib/sitemap-diff";

const TIMEOUT_MS = 25_000;

export interface ResubmitResult {
  sitemapUrl: string;
  fetched: boolean;
  urlCount: number | null;
  articleCount: number | null;
  imageCount: number | null;
  fingerprint: string | null;
  previousFingerprint: string | null;
  changed: boolean;
  resubmitted: boolean;
  resubmitOk: boolean | null;
  resubmitError: string | null;
  diff: Pick<
    SitemapDiff,
    "addedUrls" | "removedUrls" | "removedArticleUrls" | "addedImages" | "regressions"
  > | null;
  regressions: string[];
  error: string | null;
}

async function fetchSitemap(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { accept: "application/xml", "User-Agent": "DoseRoutineSitemapWatch/1.0" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`sitemap fetch failed [${res.status}]`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function runSitemapResubmit(
  options: { force?: boolean; dryRun?: boolean } = {},
): Promise<ResubmitResult> {
  const result: ResubmitResult = {
    sitemapUrl: SITEMAP_URL,
    fetched: false,
    urlCount: null,
    articleCount: null,
    imageCount: null,
    fingerprint: null,
    previousFingerprint: null,
    changed: false,
    resubmitted: false,
    resubmitOk: null,
    resubmitError: null,
    diff: null,
    regressions: [],
    error: null,
  };

  let xml: string;
  try {
    xml = await fetchSitemap(SITEMAP_URL);
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }

  const snapshot = parseSitemap(xml);
  result.fetched = true;
  result.urlCount = snapshot.urlCount;
  result.articleCount = snapshot.articleCount;
  result.imageCount = snapshot.imageCount;
  result.fingerprint = fingerprintSitemap(snapshot);

  if (snapshot.urlCount === 0) {
    // An empty sitemap is a build failure, not a legitimate change: never
    // resubmit it and never overwrite the stored snapshot with it.
    result.error = "sitemap returned no <url> entries";
    result.regressions.push("sitemap is empty — refusing to resubmit");
    return result;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prior } = await supabaseAdmin
    .from("sitemap_snapshots")
    .select("fingerprint, xml")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorRow = prior as { fingerprint?: string | null; xml?: string | null } | null;
  result.previousFingerprint = priorRow?.fingerprint ?? null;
  result.changed = !priorRow || priorRow.fingerprint !== result.fingerprint;

  if (priorRow?.xml) {
    const diff = diffSitemaps(priorRow.xml, xml);
    result.diff = {
      addedUrls: diff.addedUrls,
      removedUrls: diff.removedUrls,
      removedArticleUrls: diff.removedArticleUrls,
      addedImages: diff.addedImages,
      regressions: diff.regressions,
    };
    result.regressions = diff.regressions;
  }

  if ((result.changed || options.force) && !options.dryRun) {
    const reindex = await runReindex();
    await recordReindex(reindex, { source: "sitemap-resubmit-cron" });
    result.resubmitted = true;
    result.resubmitOk = reindex.sitemapSubmitOk;
    result.resubmitError = reindex.sitemapSubmitError;
  }

  if (!options.dryRun) {
    await supabaseAdmin.from("sitemap_snapshots").insert({
      fingerprint: result.fingerprint,
      url_count: snapshot.urlCount,
      article_count: snapshot.articleCount,
      image_count: snapshot.imageCount,
      changed: result.changed,
      resubmitted: result.resubmitted,
      resubmit_ok: result.resubmitOk,
      regressions: result.regressions,
      xml,
    } as never);
  }

  return result;
}
