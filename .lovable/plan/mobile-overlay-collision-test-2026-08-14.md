# Mobile overlay collision test

Add an automated Playwright check that the three bottom-of-screen layers on the landing page — cookie notice, install banner, and the sticky "Sign up free" bar — never physically overlap on a phone, and that only one primary signup CTA is visible at a time.

## What the test covers

Running at a Pixel 7 / iPhone 14 viewport against `/`:

1. **No overlapping rectangles.** For every pair of visible bottom-fixed layers, their bounding boxes must not intersect.
2. **One primary CTA per viewport.** At any scroll position, at most one element labelled "Sign up free" is inside the viewport (hero button or sticky bar, never both).
3. **Install banner timing.** On a first pageview with no dwell time, the install banner does not appear; it becomes eligible after the second pageview (seeded via storage) and deep scroll.
4. **Cookie banner coexistence.** With consent not yet given and the page scrolled far enough for the sticky bar, the cookie notice and the sticky bar must not sit on top of each other.

Scroll positions checked: top, mid-page, near the final CTA section, and page bottom.

## Technical details

- New spec: `e2e/landing-overlay-collisions.spec.ts`, following the existing `e2e/mobile-regression.spec.ts` pattern (manual WebKit/Chromium launches with device profiles, no config changes).
- The bottom layers currently have no stable hooks, so add `data-testid` attributes only (no styling or logic change):
  - `data-testid="cookie-banner"` in `src/components/cookie-banner.tsx`
  - `data-testid="install-sticky"` and `data-testid="signup-sticky"` on the two fixed bars in `src/routes/index.tsx`
  - `data-testid="primary-cta"` on the hero/final signup CTA wrappers
- Helper in the spec computes visible bounding boxes and asserts pairwise non-intersection with a 1px tolerance.
- Storage seeding: clear `doseroutine:cookie-consent:v1` for cookie-banner cases; set `doseroutine_pageviews` to 2 for install-banner cases; clear `doseroutine_install_sticky_dismissed` between cases.
- Test is added to the existing e2e run; no new CI workflow.
