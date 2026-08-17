# Verify /blog canonical + SEO meta across pages and page sizes

## What already exists
The blog test suite already covers pagination SEO: canonical URLs, rel=prev/next, robots, and JSON-LD across page 1, middle, and last pages for every page size (`blog-pagination-seo.test.ts`, `blog-pagination.test.ts`, `blog-index-page-size.test.ts`, `blog-index-sort-page-size.test.ts`, `sitemap-blog-urls.test.ts`).

## What this task does
1. Run the full blog SEO test suite and report the actual pass/fail result for canonical and meta correctness across page numbers and page sizes.
2. Close the remaining gap: current tests assert canonical/robots/prev-next/JSON-LD, but not the human-facing meta text per page. Add assertions in `blog-pagination-seo.test.ts` that, for page 1, a middle page, and the last page at each supported `pageSize`:
   - `title` is unique per page and includes the page number for pages 2+ (never on page 1)
   - `description` is present, under 160 characters, and non-duplicated across pages
   - `og:title` / `og:description` match the page's title/description
   - `og:url` matches the canonical exactly (no `pageSize`/`sort` leakage)
3. Fix any mismatch the new assertions surface in the route's `head()` in `src/routes/blog.index.tsx` — metadata only, no layout or styling changes.

## Technical notes
- Tests drive the real `head()` with synthesized loader data, matching the existing pattern; no network calls.
- No change to defaults (`BLOG_PAGE_SIZE_OPTIONS`, default sort) and no change to sitemap output.
