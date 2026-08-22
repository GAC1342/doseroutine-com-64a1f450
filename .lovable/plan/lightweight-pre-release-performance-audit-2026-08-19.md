# Lightweight pre-release performance audit

A fast check that loads each article page, watches what it downloads, and flags two things before release:

1. **Slow assets** — any image, font, script, or stylesheet that takes too long or weighs too much.
2. **Hero image problems** — the big image at the top of a page that decides how fast the page *feels*.

It finishes in a couple of minutes without running Lighthouse, so it can run on every release rather than occasionally.

## Why this is separate from what exists

The project already gates Core Web Vitals (`test:articles-perf`) and rendered image sizing (`test:articles-images`), and runs full Lighthouse budgets. Neither of those flags a specific slow-loading asset by name, and neither checks hero preload or priority. This fills that gap and reuses the existing route list and budget helpers rather than duplicating them.

## What it flags

Per page, one line per problem with the asset URL, size, and load time.

Blocking (fails the run):

- Any single asset over its type budget — image 250 KB, font 60 KB, script 150 KB, stylesheet 60 KB (all configurable).
- Any asset taking longer than 1500 ms on a throttled connection.
- Total page transfer over 1.2 MB.
- **Hero image**: lazy-loaded, missing `width`/`height`, missing `fetchpriority="high"`, not preloaded in the route's `head()`, served in a legacy format when a modern one exists, or more than 2x the pixels it actually displays.

Warnings (reported, doesn't fail):

- Assets between 80% and 100% of budget — the "about to become a problem" band.
- Render-blocking requests discovered before first paint.
- Off-screen images that are eagerly loaded.

## Output

A ranked table in the terminal, worst offender first, plus a JSON report at `test-results/asset-audit/report.json` and a markdown summary suitable for a CI job summary:

```text
/articles/retatrutide-dosage          total 1.4 MB   FAIL
  FAIL  hero.jpg            412 KB  1830ms  over image budget, no fetchpriority
  WARN  chart-1.png         198 KB   340ms  eager but below the fold
```

## Technical details

- **New** `src/lib/asset-audit.ts` — pure rules: `ASSET_BUDGETS` by resource type, `auditAsset()`, `auditHero()`, `auditPage()`, and `formatAssetReport()`. No Playwright or Node imports, so it unit-tests cleanly and the same rules can be reused elsewhere.
- **New** `e2e/asset-audit.spec.ts` — Chromium-only. Reuses the article slug discovery already used by `articles-perf.spec.ts` and `articles-images.spec.ts` (extracted into a shared `e2e/article-slugs.ts` so all three stop repeating it). Applies `Fast 3G`-style CDP throttling, records every response via `page.on("response")` with transfer size and timing, resolves the LCP element to identify the hero, and asserts against `auditPage()`. Writes the JSON + markdown report.
- **New** `src/lib/__tests__/asset-audit.test.ts` — fixture-driven tests for each rule: over-budget image, slow asset, lazy hero, missing preload, warning band boundary, and hero pixel-ratio.
- **Edit** `package.json` — `"perf:assets": "playwright test e2e/asset-audit.spec.ts"` and `"perf:assets:live": "PERF_BASE=https://doseroutine.com playwright test e2e/asset-audit.spec.ts"`.
- **Edit** the CI workflow that already runs the article perf tests — add `npm run perf:assets` and upload `test-results/asset-audit/` as an artifact.
- Hero preload detection reads the served HTML for `<link rel="preload" as="image">` matching the LCP element's URL, which is how `library.retatrutide-dosage.tsx` and `library.cjc-1295-ipamorelin.tsx` already declare theirs — so pages that follow that pattern pass and pages that forgot it get flagged.
- Budgets live in `src/lib/asset-audit.ts` next to the rules and are overridable per route, matching how `perf-budgets.json` handles route overrides.
