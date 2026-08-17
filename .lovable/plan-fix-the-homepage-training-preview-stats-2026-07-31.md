# Fix the homepage training-preview stats

## What that card actually is

The "This month" calendar with body weight and weekly volume on the homepage is a
static illustration (`src/components/home-fitness-preview.tsx`). Every number in it
is hardcoded — the streak, the coloured day dots, 184.2 lb, and 41,800 lb. It is not
computed from any account, so nothing is "wired wrong" in a broken sense. The
question is whether the example numbers are believable and consistent with the rest
of the illustration.

## Is 41,800 lb over 5 sessions right?

The real app calculates lifting volume as sets x reps x weight, summed over logged
strength sets. 41,800 lb of weekly tonnage is a normal, believable weekly total for
someone lifting a few times a week — around 14,000 lb per lifting day, which is what
a typical 20-25 set session at moderate loads comes to.

Two things are off, and both are labelling rather than maths:

1. **"5 sessions" reads as five lifting sessions.** In the mock calendar a typical
   week has about five logged days, but only two or three of them are Strength — the
   others are Cardio, Mind & body, or Sport, which contribute zero pounds of lifting
   volume. So the card implies 8,360 lb per session across five lifting days, which
   is low and looks wrong to anyone who lifts. The tonnage belongs to the strength
   days only.
2. **"Weekly volume" doesn't match the panel it sits in.** The card header says
   "This month" and the calendar shows a month, then the stat underneath switches to
   a weekly window. The real Fitness page shows month volume in its summary line.

## Changes

In `src/components/home-fitness-preview.tsx` only:

- Relabel the stat so the session count refers to strength work: keep the 41,800 lb
  figure and change the sub-line to "3 strength sessions - avg RPE 7.4", which
  matches roughly 13,900 lb per lifting day and matches the number of Strength dots
  in a typical week of the mock calendar.
- Change the stat title from "Weekly volume" to "Volume this week" and add a small
  "this week" qualifier so it is clear the month calendar and the weekly stat are
  two different windows, rather than the stat silently contradicting the header.
- Leave the body weight card, the streak chip, and the calendar dots as they are —
  those are internally consistent.

No changes to the real Fitness page, the volume maths, or any data.

## Technical notes

- File touched: `src/components/home-fitness-preview.tsx` (presentational strings
  only, no logic).
- Real volume logic in `src/lib/workout-stats.ts` (`volumeKg` = set count x reps x
  weight_kg) is correct and stays untouched; this plan only realigns the marketing
  illustration with it.
