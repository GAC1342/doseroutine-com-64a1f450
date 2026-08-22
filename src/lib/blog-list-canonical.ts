/**
 * Build the canonical URL for /blog list pages.
 *
 * Search engines should see pageSize and sort as UI preferences, not as
 * distinct pages, so we strip them from the canonical. We keep `page` only
 * when it is greater than 1, so the first page canonicalizes to the clean
 * /blog URL and deeper pages canonicalize to themselves.
 */
export const BLOG_LIST_CANONICAL_BASE = "https://doseroutine.com/blog";

export function buildBlogListCanonical(requestUrl: string | URL): string {
  const url = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
  const page = url.searchParams.get("page");

  const canonical = new URL(BLOG_LIST_CANONICAL_BASE);
  if (page && /^[1-9]\d*$/.test(page) && Number(page) > 1) {
    canonical.searchParams.set("page", page);
  }

  return canonical.toString();
}

/**
 * Canonical-form URL for a given blog list page (page 1 = clean /blog).
 * Non-default pageSize and sort are preserved so rel=prev/next walk the same
 * sequence of results the reader is actually looking at.
 */
export function buildBlogListPageUrl(
  page: number,
  opts?: { pageSize?: unknown; sort?: string | null },
): string {
  const url = new URL(BLOG_LIST_CANONICAL_BASE);
  if (Number.isFinite(page) && page > 1) url.searchParams.set("page", String(Math.floor(page)));
  const sort = opts?.sort;
  if (sort && sort !== "newest") url.searchParams.set("sort", sort);
  if (opts?.pageSize !== undefined && opts.pageSize !== null) {
    const size = normalizeBlogPageSize(opts.pageSize);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing; do not add new ones.
    if (size !== DEFAULT_BLOG_PAGE_SIZE) url.searchParams.set("pageSize", String(size));
  }
  return url.toString();
}

/**
 * rel=prev / rel=next links for the current blog list view. Returns an empty
 * list when the page is out of range, so crawlers never follow a dead chain.
 */
export function buildBlogPaginationLinks(
  page: number,
  totalPages: number,
  opts?: { pageSize?: unknown; sort?: string | null },
): Array<{ rel: "prev" | "next"; href: string }> {
  const links: Array<{ rel: "prev" | "next"; href: string }> = [];
  const total = Math.max(1, Math.floor(totalPages));
  const current = Math.floor(page);
  if (!Number.isFinite(current) || current < 1 || current > total) return links;
  if (current > 1) links.push({ rel: "prev", href: buildBlogListPageUrl(current - 1, opts) });
  if (current < total) links.push({ rel: "next", href: buildBlogListPageUrl(current + 1, opts) });
  return links;
}

/** Allowed posts-per-page choices for the blog list. */
export const BLOG_PAGE_SIZE_OPTIONS = [3, 6, 9] as const;
export type BlogPageSize = (typeof BLOG_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_BLOG_PAGE_SIZE: BlogPageSize = 3;

/**
 * Normalize any incoming pageSize value (number, numeric string, null,
 * NaN, Infinity, negative, float, out-of-range) to a supported option.
 * Anything unsupported falls back to 3 so the list can never break.
 */
export function normalizeBlogPageSize(raw: unknown): BlogPageSize {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_BLOG_PAGE_SIZE;
  const int = Math.trunc(n);
  return (BLOG_PAGE_SIZE_OPTIONS as readonly number[]).includes(int)
    ? (int as BlogPageSize)
    : DEFAULT_BLOG_PAGE_SIZE;
}

/** Parse the list-relevant search params out of a request URL. */
export function parseBlogListParams(requestUrl: string | URL): {
  page: number;
  sort: string;
  pageSize: BlogPageSize;
} {
  const url = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
  const num = (raw: string | null, fallback: number) => {
    const n = Number(raw);
    return raw && Number.isInteger(n) && n > 0 ? n : fallback;
  };
  return {
    page: num(url.searchParams.get("page"), 1),
    sort: url.searchParams.get("sort") || "newest",
    pageSize: normalizeBlogPageSize(url.searchParams.get("pageSize")),
  };
}

/** Page-aware title/description so paginated views are not duplicates. */
export function blogListPageMeta(
  page: number,
  base: { title: string; description: string },
): { title: string; description: string } {
  if (!Number.isFinite(page) || page <= 1) return base;
  const n = Math.floor(page);
  return {
    title: `Research & Updates — Page ${n} | DoseRoutine`,
    description: `Page ${n} of ${base.description.charAt(0).toLowerCase()}${base.description.slice(1)}`,
  };
}

/** Shape of the /blog list search params. */
export type BlogListSearch = { sort: string; page: number; pageSize: number };

/**
 * Pure search-param updaters used by the blog list controls. Changing sort or
 * page size always returns to page 1 and preserves every other param, so the
 * two controls stay synchronized in the URL.
 */
export function applyBlogSort(prev: BlogListSearch, sort: string): BlogListSearch {
  return { ...prev, sort, page: 1 };
}

export function applyBlogPageSize(prev: BlogListSearch, pageSize: unknown): BlogListSearch {
  return { ...prev, pageSize: normalizeBlogPageSize(pageSize), page: 1 };
}

/**
 * Canonical /blog list paths for the sitemap.
 *
 * Only the default page size is listed: `pageSize` and `sort` are UI
 * preferences that canonicalize back to these URLs, so submitting a variant
 * per page size would advertise duplicates of pages Google already folds in.
 */
export function blogListSitemapPaths(
  totalPosts: number,
  pageSize: BlogPageSize = DEFAULT_BLOG_PAGE_SIZE,
): string[] {
  const size = normalizeBlogPageSize(pageSize);
  const total = Math.max(0, Math.floor(totalPosts));
  const pages = Math.max(1, Math.ceil(total / size));
  return Array.from({ length: pages }, (_, i) => (i === 0 ? "/blog" : `/blog?page=${i + 1}`));
}
