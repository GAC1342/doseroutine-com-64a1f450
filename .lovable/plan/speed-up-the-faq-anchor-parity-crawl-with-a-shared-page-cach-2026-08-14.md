# Speed up the FAQ anchor parity crawl with a shared page cache

## What's slow today

The FAQ anchor parity test crawls up to 120 live pages (sitemap + one fetch per URL) in `beforeAll`. In the same CI job, the internal anchor-text lint immediately crawls **the same** pages again with its own fetcher. Every page is downloaded twice per run, and nothing is reused between runs or between the JSON-LD parse steps.

## The fix

Introduce one shared crawl cache that both live-crawl tests use, so each page is fetched at most once per run and re-validated cheaply on later runs.

1. **New module `src/lib/crawl-cache.ts`**
   - `fetchSitemapPaths(baseUrl, max)` — sitemap fetch + `<loc>` to pathname extraction, currently duplicated in both tests.
   - `getPage(baseUrl, path)` — returns `{ html, jsonLd }` where:
     - an in-process `Map` serves repeat requests within a run (this is what removes the duplicate crawl between the two tests when they run in one Vitest process),
     - a disk layer under `node_modules/.cache/doseroutine-crawl/<host>/<hash>.json` stores body + `etag`/`last-modified`,
     - a cached entry is revalidated with `If-None-Match` / `If-Modified-Since`; a `304` skips the body download entirely,
     - `jsonLd` (all parsed `application/ld+json` blocks) is memoised per page so the parity test and any other consumer parse the HTML once, not per assertion.
   - `mapWithConcurrency` moves here too (both tests currently define their own copy).
   - Env switches: `CRAWL_CACHE_DIR`, `CRAWL_CACHE_TTL_MS` (default 1h), `CRAWL_CACHE=0` to bypass entirely.

2. **Rewire the tests** — `src/lib/__tests__/faq-anchor-parity.test.ts` and `src/lib/__tests__/anchor-text-lint.test.ts` drop their private `fetchHtml`/`mapWithConcurrency`/sitemap parsing and call the shared helpers. All existing behaviour (env vars, skip-when-unreachable, page caps, failure reports) stays exactly as it is.

3. **Run the two live crawls in one Vitest process** — in `.github/workflows/blog-seo-score.yml`, replace the two separate steps with a single step running both spec files together so the in-process cache actually applies, keeping the same `BASE_URL` / `REQUIRE_SERVER` / `MAX_PAGES` env values. Also add an `actions/cache` step for `node_modules/.cache/doseroutine-crawl` keyed by workflow + day, so subsequent runs mostly get `304`s.

4. **Keep `seo:check` behaviour** — the `faq` group in `scripts/seo-check.mjs` keeps working unchanged (offline mode simply finds no server and skips, as today).

5. **Cache unit tests** — `src/lib/__tests__/crawl-cache.test.ts` with a stub fetcher: second call for the same URL doesn't refetch, `304` reuses the stored body, expired TTL refetches, `CRAWL_CACHE=0` always fetches.

## Expected effect

Live-page fetches in the SEO job drop from ~240 to ~120 on a cold cache and to ~120 cheap conditional requests (mostly `304`) on a warm cache, plus one HTML parse per page instead of several.

## Notes

No changes to what the parity check asserts, to page content, or to any UI.
