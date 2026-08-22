# Responsive screenshot matrix

Today the pixel suite only guards two areas: the illustration specs (which already fan out across a device matrix of their own) and `mint-visual-regression.spec.ts`, which snapshots charts and controls at the single default 1280x900 desktop viewport. Nothing takes screenshots of the actual pages at phone or tablet widths, so responsive drift — a card stack that stops wrapping at 390px, a nav that collapses wrong on iPad, a hero that reflows at laptop width — only gets caught by the overflow guard, which sees horizontal scrolling but not layout that merely looks wrong.

This adds a small, deliberately narrow responsive screenshot suite.

## The matrix

Five viewports, each representing a real breakpoint boundary rather than a specific handset:

| Name | Size | Why |
| --- | --- | --- |
| `phone-small` | 320x568 | smallest screen still in the field |
| `phone` | 390x844 | reference iPhone |
| `phone-large` | 430x932 | large phone / bottom-sheet room |
| `tablet` | 768x1024 | iPad portrait, the md breakpoint |
| `laptop` | 1280x900 | desktop reference (matches today's default) |

Five public routes, chosen because they carry the layouts that break: `/` (landing), `/library`, `/calculator`, `/blog`, `/booty-workout`.

That is 25 screenshots per browser. To keep wall-clock and baseline count sane, the full grid runs on **chromium** only; **webkit** runs the phone and tablet rows (the ones where Safari differs), and firefox is excluded from this suite.

## What gets captured

Per route/viewport: one screenshot of the page's main content region (`main`, falling back to `body`) with a fixed clip height, never `fullPage: true`. Full-page shots at phone widths are enormous and flake on lazy-loaded content below the fold.

Determinism reuses the patterns already proven in the mint spec: frozen clock, animations and transitions disabled via injected CSS, first-run overlays (cookie consent, welcome tour, install prompt) pre-dismissed through `addInitScript`, `document.fonts.ready` awaited, and images forced to a settled state before the shot.

## Files

- `e2e/responsive-viewports.ts` — the viewport table plus a `viewportsFor(project)` helper and `RESPONSIVE_VIEWPORTS` env filter (same pattern as `exercise-art-viewports.ts`, so CI can shard by viewport).
- `e2e/responsive-visual.spec.ts` — the suite. Uses `expectVisualSnapshot` from `e2e/visual-baseline.ts` so a missing baseline annotates instead of hard-failing, and `snapshotOptions("responsive")` from `e2e/visual-thresholds.ts` so tolerance is tunable via `VISUAL_RESPONSIVE_*` env vars.
- `.github/workflows/responsive-visual.yml` — runs the suite in the CI Playwright image on PRs touching `src/**` or `e2e/**`, uploads the visual artifacts via the existing `scripts/collect-visual-artifacts.mjs`, and sets `REQUIRE_VISUAL_BASELINES=1` only on the main-branch gate job.
- `package.json` — `test:responsive-visual` (run) and nothing else new: the `visual:update` script added earlier discovers any spec calling `expectVisualSnapshot`, so `npm run visual:update -- --spec responsive` records these baselines automatically.
- `e2e/README.md` — short section describing the matrix and how to add a route or viewport.

## Baselines

Baselines are generated with the Docker runner (`npm run visual:update -- --spec responsive --docker`) so the committed PNGs match CI pixels, then committed under `e2e/responsive-visual.spec.ts-snapshots/`. Until they exist, the suite reports missing baselines as annotations rather than failures, so the first CI run is informative instead of red.

## Notes

- Authenticated routes are intentionally excluded — they need seeded data to be pixel-stable, which is a separate piece of work.
- The suite is additive; no existing spec, threshold, or workflow changes behaviour.
