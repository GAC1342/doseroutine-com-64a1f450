# Add the 10-Minute Booty Workout to "What shipped this week"

The homepage "What shipped this week" block currently lists four cards: AI meal
scanner, calorie and macro goals, one timeline, and the instruction manual. The
10-Minute Booty Workout — which has its own public page at `/booty-workout` with
a guided timer, illustrated moves and completion tracking — is not mentioned.

## What changes

Add a fifth card to that section:

- Title: "10-minute booty workout"
- Body: short line covering the guided timer, illustrated moves, and the
  completion streak/chart, so it reads like the other cards.
- Icon: a training icon consistent with the existing lucide icons already
  imported on the page.
- The card links through to the free `/booty-workout` page so visitors can try
  it without signing up (the other cards are static, so this is the one card
  that also acts as an entry point).

Also update the section's intro line, which currently says "food, timeline and
help built in," so it reflects training being part of the list.

## Technical notes

- Single file: `src/routes/index.tsx`, the array rendered inside the
  "New this week" section (around lines 1048-1085).
- Grid is `sm:grid-cols-2`; five cards leaves one card full-width-adjacent on
  the last row, which is fine visually, but I'll make the last card span both
  columns on `sm+` so the row doesn't look broken.
- No copy in other locales is affected — this section is hardcoded English,
  same as today.
