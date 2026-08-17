# Blog pagination regression test (default and custom page sizes)

## Why

Existing blog tests cover the search-param schema (`blog-index-page-size.test.ts`) and
sort/page-size interplay (`blog-index-sort-page-size.test.ts`). Nothing yet verifies the
actual paging behaviour end to end: which posts land on which page, how many pages exist,
and whether the head tags (canonical, rel=prev/next, robots) follow the page size the
reader is actually on. That is the part that broke before.

## What to add

One new test file: `src/routes/__tests__/blog-pagination.test.ts`, driven off the real
post list (`BLOG_POSTS_NEWEST_FIRST`) and the real helpers in
`src/lib/blog-list-canonical.ts`, so it stays correct as posts are added.

Run every assertion for the default size (3) and each custom size (6, 9):

1. **Page count** — `ceil(totalPosts / pageSize)` pages, minimum 1.
2. **Slicing** — walking every page in order yields each post exactly once, in
   newest-first order, with no duplicates and no gaps; every page except the last is
   exactly `pageSize` long and the last page is non-empty.
3. **Out-of-range page** — a page beyond the last clamps to the final slice rather than
   rendering an empty list.
4. **rel=prev/next chain** — page 1 has next only, the last page has prev only, middle
   pages have both; hrefs carry `pageSize` only when it is non-default, and following the
   chain from page 1 reaches the last page in exactly `totalPages - 1` hops.
5. **Canonical** — the canonical for a paged view is `/blog` on page 1 and
   `/blog?page=N` beyond it, and never includes `pageSize` (page size is a UI preference
   that folds back to the canonical URL).
6. **Out-of-range and non-default sort are noindex** — matching the route's robots rule.

The slicing/pagination math the route performs inline gets mirrored in a small local
helper inside the test file so the test reads clearly; the URL and rel-link assertions
call the shared exported helpers directly.

## Wiring

Add the new file to the `lint:seo`-adjacent blog test grouping only if one exists;
otherwise it runs under the default `vitest run` sweep already used in CI. Confirm the
suite passes before finishing.

## Notes

Test-only change. No route, helper, or blog content is modified. If an assertion exposes a
genuine paging bug, that fix is reported back rather than silently loosening the test.
