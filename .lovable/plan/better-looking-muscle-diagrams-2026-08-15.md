# Better-looking muscle diagrams

Replace the current blob-on-a-stick-figure diagram with a proper anatomical body, so the highlighted muscle actually reads as a pec, lat, delt or quad — closer to the fitness infographics, but drawn in your own accent colour.

## What changes

- The silhouette becomes a real muscular figure: shoulders, chest, arms, waist taper, thighs and calves with proper proportions, front and back views.
- Each muscle is its own anatomically shaped region (pec fan, V-shaped lats, three deltoid heads, rectus abdominis blocks, quad sweep, hamstrings, glutes, calves, biceps/triceps, traps, forearms, obliques, lower back).
- Highlighted muscles keep the current logic: primary movers solid in the accent colour, secondary muscles faded, everything else muted — so it still follows Neon Mint and light/dark mode.
- Subtle muscle-separation lines on the unworked body so the figure looks like an anatomy chart rather than a plain shadow.
- Thumbnails in the exercise list and the enlarged view in the detail dialog both pick this up automatically; nothing about picking or adding an exercise changes.

## Technical outline

1. `src/components/muscle-map.tsx` — replace the ellipse-based `REGION_SHAPES` with SVG `path` data per region, keeping the same `MuscleRegion` union, `MUSCLE_LABELS`, `REGION_VIEW`, props (`primary`, `secondary`, `view`, `className`, `title`) and the exported `muscleMapSide` helper, so no caller needs editing.
2. Two silhouette groups (front and back) drawn as paths inside the existing `0 0 100 200` viewBox, with a thin `stroke-muted-foreground/30` detail layer for muscle separation.
3. Region fills stay `fill-primary` / `fill-primary/35` token classes — no hardcoded colours.
4. Verify at thumbnail size (~44px) that the shapes still read, and check both light and dark mode plus the enlarged dialog.

No data, backend, or workout-logging changes.
