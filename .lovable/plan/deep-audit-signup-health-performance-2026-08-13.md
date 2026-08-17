# Deep audit: signup health + performance

## What the data already shows

I pulled live numbers before writing this plan.

**Signups**
- 11 accounts total, all confirmed, none created after Aug 1.
- Sign-up page views are tiny: most days 0-4 visits to `/auth` in the last two weeks. The only busy days (Jul 29, Aug 1) were our own testing.
- Form submissions on `/auth`: last real one was Aug 1. Recent visitors reach the page and leave without typing.
- 15 sign-up errors ever recorded, all in July — no error storm suggesting a broken form.

**Traffic (Search Console, Jul 14 - Aug 10)**
- 22,381 impressions, **22 clicks**, click-through 0.1%, average position 62.
- Homepage: 16 impressions, 8 clicks. Everything else is compound pages ranking on page 4-7.

So the most likely story is: almost nobody is arriving (22 visits from Google in a month), and the few who do rarely reach `/auth`. That is a traffic + funnel problem, not proof of a broken form — but the form has **not** been proven working end-to-end recently, so the plan verifies it first rather than assuming.

**Performance (our own field data, last 14 days, real users)**
- CLS 0.00, FCP 0.85s desktop / 0.99s mobile, INP 80ms, TTFB 0.57s desktop / 0.14s mobile — all in Google's "good" band.
- LCP reports as ~50ms, which is impossible (LCP can never beat FCP). Our vitals collection is under-reporting LCP, so we currently have **no trustworthy LCP number**. This must be fixed before any performance tuning, otherwise we'd be optimizing blind.

## Plan

### 1. Prove sign-up works end-to-end (highest priority)
- Run a scripted browser sign-up against the live site on both a desktop and a mobile viewport: email+password, Google, and Apple paths; confirm the account lands on `/today`.
- Check confirmation email actually sends and its link returns to the app (not a dead redirect).
- Re-check the OAuth callback route for the "logged in but bounced back to /auth" race.
- Delete the test accounts afterwards.
- If anything fails, fix it; if everything passes, say so plainly instead of inventing a bug.

### 2. Close the tracking blind spots
- Fix LCP capture so field data is real.
- Add events for the missing funnel middle: sign-up page reached -> method chosen -> submitted -> account created -> first dose logged, so we can see exactly where people drop instead of guessing.
- Sanity-check the anonymous analytics endpoint isn't silently dropping events (rate limiting, bot filter misclassifying real mobile users).

### 3. Fix the funnel leak from content pages
- 22k impressions land almost entirely on compound/library pages, which currently push readers to a generic "sign up" link. Add a single, relevant in-context call to action tied to what they were reading (e.g. "track this compound").
- Make the sign-up page itself lower friction: sign-up mode first (already default), clearer value line, visible Google/Apple buttons above the email form on mobile.

### 4. Attack the CTR problem (that's where the users are)
- 0.1% click-through at position 62 means the pages are indexed but not chosen. Rewrite titles and descriptions for the top-impression pages (cardarine, boldenone undecylenate, dihexa, epithalon, d-ribose and the rest of the top-50 by impressions) to match the actual search intent.
- Strengthen internal linking into those pages so they can climb from page 4-6.

### 5. Performance pass, guided by real numbers
- Once LCP is trustworthy, run Lighthouse for mobile and desktop on the homepage, a library page and `/auth`, and fix only what the audits flag: unused JavaScript on first load, image sizing/format, font loading, and any render-blocking requests.
- Keep the existing performance budget checks green; no styling or layout changes.

### 6. Report
- A short written summary of: does sign-up work, where people drop off, what changed, and before/after numbers.

## Technical notes
- Live verification uses Playwright against `https://doseroutine.com`; test accounts removed after.
- LCP fix is in `src/lib/web-vitals.ts` (value reported per metric and prerender/bfcache handling).
- Funnel events extend `src/lib/funnel.ts`; ingestion path is `src/routes/api/public/analytics.ts`.
- Title/description work is per-route `head()` on library and compound routes — content only, no layout change.
- No database schema changes required.
