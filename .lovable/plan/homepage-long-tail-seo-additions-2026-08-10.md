# Homepage Long-Tail SEO Additions

## Overview
Implement the long-tail SEO recommendations from the uploaded PDF on the DoseRoutine homepage. Keep all existing conversion copy intact; only add crawlable, helpful content and schema.

## What we will build

### 1. "Common protocols people track" link section
Add a new section on `/` after the "Built for the full protocol" block and before the "Fitness & Body" block.

- Heading: "Common protocols people track"
- Layout: 3 columns on desktop, 1 column on mobile, 3–4 short linked phrases per group
- Each phrase is a plain-text `<Link>` to an existing calculator, library guide, or compare page — no new pages
- Groups and target links:
  - **Peptides**
    - BPC-157 dosage and reconstitution → `/library/bpc-157` (or existing guide)
    - Semaglutide vs tirzepatide dosing → `/library/compare/semaglutide-vs-tirzepatide`
    - CJC-1295 / Ipamorelin stacking → `/library/cjc-1295-ipamorelin`
    - Peptide reconstitution calculator → `/reconstitution-calculator`
  - **Hormones / TRT**
    - TRT dosage calculator → `/calculators/trt-dosage` (or closest existing calculator slug)
    - Injection site rotation tracker → `/injection-sites` (or existing route)
    - Testosterone cycle and PCT tracker → `/library/testosterone-support`
    - HRT interaction checker → `/interaction-checker`
  - **Supplements & recovery**
    - Magnesium and thyroid interaction check → `/interaction-checker`
    - NAD+ dosing schedule → `/library/nad`
    - Rapamycin tracking app → `/library/rapamycin`
    - Vitamin D3 interaction checker → `/interaction-checker`
- Verify every link resolves to a live route before merging; fall back to `/library` if a specific page is missing.

### 2. Expand homepage FAQ block and schema
Extend the existing FAQPage JSON-LD in `src/routes/index.tsx` from 2 questions to 6–8 questions.

- Add the long-tail questions from the PDF:
  1. What’s the best app for tracking peptide and TRT protocols together?
  2. How do I calculate peptide reconstitution and BAC water ratios?
  3. Can I check interactions between supplements, peptides, and hormones in one place?
  4. Is there an app that tracks TRT injection sites automatically?
  5. How do I track GLP-1 doses alongside other supplements?
- Keep answers to 40–60 words, plain language, and aligned with the existing tone.
- Add corresponding visible FAQ markup below the value-props section and above the final "Create your free account" block.
- Ensure the FAQPage JSON-LD matches the visible questions exactly.

### 3. Meta description test
Update the homepage `description` meta/OG/Twitter to front-load a long-tail phrase:

- New: "Track peptides, TRT, and supplements in one app — reconstitution calculator, dose reminders, and 475+ interaction checks. Free to start."
- Keep the title unchanged because it already ranks for brand terms.
- Verify length stays under 155 characters.

### 4. Image alt-text / filename guard
No new images are required for this change. Add a one-time note in the plan that any future homepage images should use descriptive filenames and alt text (e.g. `bpc-157-reconstitution-calculator.png` with alt `"BPC-157 reconstitution calculator screenshot"`).

### 5. Post-deploy checks
- Re-validate FAQ schema with the Rich Results Test after merge.
- Request re-indexing of `/` in Google Search Console.
- Revisit rankings in 4–6 weeks.

## What we will NOT do
- Change hero copy or existing feature CTAs.
- Create thin doorway pages.
- Keyword-stuff headings or paragraphs.
- Duplicate FAQ answers verbatim on other pages.

## Files likely to change
- `src/routes/index.tsx` — new section, expanded FAQ/schema, updated meta description
- Possibly `src/lib/i18n.ts` or translation files if FAQ copy is localized

## Success criteria
- Lighthouse/SEO audit passes with no regressions.
- All internal links in the new section resolve (200).
- FAQPage schema validates and contains 6–8 questions.
- Meta description is ≤155 characters and contains the long-tail phrase.
