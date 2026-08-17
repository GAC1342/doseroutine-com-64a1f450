# Show Fitness & Body on the homepage to drive signups

Short answer: yes — but not as more bullet points. Today the only mention of fitness is inside the "New this week" grid near the bottom of the page, where a first-time visitor will rarely scroll. Someone landing on the homepage can't tell that DoseRoutine also tracks workouts and body measurements, so we lose people who came looking for that.

## What to add

**1. Say it above the fold**
The hero currently lists three proof points (interactions, reminders, dosing). Add a fourth that names training and body data, so the full value is visible before any scrolling — e.g. "Log workouts and body measurements next to your protocol."

**2. A dedicated Fitness & Body section (the main addition)**
A new section placed after the core product story and before "New this week", built as a two-column block:

- Left: headline, one short paragraph, and 4 concrete capability lines — workout calendar with streaks, 30+ activity types (strength, run, cycling, swim, yoga, sport), reusable templates, and body metrics (weight, waist, body fat, photos).
- Right: a static visual mock of the Fitness page — a mini month calendar with colored family dots, a streak chip, and a small "last body weight" tile. Built with the existing design tokens, no screenshots to maintain.
- One CTA button ("Start tracking free") plus a text link to the public library, using the same `handleCta` tracking as the other homepage CTAs so we can see which section converts.

**3. Tighten "New this week"**
That grid currently repeats fitness, templates, session context and body metrics. Once the dedicated section exists, trim the duplicated cards down so the page doesn't say the same thing twice, and keep the genuinely new items (session context, notification center, deeper safety checks).

**4. Metadata**
Update the homepage title/description and the FAQ block to mention workout and body tracking, so search results reflect it too.

## Not in this plan

No new public marketing page for fitness, and no changes to the app itself — this is homepage presentation only. If you want a standalone `/fitness-tracking` landing page targeting search traffic, that's a separate follow-up worth doing with keyword data first.

## Technical notes

- All edits in `src/routes/index.tsx`; the new visual mock goes in a small local component (or `src/components/home-fitness-preview.tsx`) to keep the route file manageable.
- Reuse `WORKOUT_FAMILY_LABELS` / family dot colors from the existing fitness code so the mock stays in sync with the real UI.
- CTA clicks go through the existing `handleCta` analytics helper with new IDs (`fitness_section_primary`).
- Colors via existing tokens only (primary teal, streak amber, accent) — no hardcoded hex.
