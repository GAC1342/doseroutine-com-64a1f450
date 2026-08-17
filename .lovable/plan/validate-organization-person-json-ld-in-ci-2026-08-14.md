# Validate Organization / Person JSON-LD in CI

Add a build-time check that every Organization and Person entity in the site's structured data is complete and well formed, and fail CI when it isn't.

## What gets checked

For each `Organization` node (sitewide publisher, article publishers, blog author org):
- `name` present, non-empty string
- `logo` or `image` present, and resolvable to an absolute `https://` URL (accepts a bare URL string or an `ImageObject` with `url`)
- `url` absolute when present
- `sameAs`, when present, is a non-empty array of unique absolute URLs (no empty strings, no relative paths)
- Warn-level rule promoted to failure for the *primary* DoseRoutine publisher entity: it must carry `sameAs` (our social/profile links), since that's the entity Google uses for the knowledge panel

For each `Person` node (article authors, reviewers):
- `name` present, non-empty
- `url` or `@id` present so the person is dereferenceable
- `image`, when present, absolute
- `sameAs`, when present, same array rules as above

Malformed cases that fail: `@type` present but node is a bare string, `logo` pointing at a relative path, duplicate `sameAs` entries, empty arrays, non-string values.

## Where it runs

- New pure module `src/lib/entity-jsonld-lint.ts` — takes parsed JSON-LD blocks, returns a list of issues. Reuses `flattenJsonLd` from `src/lib/jsonld-duplicates.ts` so `@graph` and nested publisher/author nodes are covered.
- New test `src/lib/__tests__/entity-jsonld-lint.test.ts` — unit cases for each rule.
- New route sweep `src/routes/__tests__/entity-jsonld-lint.test.ts` — walks every static route's `head()` merged with `__root.tsx` (same loading pattern as the existing duplicate lint), plus the blog Article schema from `src/lib/blog-seo.ts` and `src/lib/article-schema.ts`, and asserts zero issues. Failure output lists route + entity + what's missing.
- Wired into `package.json`: added to `lint:seo` and to the `jsonld` group in `scripts/seo-check.mjs`, so `npm run seo:check` and the existing `jsonld-contract` / `seo-meta-lint` workflows both enforce it. No new workflow file needed.

## Fixing what it finds

The sweep will likely surface a few real gaps (e.g. publisher nodes without `logo`, missing `sameAs`). Those get fixed in the shared schema helpers (`article-schema.ts`, `blog-seo.ts`, `__root.tsx` sitewide Organization) rather than per route, so the fix applies everywhere at once. No styling or layout changes.
