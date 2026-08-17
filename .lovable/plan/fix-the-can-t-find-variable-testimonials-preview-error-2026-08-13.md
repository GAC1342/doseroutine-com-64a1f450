# Fix the "Can't find variable: Testimonials" preview error

## What I found

The error is not a code bug. Checks I ran just now:

- `src/components/testimonials.tsx` exports `Testimonials`, and both `src/routes/index.tsx` and `src/routes/auth.tsx` import it correctly at the top of the file.
- The homepage served locally returns HTTP 200 and the rendered HTML contains the testimonials section.
- The dev server log shows it restarted and re-optimized dependencies right at the time of the error ("optimized dependencies changed. reloading"). Your open preview tab was running the old module graph, so it briefly lost the newly added component.

So the section is live and working; your tab just held a stale build.

## Plan

1. Reload the preview tab — that alone clears this class of error.
2. Verify after reload: homepage shows the Alexander D. testimonial and the app screenshots strip, and `/auth` in sign-up mode shows the testimonial.
3. If (and only if) the error survives a clean reload, treat it as a real bundling issue and fix it by loading the testimonial section through the same lazy/Suspense pattern the homepage already uses for below-the-fold blocks.

No source changes are planned unless step 3 triggers.
