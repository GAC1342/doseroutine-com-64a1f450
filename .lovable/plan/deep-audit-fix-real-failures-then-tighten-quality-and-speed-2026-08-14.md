# Deep audit: fix real failures, then tighten quality and speed

I ran the full type check, the unit/integration test suite (2,655 tests) and the linter. Type checking is clean. Four tests fail, the homepage bundle is over its own budget, and the linter reports formatting/quality issues. Here is what to fix, in priority order.

## 1. Fix the four failing tests (real signals, not flakes)

- **Homepage bundle over budget** — `route-bundle-budget` fails: the `/` baseline is 440,502 bytes gzipped against a 420,000 hard ceiling. This is a genuine speed regression from recent landing-page additions (testimonials, device panel, related-research blocks). Fix by shrinking the route, not by raising the ceiling: lazy-load below-the-fold landing sections, defer chart/Recharts and icon-heavy imports, and confirm no marketing data module is pulled into the entry chunk. Re-run `npm run bundles:build-check` until `/` is back under the cap.
- **robots.txt baseline drift** — the committed `robots.txt` now has the `feed.xml` sitemap line added during the RSS work, but `ROBOTS_BASELINE` in `src/lib/__tests__/robots-health.test.ts` was never updated. Update the baseline to include the intended new line so drift detection stays meaningful.
- **Font contract drift** — `src/components/admin/blog-post-search-detail-sheet.tsx` uses `font-medium` (500) on Space Grotesk elements while only 600/700 are loaded. Switch those two elements to a loaded weight (or the body font) rather than loading a new weight.
- **SSR 500 noise in canonical-redirect tests** — two cases log `Package import specifier "#tanstack-router-entry" is not defined`, so the test exercises the catastrophic-SSR fallback path instead of a real render. Investigate whether this is a test-harness resolution gap or a real production SSR path; make the test render for real or assert the fallback deliberately, so it can never mask a live 500.

## 2. Formatting and lint debt (2,944 errors)

Almost all of it is Prettier (2,751) and auto-fixable. Plan:
- Run the repo formatter across `src/`, `e2e/` and `scripts/` in one pass, so future diffs stay small and the format gate can be enforced.
- Fix the one real correctness error: `e2e/utils.ts:118` calls React's `use` inside a plain `authedPage` helper (`react-hooks/rules-of-hooks`) — rename or restructure so the linter and React semantics agree.
- Fix `no-useless-escape` in `src/lib/anchor-text-lint.ts:345`.
- Replace the 11 empty `catch {}` blocks (welcome-tour, share-with-clinician, trial-ending-banner, query-debug-panel, high-risk-ack, interaction-acks) with a comment or a debug log so silent swallowing is intentional and reviewable.
- Leave the 178 `no-explicit-any` and 73 `react-refresh` warnings as a separate, later cleanup — they are not bugs.

## 3. Render-performance warnings worth acting on

19 `exhaustive-deps` warnings cluster on the hottest authenticated screens: `today.tsx`, `safety.tsx`, `fitness.tsx`, `notifications.tsx`, `workout-log-sheet.tsx`. Each is the same pattern — a `data ?? []` fallback recreated every render, which invalidates the `useMemo` below it and re-runs heavy list/interaction computation on every render. Hoist those fallbacks into stable references. This is a measurable interaction-speed win on Today and Safety with no UI change. Also fix the missing `locale` dep in `i18n-provider.tsx` and `rawSearch` in `blog.index.tsx` (both are stale-value bugs waiting to happen).

## 4. Test coverage gaps to close

- Add a guard test that fails when any route bundle baseline is updated upward without an explicit budget change, so bundle regressions can't be baselined away silently.
- Add a smoke test covering the authenticated Today → log dose → Timeline flow; current e2e coverage is heavy on SEO/marketing and light on the core signed-in loop.
- Add a lint/format CI gate (`eslint` + `prettier --check`) so the 2,944-error backlog cannot re-accumulate after the cleanup pass.

## Technical notes

- Verified this run: `tsgo --noEmit` clean; `vitest run` = 124 files passed / 3 failed, 2,650 passed / 4 failed / 1 skipped; `eslint .` = 2,944 errors + 94 warnings.
- No database or schema changes are involved anywhere in this plan.
- Styling and layout stay untouched except the two font-weight classes in the admin sheet and any lazy-loading boundaries added for the homepage bundle (visually identical, loaded later).
