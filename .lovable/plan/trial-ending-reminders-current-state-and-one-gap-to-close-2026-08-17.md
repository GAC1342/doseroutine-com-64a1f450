# Trial-ending reminders: current state and one gap to close

## What is already in place and running

- **In-app banner on Today** — appears when 3 or fewer days remain in the trial, explains whether the plan will auto-start or the trial will simply end, with a "Manage plan" / "Choose a plan" button to `/upgrade`. Dismissible per trial.
- **Reminder email** — an automated job runs twice a day (02:32 and 14:32 UTC) and emails anyone whose trial ends within 2 days. The last 32 runs all completed successfully.
- **No double-sends** — each trial is stamped once it is emailed, so re-runs never send twice.

Nobody has received one yet simply because no account has been on a trial so far (current subscriptions are all active, none trialing). The wiring is live and healthy, it just hasn't had a real trial to act on.

## The gap

Today there is exactly **one** email, sent inside the final 2 days. There is no separate "last day" nudge, which is the moment that converts best.

## Proposed change

Send two emails per trial instead of one:

1. **Day 5 of 7 (2 days left)** — the existing heads-up email.
2. **Final day (0-1 days left)** — a short "your trial ends today" email with a single button to choose or confirm a plan.

Also lower the in-app banner to reflect urgency on the last day ("ends today") — the copy already handles this, so no change needed there.

## Technical details

- Add a second stamp column on `subscriptions` (e.g. `trial_final_email_at`) so each of the two emails is independently idempotent.
- In `src/routes/api/public/hooks/trial-ending-reminders.ts`, split the due-check into two rules: the existing 2-day rule, and a final-day rule (`daysUntil <= 1`) gated on the new column.
- Add a `trial-final-day` email template alongside `src/lib/email-templates/trial-ending.tsx`, registered in the template registry, with copy that differs based on whether the plan will auto-start.
- Extend `src/lib/__tests__/trial-ending.test.ts` to cover both windows and confirm neither email can fire twice.
- No change needed to the cron schedule — twice daily already covers the final-day window.

## Verification

Run the job manually against a test trial row and confirm exactly one email of each type is sent, and that a second run sends nothing.
