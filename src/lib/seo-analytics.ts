// Pure helpers for the SEO analytics dashboard (keyword performance and
// search-to-conversion by landing page). No network or db access so the
// merge logic can be unit-tested.

import { type GscMetricRow, type RawRow } from "@/lib/blog-search-performance";

export type KeywordRow = GscMetricRow & {
  query: string;
  /** Best-performing landing page for the query, if known. */
  topPage: string | null;
  deltaClicks: number | null;
  deltaImpressions: number | null;
  /** Negative = improved (moved closer to position 1). */
  deltaPosition: number | null;
};

export type LandingSeoRow = GscMetricRow & {
  path: string;
  /** On-site sessions that started on this path (bot-filtered). */
  sessions: number;
  signups: number;
  /** signups / sessions, 0-1. */
  conversionRate: number;
  /** signups / search clicks, 0-1 (null when the page got no clicks). */
  clickToSignup: number | null;
  upgradeIntent: number;
  topQueries: Array<{ query: string } & GscMetricRow>;
};

export type ConversionAgg = {
  path: string;
  sessions: number;
  signups: number;
  upgradeIntent: number;
};

export function metricsOf(row: RawRow): GscMetricRow {
  return {
    clicks: Math.round(row.clicks ?? 0),
    impressions: Math.round(row.impressions ?? 0),
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  };
}

/** Turn a Search Console page URL into a site-relative path. */
export function pathFromPageUrl(url: string): string {
  try {
    const p = new URL(url).pathname;
    return p.length > 1 ? p.replace(/\/+$/, "") : "/";
  } catch {
    return url;
  }
}

function keyOf(row: RawRow, index = 0): string {
  return row.keys?.[index] ?? "";
}

export function buildKeywordRows(
  current: RawRow[],
  previous: RawRow[],
  pageQuery: RawRow[],
  limit = 100,
): KeywordRow[] {
  const prev = new Map<string, GscMetricRow>();
  for (const r of previous) prev.set(keyOf(r), metricsOf(r));

  // page+query rows: remember the page with the most clicks per query.
  const best = new Map<string, { page: string; clicks: number }>();
  for (const r of pageQuery) {
    const page = pathFromPageUrl(keyOf(r, 0));
    const q = keyOf(r, 1);
    const clicks = Math.round(r.clicks ?? 0);
    const cur = best.get(q);
    if (!cur || clicks > cur.clicks) best.set(q, { page, clicks });
  }

  return current
    .filter((r) => keyOf(r))
    .map((r) => {
      const q = keyOf(r);
      const m = metricsOf(r);
      const p = prev.get(q) ?? null;
      return {
        query: q,
        ...m,
        topPage: best.get(q)?.page ?? null,
        deltaClicks: p ? m.clicks - p.clicks : null,
        deltaImpressions: p ? m.impressions - p.impressions : null,
        deltaPosition: p ? Number((m.position - p.position).toFixed(1)) : null,
      };
    })
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit);
}

export function buildLandingSeoRows(
  pages: RawRow[],
  pageQuery: RawRow[],
  conversions: ConversionAgg[],
  limit = 100,
): LandingSeoRow[] {
  const queriesByPath = new Map<string, Array<{ query: string } & GscMetricRow>>();
  for (const r of pageQuery) {
    const path = pathFromPageUrl(keyOf(r, 0));
    const list = queriesByPath.get(path) ?? [];
    list.push({ query: keyOf(r, 1), ...metricsOf(r) });
    queriesByPath.set(path, list);
  }

  const convByPath = new Map<string, ConversionAgg>();
  for (const c of conversions) convByPath.set(c.path, c);

  const rows = new Map<string, LandingSeoRow>();
  const add = (path: string, m: GscMetricRow) => {
    const conv = convByPath.get(path);
    const sessions = conv?.sessions ?? 0;
    const signups = conv?.signups ?? 0;
    rows.set(path, {
      path,
      ...m,
      sessions,
      signups,
      conversionRate: sessions > 0 ? signups / sessions : 0,
      clickToSignup: m.clicks > 0 ? signups / m.clicks : null,
      upgradeIntent: conv?.upgradeIntent ?? 0,
      topQueries: (queriesByPath.get(path) ?? []).sort((a, b) => b.clicks - a.clicks).slice(0, 5),
    });
  };

  for (const r of pages) add(pathFromPageUrl(keyOf(r)), metricsOf(r));

  // Landing pages with on-site conversions but no search data still matter.
  for (const c of conversions) {
    if (!rows.has(c.path)) {
      add(c.path, { clicks: 0, impressions: 0, ctr: 0, position: 0 });
    }
  }

  return [...rows.values()]
    .sort((a, b) => b.signups - a.signups || b.clicks - a.clicks || b.sessions - a.sessions)
    .slice(0, limit);
}

export function totalsOfLanding(rows: LandingSeoRow[]) {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const sessions = rows.reduce((s, r) => s + r.sessions, 0);
  const signups = rows.reduce((s, r) => s + r.signups, 0);
  return {
    clicks,
    impressions,
    sessions,
    signups,
    ctr: impressions > 0 ? clicks / impressions : 0,
    conversionRate: sessions > 0 ? signups / sessions : 0,
  };
}
