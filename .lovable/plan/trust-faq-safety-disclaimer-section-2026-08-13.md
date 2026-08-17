# Trust FAQ + safety/disclaimer section

## What exists today (checked)

- Homepage FAQ has 7 questions, all feature/SEO ones ("Is DoseRoutine free?", "How do I calculate reconstitution?"). None cover privacy, data handling, who's behind the app, or safety.
- The homepage has a single medical-disclaimer paragraph plus a footer disclaimer line — no visible safety block.
- `/faq` does cover "Does DoseRoutine give medical advice?", "Where does interaction data come from?", "Is my health data private?" — but that page is a separate destination most landing visitors never reach.
- `/privacy`, `/legal`, `/data-deletion` already state, in the owner's own words: no selling data, no advertisers, encrypted managed databases with row-level access controls, export/delete on request, GDPR rights.

So the substance exists; it just isn't in front of the people who need reassurance before signing up. Nothing new will be claimed — every line below reuses wording already published on those pages.

## Plan

### 1. New `TrustSafety` section component

A single reusable block with two parts:

**Safety / disclaimer** (short, plain, not scary):
- DoseRoutine is a tracking and reference tool — it does not diagnose, prescribe, or replace your doctor or pharmacist.
- Interaction results are informational flags for you to discuss with a clinician, not clearances.
- Dose calculators do the arithmetic you enter; they don't decide what you should take.
- Links to `/medical-disclaimer`, `/editorial-policy` and `/sources` for how content is compiled and cited.

**Trust FAQ** (accordion, 6 questions, answers drawn from existing published pages):
1. Does DoseRoutine give medical advice?
2. Is my health data private — who can see it?
3. Do you sell my data or share it with advertisers?
4. Can I delete my account and everything in it?
5. Where does the interaction and compound data come from?
6. Who builds DoseRoutine?

Rendered with the SSR-visible accordion pattern already used for FAQs (content in the HTML, not JS-gated), so search and AI engines can read it.

### 2. Placement

- Homepage: directly below the testimonial/screenshots block, above the existing feature FAQ.
- `/auth` in sign-up mode: condensed variant (safety line + privacy/no-selling/delete answers only) under the form.
- Interaction checker and the reconstitution/dosage/TRT calculators: the safety half only, under the result, next to the existing save prompt.

### 3. Structured data

Add the six trust Q&As to the homepage `FAQPage` JSON-LD in `src/lib/home-jsonld.ts` so they match the visible text exactly, and add the same questions to `/faq` under a new "Trust & safety" group so the dedicated page stays the fullest version.

### 4. Verification

- Confirm via server-rendered HTML that all questions and answers appear without JavaScript.
- Run the existing JSON-LD and direct-answer CI checks so the new FAQ entries don't break the schema contracts.

## Technical notes

- New `src/components/trust-safety.tsx` with a `variant` prop (`full` | `compact` | `safety-only`).
- Copy lives in `src/lib/i18n.ts` alongside the existing FAQ keys so the other locales stay consistent; non-English locales fall back to the English trust copy until translated.
- No design-token, layout or business-logic changes — existing card/accordion styles only.
