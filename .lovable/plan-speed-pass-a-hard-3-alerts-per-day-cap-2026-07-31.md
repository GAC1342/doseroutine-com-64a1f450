# Speed pass + a hard 3-alerts-per-day cap

Two independent workstreams. Neither changes any feature behaviour beyond the notification cap you asked for.

## Part 1 — Cap notifications at 3 per user per day

Today nothing repeats or nags: each dose alerts once, each workout/meal routine alerts once per day. But there is no ceiling on the *total*, so someone with a 12-item stack plus three meal times can get buzzed 15+ times a day.

What gets built:

- A shared daily-budget helper used by all three background jobs (doses, workout sessions, routine anchors). Before sending, each job counts how many push/email alerts that user has already received on their **own local calendar day** and sends only up to 3.
- Priority when more than 3 are due: doses first, then workouts, then meals — so the important one is never the alert that gets dropped.
- Alerts beyond the cap are still written to the in-app inbox (silent, no buzz) and logged as `skipped:daily-cap`, so nothing disappears — you just stop getting pinged.
- A per-user setting on the reminders screen: **Daily alert limit** — 3 (default), 5, 10, or off. So a power user can raise it, but the app is quiet by default.
- Day boundary uses the user's timezone, matching how the rest of the app counts days.

Cost note: the 5-minute cron itself is not what costs money — it is one small query per tick, and it stays. The cap is about your users' attention, and it also cuts outbound push/email volume.

## Part 2 — Targeted speed fixes

Current measured state of the built app: 4.5 MB of JS total, dominated by a 235 KB gzipped main bundle that every visitor downloads. The PDF and screenshot libraries are already lazy — the weight is in shared app code.

Fixes, safest first:

1. **Split the main bundle by vendor group** — router/query, Supabase client, UI primitives, and charts each become their own cacheable chunk instead of one monolith. Repeat visits re-download far less after each deploy.
2. **Defer what the first paint does not need** — the AI chat bundle (68 KB gz), the i18n provider, and the analytics/monitoring code load after hydration rather than blocking it.
3. **Trim first-load on Today, Fitness, and Library** — move the heavy content data files (longevity, menopause, sexual-health, fertility content, ~240 KB raw combined) behind route-level lazy loads so only the hub you open pays for its own data.
4. **Preload the hero image on the homepage** and mark it as the single LCP candidate, so Largest Contentful Paint stops waiting on the JS bundle.
5. **Icon imports** — ensure every `lucide-react` icon is individually imported so the tree-shaker can drop the rest.

## Verification (this is the "without breaking anything" part)

- Lighthouse-style audit run against `/`, `/today`, `/fitness`, `/library`, and `/closed-testing`, before and after, with the numbers reported to you side by side.
- Existing `perf-budgets.json` CI contract must still pass (FCP under 2.0s, LCP under 2.8s, TBT under 300ms, CLS under 0.1, performance score at or above 0.85). Budgets get tightened to the new numbers only if the new numbers hold.
- Full unit suite plus typecheck must stay green.
- New unit tests for the daily cap: counts per local day, priority ordering, cap-off setting, and that a capped alert still reaches the inbox.
- Each of the three background jobs gets a dry-run against real data to confirm the cap fires and nothing double-sends.

## Technical notes

- Cap logic lives in a new pure module (`src/lib/notification-budget.ts`) so it is unit-testable without a database, mirroring how `routine-reminders.ts` is structured.
- Counting reads `notification_log` and `routine_notification_log`, both of which already carry `user_id`; the routine log also carries `day_key`. A migration adds a `day_key` column plus index to `notification_log` so the daily count is a single indexed query rather than a timestamp scan.
- The per-user limit is a new `profiles.daily_alert_limit` column, default 3.
- Bundle splitting is done via `build.rollupOptions.output.manualChunks` in `vite.config.ts`; route-level trimming uses dynamic `import()` inside the existing route components, which TanStack's auto code-splitting already supports.
- No route files are restructured and no `.lazy.tsx` conversions — that keeps the router graph and SSR/prerender behaviour identical.
