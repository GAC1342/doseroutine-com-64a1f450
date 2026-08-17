/**
 * Freshness policy for blog URLs in the XML sitemap.
 *
 * Goal: a newly published long-tail post should be discovered in hours, not
 * days, while the long tail of older posts stays cheap to crawl.
 *
 * Two levers:
 *  - per-URL hints (`changefreq` / `priority`) that decay with post age;
 *  - the sitemap's own cache lifetime, which shortens while any post is new
 *    so CDN/edge caches cannot pin a stale URL set for a full day.
 *
 * All dates are page-specific (`post.updated`) — nothing here derives a
 * timestamp from build or request time.
 */

export const FRESH_WINDOW_DAYS = 14;
export const RECENT_WINDOW_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(iso: string, now: number = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (now - t) / DAY_MS;
}

export type BlogUrlHints = { changefreq: "daily" | "weekly" | "monthly"; priority: string };

/** Crawl hints for one post URL, based on how recently it changed. */
export function blogUrlHints(updated: string, now: number = Date.now()): BlogUrlHints {
  const age = daysSince(updated, now);
  if (age <= FRESH_WINDOW_DAYS) return { changefreq: "daily", priority: "0.9" };
  if (age <= RECENT_WINDOW_DAYS) return { changefreq: "weekly", priority: "0.85" };
  return { changefreq: "monthly", priority: "0.8" };
}

/** Cache-Control + in-memory TTL for the sitemap itself. */
export type SitemapCachePolicy = { cacheControl: string; ttlMs: number };

const FRESH_POLICY: SitemapCachePolicy = {
  // 10 min browser / 30 min edge while something is new.
  cacheControl: "public, max-age=600, s-maxage=1800, stale-while-revalidate=86400",
  ttlMs: 10 * 60 * 1000,
};

const STEADY_POLICY: SitemapCachePolicy = {
  cacheControl: "public, max-age=3600, s-maxage=21600, stale-while-revalidate=604800",
  ttlMs: 60 * 60 * 1000,
};

/**
 * Shorter caching while the newest post is inside the fresh window, so new
 * long-tail posts propagate to crawlers quickly and consistently.
 */
export function sitemapCachePolicy(
  updatedDates: readonly string[],
  now: number = Date.now(),
): SitemapCachePolicy {
  const newest = updatedDates.reduce((min, d) => Math.min(min, daysSince(d, now)), Infinity);
  return newest <= FRESH_WINDOW_DAYS ? FRESH_POLICY : STEADY_POLICY;
}
