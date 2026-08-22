# Project health check: what's broken, what's missing, what to improve

I ran the full type check, the whole test suite (3,027 tests), the linter, and the backend database check. Type checking is clean and the backend is essentially clean. Five tests fail and the lint backlog has grown. Here's the picture and the fix order.

## 1. Five failing tests — all real, all small

- **Meal photo editor causes layout shift** — `src/components/meal-photo-editor.tsx` has an `<img>` with no width/height, so the page jumps while the photo loads. Add intrinsic dimensions.
- **Library route audit out of sync** — three standalone pages (`clomiphene`, `melanotan-2`, `testosterone`) exist as their own routes but aren't listed in `NON_COMPOUND_SEGMENTS`. This makes the compound-page audit unreliable, so real SEO gaps on those pages can hide. Add them to the list.
- **Booty workout page missing attribution signal** — `booty-workout.tsx` has no author/publisher credit that machines can read, which weakens E-E-A-T on a page built for search traffic. Add the standard attribution footer or publisher JSON-LD used elsewhere.
- **Trust badge copy drifted** — the test still expects "Free trial — no credit card" but the component was updated during the pricing-message change. Update the test to the current, intentional copy (no card / cancel anytime / privacy) rather than reverting the copy.
- **/manual structured data incomplete** — the Organization block on the manual page has no logo/image and doesn't use the sitewide `@id`, so Google treats it as a separate entity instead of consolidating with the main DoseRoutine entity. Reuse the shared organization helper.

## 2. Lint and formatting debt (4,100 errors)

95% is pure formatting (3,905 Prettier issues) and auto-fixable in one pass.
- Run the formatter across `src/`, `e2e/`, and `scripts/`, then add a format check to CI so it can't re-accumulate.
- Fix the one genuine correctness error: `react-hooks/rules-of-hooks` in `e2e/utils.ts`.
- Replace the 11 silent empty `catch {}` blocks with a comment or debug log so swallowed errors are intentional.
- Fix the 20 `exhaustive-deps` warnings on the busiest signed-in screens (Today, Safety, Fitness, notifications, workout log). Each is a `data ?? []` fallback recreated every render, invalidating the memo below it and re-running heavy list work — a real interaction-speed win with zero UI change.
- Leave the 181 `no-explicit-any` and 80 `react-refresh` warnings for a later cleanup; they aren't bugs.

## 3. Backend

The database check returns one warning: an extension is installed in the public schema. Low risk, worth moving to a dedicated schema during the next maintenance pass. No RLS, policy, or grant problems found.

## 4. Gaps worth closing

- **Core-loop test coverage is thin.** Test weight is heavily on SEO/marketing; the signed-in loop (log a dose, scan a meal, see it on the timeline) has little end-to-end coverage. Add one smoke test for that flow.
- **Bundle regressions can be baselined away.** Add a guard that fails when a route bundle baseline is raised without an accompanying budget change.
- **CI gates.** Add `eslint` + `prettier --check` to the pre-deploy workflow after the cleanup pass.

## Technical notes

- Verified this run: `tsgo --noEmit` clean; `vitest run` = 147 files passed / 5 failed, 3,021 passed / 5 failed / 1 skipped; `eslint .` = 4,100 errors + 102 warnings; database linter = 1 WARN.
- No schema or data changes are needed for any item above.
- No styling or layout changes except the image dimensions on the meal photo editor (visually identical, just reserves space) and the attribution footer on the booty workout page.
