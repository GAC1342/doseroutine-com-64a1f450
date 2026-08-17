# Per-post Search Console drilldown

Today the Blog SEO dashboard shows one card per post with totals and the top 5 queries. This adds a full drilldown for a single post: every query it ranks for, plus how that post and each query have moved day by day.

## What you'll see

Click a post card ("View all queries") and a full-screen panel opens with:

1. **Header** — post title, live link, date range, and the same four totals (impressions, clicks, CTR, average position) with change vs the previous period.
2. **Trend chart** — daily impressions, clicks and average position for that post across the selected window (7 / 28 / 90 days), so a ranking jump or drop is visible.
3. **Full query table** — every query Search Console reports for that post (not just the top 5), with impressions, clicks, CTR and average position. Sortable by any column, with a search box to filter and a CSV export.
4. **Per-query history** — expanding a row loads that single query's daily impressions / clicks / position for the same window.

Posts with no impressions show an explanatory empty state instead of an empty table.

## Technical notes

- New pure helpers in `src/lib/blog-post-search-detail.ts`: shape Search Console rows into query rows and daily series, weighted-merge duplicate page URLs (trailing slash / params) the same way `blog-search-performance.ts` already does, and compute period deltas. Unit tested alongside the existing helpers.
- New server-only loader `src/lib/blog-post-search-detail.server.ts` reusing the existing gateway pattern (`GSC_SITE_URL`, `LOVABLE_API_KEY` + `GOOGLE_SEARCH_CONSOLE_API_KEY` headers, 20s timeout). Three parallel `searchAnalytics/query` calls scoped by a `page` equals filter for the post URL:
  - `dimensions: ["query"]`, rowLimit 1000 — the full query list
  - `dimensions: ["date"]` — the post's daily series
  - the previous equal-length period at `dimensions: ["query"]` — for per-query deltas
  A fourth call, `dimensions: ["date"]` with an added `query` equals filter, runs only when a query row is expanded.
- New server functions in `src/lib/blog-post-search-detail.functions.ts` (`getBlogPostSearchDetail`, `getBlogQueryTrend`), both `requireSupabaseAuth` + the same `is_admin` RPC check used by `getBlogSearchPerformance`, and both called from the component via `useServerFn` + `useQuery` (never from a loader).
- UI: extend `src/routes/_authenticated/admin/blog-seo.tsx` with a "View all queries" button per card that opens the existing `Sheet` primitive; table via `@/components/ui/table`, trend via the existing `@/components/ui/chart` (Recharts) wrapper. Detail is fetched lazily on open and cached per `[slug, days]`.
- Page filter uses `page` `equals` on `https://doseroutine.com/blog/<slug>` and falls back to a `contains` filter on `/blog/<slug>` so trailing-slash variants are included.
- No styling-system changes: existing tokens, cards and badges only. Route stays `noindex,nofollow` under `_authenticated/admin`.
