# Landing page + device breakdown panel

Add a new panel to the admin Traffic & conversion dashboard that shows, per landing page and per device type, how many visitors bounced and how many hit the "save this result" signup gate.

## What you'll see

A table on `/admin/analytics` (same 7d/30d toggle as the rest of the page) with one row per landing page, and a device filter (All / Mobile / Tablet / Desktop). Columns:

- Landing page (first page of the session)
- Sessions
- Bounce rate (sessions that viewed only that one page)
- Save-gate shown (visitors who saw the "save this result" prompt)
- Save-gate clicks and click rate
- Signups attributed to that landing page

A second compact table summarises the same metrics rolled up by device only, so you can see at a glance whether mobile bounces harder than desktop.

## How it works

- Landing page = the earliest recorded pageview path in each session.
- Bounce = a session with exactly one pageview event.
- Device is derived from the user-agent string already stored on every event (mobile / tablet / desktop) — no new tracking or data collection needed.
- Conversions come from the existing `funnel_save_gate_shown`, `funnel_save_gate_click`, and `funnel_signup_completed` events, joined back to the session's landing page.
- Bot traffic is excluded using the same user-agent + crawl-rate rules already used by the traffic summary, so numbers match the existing human-visitor counts.

## Technical notes

- New server function `getLandingConversions` in `src/lib/landing-conversions.functions.ts`, admin-gated with `requireSupabaseAuth` + `is_admin` RPC, mirroring `traffic.functions.ts`. Reads `analytics_events` (session_id, path, event_name, properties, created_at) over the window, groups by session, and returns `{ byLanding: [...], byDevice: [...] }`.
- Bot filtering logic (UA flags + pages-per-session / burst heuristics) is extracted from `traffic.functions.ts` into a shared `src/lib/bot-sessions.ts` helper so both functions stay in sync; `traffic.functions.ts` is refactored to use it with no behaviour change.
- Device classification lives in a small `deviceFromUa()` helper in the same shared module.
- New UI component `src/components/admin/landing-conversions-card.tsx`, rendered on `src/routes/_authenticated/admin/analytics.tsx` below the existing funnel/traffic cards, using the existing `Card` styling and the page's `win` state.
- No styling-system or schema changes; no new tables or migrations.
