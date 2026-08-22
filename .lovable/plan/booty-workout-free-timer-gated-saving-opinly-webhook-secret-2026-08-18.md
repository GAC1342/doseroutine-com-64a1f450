# Booty workout: free timer, gated saving + Opinly webhook secret

## What changes for visitors

The public 10-minute booty workout page stays fully usable without an account:

- Start workout, Pause/Resume, Skip, Reset, and the timing controls keep working for everyone. This is the try-before-signup hook.
- The buttons that need an account — "Schedule a day" on the completion chart and "Log this session in Fitness" — now send signed-out visitors to signup with a short line explaining that a free account saves their progress, and bring them right back to the workout page after they sign up.
- Signed-in users see no change: those buttons go straight to Fitness as they do today.

A small note under the timer for signed-out visitors: "Your session history is saved on this device. Create a free account to sync it across devices." Signed-in users don't see it.

## Opinly webhook

After this plan is approved, I'll open the secure form so you can paste the `whsec_...` signing secret. It gets saved as `OPINLY_WEBHOOK_SIGNING_SECRET` and the existing `/api/public/opinly-webhook` endpoint starts verifying and accepting Opinly's publish events, which pings search engines the moment a post goes live.

## Technical notes

- Read session state on `/booty-workout` from the existing Supabase auth hook (client-side; the route stays public and crawlable — no gating in `beforeLoad`, no move under `_authenticated/`).
- `booty-workout-chart.tsx`: `scheduleTo` resolves to `/fitness` when signed in, otherwise `/auth` with a `redirect` search param back to `/booty-workout`. Same treatment for the "Log this session in Fitness" link in `src/routes/booty-workout.tsx`.
- Confirm `/auth` honours the `redirect` search param post-signin; wire it if not.
- No styling or layout changes beyond the one helper line of copy.
