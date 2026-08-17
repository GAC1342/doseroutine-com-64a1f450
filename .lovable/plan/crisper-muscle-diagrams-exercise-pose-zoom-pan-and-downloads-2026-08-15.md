# Crisper muscle diagrams: exercise pose, zoom/pan, and downloads

Three upgrades to the muscle diagrams in "Pick by muscle group".

## 1. Sharper pictures everywhere

The diagrams are already vector (SVG), so they never pixelate — but small details currently get lost at thumbnail size. Fixes:

- Thumbnails render a simplified version (thicker outlines, no hairline detail lines) so they stay readable at ~44px.
- The enlarged view renders full detail at a larger canvas.
- A download button in the detail view saves the current diagram as a crisp `.svg`, or as a `.png` rendered at 3x (about 1200x2400) for sharing or printing.

## 2. Body position with the exercise

The enlarged view gains a small pose figure next to the anatomy map showing how the body is positioned for that exercise — lying on a bench, standing with a barbell, seated, hanging, etc. Poses are hand-drawn SVG line figures reused across exercises (bench-lying, standing-press, standing-hinge, seated-row, squat, pull-up hang, lunge, plank, cable-stand, incline-bench, machine-seated, floor-lying). Each exercise is tagged with one pose plus a one-line setup cue, so the user sees "what it works" and "what it looks like" side by side.

## 3. Zoom and pan

The enlarged diagram becomes zoomable:
- Pinch to zoom and drag to pan on touch.
- Mouse wheel / trackpad zoom anchored on the cursor, plus +/- and reset buttons.
- Zoom clamped to 1x–5x, pan clamped so the figure can't be dragged off screen.
- Double-tap toggles between fit and 2.5x centred on the tap point.

Thumbnails stay simple taps — zoom only applies in the enlarged view.

## Technical outline

1. `src/components/muscle-map.tsx` — add a `detail` prop (`"full" | "simple"`) that drops the hairline separation paths and thickens region strokes for small sizes. Export a `renderMuscleMapMarkup()` helper returning standalone SVG markup with resolved theme colours (so downloads aren't dependent on CSS variables).
2. `src/lib/muscle-poses.ts` — new. `PoseId` union plus SVG line-figure paths for the poses listed above, drawn in a shared 100x100 viewBox, using `currentColor`.
3. `src/components/pose-figure.tsx` — new. Small component rendering a pose by id with an accessible label.
4. `src/lib/muscle-groups.ts` — add `pose: PoseId` and `setup: string` to each exercise entry. Existing fields untouched.
5. `src/components/zoom-pan.tsx` — new. Reusable wrapper: native non-passive `wheel` listener with `preventDefault`, exponential zoom scaled by normalised `deltaY` (`Math.exp(-dy * 0.0015)`), cursor-anchored offset math, Pointer Events two-finger pinch, `touch-action: none`, clamped zoom/pan, and +/-/reset controls.
6. `src/lib/svg-export.ts` — new. `downloadSvg()` and `downloadPng()` (serialize SVG, draw to an offscreen canvas at a 3x scale, `toBlob`, trigger download). Pure client-side; no backend.
7. `src/components/muscle-group-picker.tsx` — thumbnails use `detail="simple"`; the dialog gets the zoom/pan wrapper, the pose figure with its setup line, and the SVG/PNG download buttons.

No database, backend, or workout-logging changes.
