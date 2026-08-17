# Fix blog page-size defaults

## What's wrong

The blog list's search-param schema marks `sort`, `page`, and `pageSize` as optional, so parsing an empty `/blog` URL returns `undefined` for all three. Defaults are then re-applied by hand in four separate places (loader deps, head, the component, pagination links).

Two tests in `src/routes/__tests__/blog-index-page-size.test.ts` fail because they expect the schema itself to return `pageSize: 3`, `page: 1`, `sort: "newest"` for a bare `/blog` visit, and to coerce every unsupported value (12, -1, 0, 3.5, NaN, "abc", null, {}, ...) back to 3.

## The fix

Make the schema the single source of truth for defaults:

- `sort` defaults to `"newest"`, `page` defaults to `1` (floored, minimum 1), `pageSize` normalizes any input through the existing `normalizeBlogPageSize` helper and defaults to `3`.
- Because the schema now always produces valid values, drop the duplicated fallback logic in the loader deps, `head()`, and the component so pagination reads one consistent page size everywhere.
- Keep canonical URL and pagination link building unchanged: `/blog` stays clean (no `?page=1&pageSize=3&sort=newest` in canonicals or prev/next links), and non-default sort still gets `noindex, follow`.

## Verification

- Run `src/routes/__tests__/blog-index-page-size.test.ts` and `blog-index-sort-page-size.test.ts` plus the other blog list/canonical tests.
- Check the live `/blog` page: default view shows 3 posts, switching to 6 and 9 works, deep-linking `?pageSize=9&page=2` works, and a junk value like `?pageSize=abc` falls back to 3 posts per page.

## Technical notes

Files touched: `src/routes/blog.index.tsx` only (schema plus the redundant normalization call sites). No changes to `src/lib/blog-list-canonical.ts`, `blog-posts.ts`, or the tests themselves.
