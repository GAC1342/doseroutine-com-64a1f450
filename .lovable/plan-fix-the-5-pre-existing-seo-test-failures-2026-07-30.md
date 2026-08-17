# Fix the 5 pre-existing SEO test failures

Yes — these can be fixed safely. Every failure is in test configuration, `robots.txt`, or a metadata tag. None of them touch app behaviour, sign-in, or any page users see.

## What's actually failing

I ran the tests. Three real problems:

1. **`/auth_/callback` is treated as a public page by two guards.** It's the invisible "signing you in…" screen that redirects to Today. The tests want it in `sitemap.xml` and want an `og:url` on it — but it's correctly marked `noindex`, so it should be *excluded* from those checks, not added to the sitemap. Adding it to the sitemap would be the actively wrong fix.
2. **`/redeem` has no `Disallow` rule in `robots.txt`.** It's a signed-in-only reward page, so Google shouldn't crawl it. This is a genuine small gap.
3. Everything else in those files passes.

## The fix

- Add `auth_.callback.tsx` to the skip lists in `src/routes/__tests__/public-route-meta.test.ts` and `src/routes/__tests__/sitemap-coverage.test.ts`, with a comment saying why (private OAuth redirect, `noindex`, `ssr: false`).
- Add `Disallow: /redeem` to `public/robots.txt` under the private-surfaces block.
- Leave the callback route's own code untouched — its `noindex, nofollow` head is already correct.

## Risk

None to the running app. `robots.txt` is a crawler instruction file; the two test edits only change what the CI guard inspects. No route, component, or database change. I'll re-run the full route test suite afterwards to confirm all green.
