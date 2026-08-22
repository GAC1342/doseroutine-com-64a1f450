# Workout scheduling, onboarding, analytics, and calculator links

## Goal
Make repeating workouts reliably appear in Today and Timeline, let users edit a selected calendar occurrence, and add the requested onboarding, analytics, and calculator-link checks.

## Implementation

1. **Use one recurring workout model**
   - Save “Repeat weekly” plans as one reusable workout template plus one `workout_sessions` recurrence rule.
   - Keep the repeat toggle independent from the weekday selector and require at least one selected day when repetition is enabled.
   - Preserve exercises, selected weekdays, start time, and weekly interval when users save and return.
   - Normalize older saved rows whose empty day list currently renders as every day but appears unselected in the editor.

2. **Show the same plan everywhere**
   - Update Timeline’s day details to resolve recurring `workout_sessions` through the same recurrence engine already used by Today and Fitness.
   - Merge planned routine occurrences with completed workout logs without duplicating a workout that has already been logged.
   - Clearly distinguish planned and completed states.

3. **Edit from the selected calendar day**
   - Add an Edit plan action beside recurring workout occurrences in Today and Timeline.
   - Open the existing routine editor for that workout and selected date.
   - Support editing this occurrence, this week, or the ongoing series with the existing skip, time-override, and recurrence helpers.
   - Refresh Today, Timeline, and Fitness immediately after save.

4. **Update the onboarding walkthrough**
   - Replace the stale walkthrough with Today, Stack, Progress, Food, and More.
   - Explain each section briefly and identify More → Dose calculators as the calculator location.

5. **Add privacy-safe usage analytics**
   - Track primary navigation clicks for Today, Stack, Progress, Food, and More.
   - Track calculator-link clicks with source page and destination.
   - Track guide-to-peptide-calculator CTA clicks and successful arrival at the highlighted `#calculator` section.
   - Track opening a workout occurrence editor from a calendar day.
   - Do not send exercise notes, health entries, meal details, or other sensitive values.

6. **Fix and guard calculator links**
   - Re-run the rendered/prerendered anchor-text check for both peptide guide URLs.
   - Replace stale “all calculators” links targeting `/calculator` with `/calculators` and descriptive anchor text.
   - Extend regression coverage so the stale singular route cannot return.

7. **Regression coverage and verification**
   - Test that multi-day weekly recurrences appear on every selected date and not on unselected dates.
   - Cover legacy empty-day normalization and occurrence-level edits.
   - Add Timeline integration coverage proving recurring plans render from `workout_sessions`.
   - Verify live: create a multi-day workout, revisit it, view it in Today and Timeline, edit one date, and confirm the series remains intact.
   - Run the relevant unit, SEO/link, formatting, and Playwright checks.

## Confirmed findings

- Recurring plans are stored in `workout_sessions`; completed workout entries are stored separately in `workout_logs`.
- Today and Fitness already expand `workout_sessions` with the shared recurrence engine.
- Timeline currently reads only `workout_logs` for workout day details, so saved repeating plans can be absent there even though the recurrence persisted.
- Existing helpers already support skipped dates, per-date time overrides, and week/series scopes; the calendar day UI does not expose them directly.

## Technical notes

- Keep `workout_sessions` as the source of truth for future plans and `workout_logs` for completed activity.
- Reuse `routineForDay`, `toggleSkipOccurrence`, `setDayTimeOverride`, and scoped routine updates rather than cloning finite future log rows.
- Use the existing analytics wrapper.