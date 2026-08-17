# Blog Page-Size Selector Plan

## Goal
Add a URL-synchronized posts-per-page control to `/blog` with options 3, 6, and 9.

## Current State
- `src/routes/blog.index.tsx` paginates using the constant `BLOG_PAGE_SIZE` from `src/lib/blog-posts.ts`.
- Search params already include `sort` and `page` via `zodValidator`.
- Pagination UI lives at the bottom of the blog list.

## Changes

1. **Extend search schema**
   - Add `pageSize` to `searchSchema` in `src/routes/blog.index.tsx`.
   - Default to `6` (current visual default closest to the existing page size behavior).
   - Accept only `3 | 6 | 9`; coerce invalid values to the default.

2. **Drive pagination from URL**
   - Replace `BLOG_PAGE_SIZE` references in the route component with `search.pageSize`.
   - Clamp `page` to the new `pageCount` when `pageSize` changes.
   - When the user changes page size, reset to page 1 so they do not land on an empty page.

3. **Add UI selector**
   - Place a "Show" / "Per page" segmented control near the sort buttons (or adjacent to the result count).
   - Options: 3, 6, 9.
   - Active option uses the same pill style as the sort buttons.
   - Update the result-count text to reflect the selected page size.

4. **Update helpers/tests**
   - If any tests reference `BLOG_PAGE_SIZE` for the blog index, update them to pass a page size.
   - Add a small test that validates URL parsing for `?pageSize=9&page=2`.

5. **SEO/sitemap hygiene**
   - Canonical stays `https://doseroutine.com/blog` (query params are not included).
   - No sitemap or RSS changes needed; the control is purely a client-facing filter.

## Verification
- Build passes.
- Blog index renders with default 6 posts per page.
- Selecting 3 or 9 updates the URL and re-renders the list.
- Changing page size while on a later page resets to page 1.
- Direct navigation to `/blog?pageSize=9` works and survives validation.
