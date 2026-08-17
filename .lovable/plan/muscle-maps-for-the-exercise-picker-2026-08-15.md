# Muscle maps for the exercise picker

Add a small anatomy diagram to every exercise in "Pick by muscle group", with the worked muscle highlighted — plus a tap-to-enlarge view with quick form tips.

## What you'll see

- Each exercise row gets a small body-map thumbnail on the left (replacing the plain rank number, which moves to a corner badge).
- The highlighted region matches the exercise, not just the tab: Bench press highlights chest with triceps and front delts shaded lighter as secondary muscles.
- Tapping the thumbnail opens a larger card showing the same diagram at full size, the exercise name, primary and secondary muscles listed in words, and 2–3 short form cues.
- The "Add" behaviour stays as it is: tapping the row still drops the exercise into your workout. Only the thumbnail opens the detail view.

## How it's built

Hand-drawn inline SVG body silhouettes (front and back), not photos or generated illustrations. One reusable component takes a list of muscle regions and paints them in the app's accent colour — primary muscles solid, secondary muscles at lower opacity. This keeps the whole feature at a few KB, works in light and dark mode, follows the Neon Mint / teal accent automatically, and needs no image hosting.

## Technical outline

1. `src/components/muscle-map.tsx` — new. Front/back torso-and-limb silhouette as SVG paths, with named overlay paths for: chest, upper back/lats, traps, front delts, side delts, rear delts, biceps, triceps, forearms, abs, obliques, quads, hamstrings, glutes, calves. Props: `primary`, `secondary`, `view` ("front" | "back" | "auto"), `size`. Colours use `currentColor`/token classes — no hardcoded hex. `role="img"` with an `aria-label` naming the muscles worked.
2. `src/lib/muscle-groups.ts` — extend each exercise entry with `primary: MuscleRegion[]`, `secondary: MuscleRegion[]`, `view`, and `cues: string[]` (2–3 short form tips). Existing `name`/`note` fields unchanged, so nothing else that reads this file breaks.
3. `src/components/muscle-group-picker.tsx` — render `MuscleMap` at ~44px in each row; rank number becomes a small badge over the thumbnail. Thumbnail becomes its own button (`stopPropagation`) that opens a shadcn `Dialog` with the large map, muscle names, and cues. Row click still calls `onPick`.
4. Accessibility: dialog trigger labelled "See muscles worked: <exercise>"; the enlarged map's muscle list is real text, so screen readers get the information without the graphic.

No database, backend, or workout-logging logic changes.
