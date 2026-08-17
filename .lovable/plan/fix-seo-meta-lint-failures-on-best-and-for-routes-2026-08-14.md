# Fix seo-meta-lint failures on /best-* and /for/* routes

## What's happening

12 routes fail the SEO meta lint with "description: missing" and "missing canonical link":
the 8 `/best-*` roundup pages and the 4 `/for/*` use-case pages.

The metadata is not actually missing on the live pages. When those pages were code-split
to shrink the mobile bundle, their copy moved out of module scope and into the route
loader. Their head tags are now built from loader data:

```text
head: ({ loaderData }) => (loaderData ? roundupHead(loaderData) : {})
```

The lint runs offline and calls `head()` with no loader data, so it gets back an empty
object and reports every tag as missing. This is a test-harness gap, not a live SEO bug.

## The fix

Teach the lint to feed each route its real loader data before checking the head tags,
so these 12 pages get genuinely linted instead of skipped or falsely failed.

In `src/routes/__tests__/seo-meta-lint.test.ts`:

- In `loadHead`, if the route module exposes a `loader`, await it (with empty
  params/context) and pass the result into `head({ loaderData })`.
- Keep the existing behaviour when there is no loader.
- If a loader throws or needs a request context, return `null` so the route is skipped
  exactly as today (the live validator still covers it).
- Add a guard so the 12 loader-backed marketing routes cannot silently fall into the
  "skipped" bucket: assert that each of the `/best-*` and `/for/*` paths produced a head
  with a description and a canonical. That way a future regression that really does drop
  the tags fails CI instead of quietly skipping.

Then re-run `npm run lint:seo` and confirm all 118 tests pass.

## Notes

No route files, page copy, or live metadata change — only the lint harness. If awaiting a
loader surfaces a real missing tag on any of the 12 pages, that one gets fixed in the
route's head builder (`roundupHead` / `buildUseCaseHead` in
`src/components/app-roundup-page.tsx`) as part of the same change.
