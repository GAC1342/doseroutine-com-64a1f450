# Speed up the homepage (Lighthouse fixes)

Goal: cut First Contentful Paint (3.0s), Largest Contentful Paint (3.2s) and Speed Index (4.0s) on mobile, without changing any behaviour, layout, or content. Blocking time and layout shift are already perfect (0) — nothing that risks those.

## What's actually slowing it down

Lighthouse's own breakdown says LCP is 10 ms of server time and **1,960 ms of "render delay"**. The headline `Stop guessing. Start tracking every dose safely.` can't paint until the stylesheet and the display font finish downloading — a 3-step chain: HTML → CSS → font file (2,089 ms total).

Everything else is small change on top of that.

## Changes

1. **Break the font out of the critical chain.** The Space Grotesk font file is only discovered after the CSS parses. Preload it in the site head so it downloads at the same time as the CSS, and make sure text paints immediately in a fallback font and swaps in (no invisible-text delay). Expected: the biggest single win on FCP/LCP/Speed Index.

2. **Trim the font payload.** Three separate Space Grotesk weights (500/600/700) plus variable Inter are loaded on every page. Keep only weights the design actually renders, and load the extra weight(s) non-blocking. No visual change — verified by comparing rendered pages before/after.

3. **Fix the oversized logo.** The nav logo ships the 192x192 PNG (32 KiB) to display at 32 CSS px. Add a small WebP/PNG version sized for the header and point the header image and its preload hint at it. Saves ~30 KiB on the critical path and clears the "Improve image delivery" audit. The 192/512 icons stay untouched for the PWA manifest, favicons and app stores.

4. **Remove the unused preconnect.** The homepage preconnects to the backend but never calls it before paint — Lighthouse flags it as wasted. Drop it on the landing route only; keep it on routes that do hit the backend early.

5. **Cache lifetime on the logo.** The rule exists in the headers file but Lighthouse reports no TTL on the versioned URL. Confirm the hosting layer applies it to versioned (`?v=`) requests and adjust the matching rule if not.

6. **Reduce unused JavaScript (129 KiB).** Only clearly-safe wins: lazy-load below-the-fold landing sections and any modal/dialog code that isn't needed for first paint. Nothing that changes what renders on load.

## Also flagged, same pass (accessibility, currently 92)

- Contrast failure on at least one element — recolour using existing tokens.
- Touch targets below the 48px minimum — increase hit area only, not visual size.
- "Skip links are not focusable" — the skip-to-content link exists in the root layout but can't receive keyboard focus; fix the visually-hidden styling so it appears on Tab.

## Not doing

- No changes to routing, auth, data loading, SEO tags, robots/sitemap logic, or the design system palette.
- No new dependencies.

## Verification before finishing

- Full test suite (889 tests) green.
- Production build succeeds.
- Homepage screenshotted before/after at mobile and desktop widths to confirm it looks identical.
- Header logo, favicon, PWA manifest icons and app-store icons all still resolve.
