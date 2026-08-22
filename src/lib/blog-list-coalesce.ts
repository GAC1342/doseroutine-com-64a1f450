import { type BlogListSearch, normalizeBlogPageSize } from "./blog-list-canonical";

/**
 * How long the blog list waits before committing a control change to the URL.
 *
 * Rapid taps on sort / page-size pills fold into ONE navigation (and therefore
 * one loader request) instead of one per tap, while the list itself renders the
 * pending selection immediately so the reader never sees an intermediate page.
 */
export const BLOG_LIST_COALESCE_MS = 140;

export type BlogListUpdate = (prev: BlogListSearch) => BlogListSearch;

/** Normalized comparison — pageSize 12 and 3 are the same view. */
export function blogListSearchEqual(a: BlogListSearch, b: BlogListSearch): boolean {
  return (
    a.sort === b.sort &&
    Math.max(1, Math.floor(a.page)) === Math.max(1, Math.floor(b.page)) &&
    normalizeBlogPageSize(a.pageSize) === normalizeBlogPageSize(b.pageSize)
  );
}

/**
 * Fold a burst of control changes into the single search state that should be
 * written to the URL. Order is preserved, so the last tap wins.
 */
export function coalesceBlogListUpdates(
  base: BlogListSearch,
  updates: readonly BlogListUpdate[],
): BlogListSearch {
  return updates.reduce<BlogListSearch>((acc, update) => update(acc), base);
}

/**
 * Should the coalesced result actually be navigated to? No-op bursts (e.g.
 * tapping "Newest" twice) resolve back to the current URL and are dropped.
 */
export function shouldCommitBlogListSearch(current: BlogListSearch, next: BlogListSearch): boolean {
  return !blogListSearchEqual(current, next);
}
