// Pure helpers for the blog SEO dashboard.
// No network or db access so they can be unit-tested.

import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";
import { LONGTAIL_BLOG_POSTS } from "@/lib/blog-posts-longtail";

export type GscMetricRow = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type BlogPostPerformance = GscMetricRow & {
  slug: string;
  title: string;
  url: string;
  longTail: boolean;
  publishedAt: string | null;
  /** Difference vs the previous period of equal length (null when no prior data). */
  deltaClicks: number | null;
  deltaImpressions: number | null;
  deltaPosition: number | null;
  topQueries: Array<{ query: string } & GscMetricRow>;
};

export type PeriodRange = { startDate: string; endDate: string };

const DAY = 86_400_000;
/** Search Console data lags ~2-3 days. */
export const GSC_LAG_DAYS = 3;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Most recent complete window of `days` days, ending before the GSC lag. */
export function currentPeriod(days: number, now = Date.now()): PeriodRange {
  const end = new Date(now - GSC_LAG_DAYS * DAY);
  const start = new Date(end.getTime() - (days - 1) * DAY);
  return { startDate: iso(start), endDate: iso(end) };
}

/** The equally long window immediately before `period`. */
export function previousPeriod(days: number, now = Date.now()): PeriodRange {
  const cur = currentPeriod(days, now);
  const end = new Date(new Date(`${cur.startDate}T00:00:00Z`).getTime() - DAY);
  const start = new Date(end.getTime() - (days - 1) * DAY);
  return { startDate: iso(start), endDate: iso(end) };
}

/** Extract the blog slug from a full Search Console page URL. */
export function slugFromPageUrl(url: string): string | null {
  const match = /\/blog\/([^/?#]+)\/?(?:[?#].*)?$/.exec(url);
  return match ? match[1] : null;
}

export type RawRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

function metrics(row: RawRow): GscMetricRow {
  return {
    clicks: Math.round(row.clicks ?? 0),
    impressions: Math.round(row.impressions ?? 0),
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

/** Fold Search Console page rows into a slug -> metrics map. */
export function indexPageRows(rows: RawRow[]): Map<string, GscMetricRow> {
  const out = new Map<string, GscMetricRow>();
  for (const row of rows) {
    const slug = slugFromPageUrl(row.keys?.[0] ?? "");
    if (!slug) continue;
    const m = metrics(row);
    const prev = out.get(slug);
    if (!prev) {
      out.set(slug, m);
      continue;
    }
    // Same slug reported twice (trailing slash / params): merge weighted.
    const impressions = prev.impressions + m.impressions;
    out.set(slug, {
      clicks: prev.clicks + m.clicks,
      impressions,
      ctr: impressions > 0 ? (prev.clicks + m.clicks) / impressions : 0,
      position:
        impressions > 0
          ? (prev.position * prev.impressions + m.position * m.impressions) / impressions
          : prev.position,
    });
  }
  return out;
}

/** Fold page+query rows into slug -> top queries (highest impressions first). */
export function indexQueryRows(
  rows: RawRow[],
  perPost = 5,
): Map<string, Array<{ query: string } & GscMetricRow>> {
  const out = new Map<string, Array<{ query: string } & GscMetricRow>>();
  for (const row of rows) {
    const slug = slugFromPageUrl(row.keys?.[0] ?? "");
    const query = row.keys?.[1];
    if (!slug || !query) continue;
    const list = out.get(slug) ?? [];
    list.push({ query, ...metrics(row) });
    out.set(slug, list);
  }
  for (const [slug, list] of out) {
    list.sort((a, b) => b.impressions - a.impressions);
    out.set(slug, list.slice(0, perPost));
  }
  return out;
}

const LONGTAIL_SLUGS = new Set(LONGTAIL_BLOG_POSTS.map((p: BlogPost) => p.slug));

export type BuildOptions = {
  longTailOnly?: boolean;
  origin?: string;
};

/**
 * Join Search Console data onto the blog catalogue so posts with no
 * impressions still appear (that absence is the actionable signal).
 */
export function buildBlogPerformance(
  current: Map<string, GscMetricRow>,
  previous: Map<string, GscMetricRow>,
  queries: Map<string, Array<{ query: string } & GscMetricRow>>,
  options: BuildOptions = {},
): BlogPostPerformance[] {
  const origin = options.origin ?? "https://doseroutine.com";
  const posts = options.longTailOnly ? LONGTAIL_BLOG_POSTS : BLOG_POSTS;
  const rows = posts.map((post: BlogPost) => {
    const cur = current.get(post.slug) ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const prev = previous.get(post.slug);
    return {
      slug: post.slug,
      title: post.title,
      url: `${origin}/blog/${post.slug}`,
      longTail: LONGTAIL_SLUGS.has(post.slug),
      publishedAt: post.published ?? null,
      ...cur,
      deltaClicks: prev ? cur.clicks - prev.clicks : null,
      deltaImpressions: prev ? cur.impressions - prev.impressions : null,
      deltaPosition: prev && prev.position > 0 && cur.position > 0 ? cur.position - prev.position : null,
      topQueries: queries.get(post.slug) ?? [],
    } satisfies BlogPostPerformance;
  });
  rows.sort((a: BlogPostPerformance, b: BlogPostPerformance) => b.impressions - a.impressions || a.title.localeCompare(b.title));
  return rows;
}

export function totalsOf(rows: BlogPostPerformance[]): GscMetricRow & { posts: number; withData: number } {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const weighted = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weighted / impressions : 0,
    posts: rows.length,
    withData: rows.filter((r) => r.impressions > 0).length,
  };
}
