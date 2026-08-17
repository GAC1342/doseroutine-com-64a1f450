# Reminders for workout routine + meal times

Right now reminders only cover doses and one-off planned workouts logged on the calendar. The new recurring workout slots and meal times on `/fitness` show on Today but never alert. This adds an alert at the exact scheduled time for each of those recurring anchors.

## What you get

- A push notification (and an entry in your in-app notification bell) at the exact minute a workout slot or meal time is scheduled, on the days it repeats, in your timezone.
- Per-row control on `/fitness`: each workout slot and meal time gets a small bell toggle so you can have anchors on the timeline without alerts.
- An optional "remind me X minutes early" per workout slot (the existing pre-alert fields already on those rows), off by default.
- Quiet hours are respected — nothing fires inside your quiet window.
- On the installed iOS/Android app, these also become on-device alarms so they fire while the app is closed or offline, the same way dose alarms already do.
- No effect on adherence scoring: routine anchors stay unscored.

## Behaviour details

- Fires when the current local minute is at or just past the scheduled time, within a 5-minute catch-up window, at most once per slot per day.
- If a slot is switched off (the existing on/off switch), it neither shows nor alerts.
- New meal times default to alerts on; existing workout slots keep whatever their alert fields already say.

## Technical plan

**Database (one migration)**
- `meal_times`: add `alerts_on boolean not null default true`.
- New `routine_notification_log` table: `user_id`, `routine_kind` ('workout' | 'meal'), `routine_id`, `day_key`, `channel` ('push' | 'inbox'), `status`, unique on (`routine_id`, `day_key`, `channel`) — this is the once-per-day dedupe guard. RLS: owner can read; service role full access; no anon grants.

**Cron endpoint**
- New `src/routes/api/public/hooks/send-routine-reminders.ts`, modelled directly on `send-workout-reminders.ts`: same `x-cron-secret` verification, same `localParts`/quiet-hours helpers, same web-push send + dead-endpoint cleanup, same mirror into `notifications` with a `dedupe_key`.
- Reads active `workout_sessions` (with `planned_time`) and active `meal_times`, resolves each user's timezone from `profiles`, computes today's local day key and minute, and matches rows using the shared `occursOnDay` / `normalizeTime` helpers from `src/lib/routine-schedule.ts` so the alert times can never disagree with what Today renders.
- Deep links: workout alerts open `/fitness?day=<day>&view=workouts`, meal alerts open `/today`.
- Registered with pg_cron on `*/5 * * * *` against `https://doseroutine.com/api/public/hooks/send-routine-reminders`, matching the existing dose reminder job.

**UI**
- `src/components/routine-planner-card.tsx`: add a bell toggle per row (writes `at_time_alert_on` for workout slots, `alerts_on` for meal times) plus a small "remind early" minutes field for workout slots.
- `src/routes/_authenticated/reminders.tsx`: extend the native alarm sync to also schedule weekly-repeating local notifications for active routine rows, alongside the existing dose alarms.

**Tests**
- Unit tests for the matching logic (fires exactly once inside the window, skipped when inactive, skipped in quiet hours, correct weekday and timezone handling), extracted into a pure helper so it is testable without the network.
