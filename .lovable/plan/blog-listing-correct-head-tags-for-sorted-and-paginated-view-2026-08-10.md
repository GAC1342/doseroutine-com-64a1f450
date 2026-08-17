# Blog listing: correct head tags for sorted and paginated views

Today every `/blog` view (`?page=2`, `?sort=oldest`, `?pageSize=9`) shares one identical title, description and share card. Canonical already strips `sort`/`pageSize` and keeps `page`, but the rest of the head does not reflect which page you are on.

## What changes

1. **Page-aware title and description**
   - Page 1 keeps today's copy.
   - Page 2+ becomes "Research & Updates — Page 2 | DoseRoutine" with a matching description ("Page 2 of plain-English updates on…"), so search results and shared links are distinguishable rather than duplicates.

2. **Share metadata matches the page**
   - `og:title`, `og:description`, `twitter:title`, `twitter:description` use the same page-aware copy.
   - `og:url` keeps self-referencing the canonical (clean `/blog`, or `/blog?page=N` for deeper pages), so sorted/page-size variants never leak into share cards.

3. **Pagination signals**
   - Add `rel="prev"` / `rel="next"` links pointing at the canonical form of the neighbouring pages, based on the real post count and the active page size.
   - No prev on page 1, no next on the last page.

4. **Sorted / page-size variants stay non-duplicating**
   - Keep the existing canonical behaviour (strip `sort` and `pageSize`).
   - Add `robots: noindex, follow` only when `sort` is a non-default value, so alternate orderings are crawlable but never compete with the canonical list.
   - Out-of-range page numbers (beyond the last page) also get `noindex, follow`.

5. **hreflang matches the page**
   - `hreflangLinks("/blog")` currently ignores pagination; pass the page-aware path so each paginated view's alternates point at the same page in each locale.

6. **JSON-LD reflects the visible page**
   - Blog schema `url` and the breadcrumb item follow the canonical.
   - `blogPost` list narrows to the posts actually rendered on that page instead of always listing every post.

## Technical notes

- `src/routes/blog.index.tsx`: add `loaderDeps: ({ search }) => ({ page, sort, pageSize })` and pass those into the loader so `head({ loaderData })` can compute page-aware values (head has no direct access to search params).
- `src/lib/blog-list-canonical.ts`: add small helpers — `buildBlogListPageUrl(page)` for prev/next, and a `blogListPageMeta(page, totalPages)` returning title/description — kept pure and unit-testable.
- Server function `getBlogListCanonicalUrl` keeps deriving canonical from the request URL; extend its return to include the parsed page and sort so loaderData is a single object.
- Tests: extend `src/routes/__tests__/blog-index-page-size.test.ts` (or a sibling) with cases for page-2 title, prev/next URLs, noindex on non-default sort, and canonical unchanged for `pageSize`.
- No visual or behavioural change to the blog list UI itself.
