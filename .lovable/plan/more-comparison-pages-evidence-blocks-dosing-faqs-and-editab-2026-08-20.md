# More comparison pages, evidence blocks, dosing FAQs, and editable legacy items

## 1. New `/vs/` competitor pages

Already live: peptide-tracker, optipin, medisafe, mytherapy, round-health, cronometer, pill-reminder, supplement-planner.

Add four more, matching the existing page template (hero, honest comparison table, "who each is for", FAQ, CTA, unique head metadata + JSON-LD):

- `/vs/bearable` — symptom & habit tracking crowd
- `/vs/dosecast` — medication reminders
- `/vs/myfitnesspal` — nutrition-first users who also log supplements
- `/vs/spreadsheet` — the biggest real competitor: manual Google Sheets/Notes tracking

Each page gets: comparison table, migration section, links to the `/best-dose-tracking-apps` roundup, and reciprocal links added back from the roundup and `/vs` index. Sitemap updated.

## 2. "References & Evidence" block on dosing sections

Compound pages currently show small inline citation markers only. Add a visible, labelled evidence block directly under the dosing/timing content on `/library/<slug>`:

- Title "References & Evidence", listing the numbered sources that back that section (publisher, title, year when known, outbound link with `rel="nofollow noopener"` where appropriate).
- Sources come only from the page's already-resolved authoritative sources (PubChem, DailyMed, MedlinePlus, PubMed, NIH ODS) — nothing invented; if no matching source exists, the block is omitted rather than filled with a weak match.
- Reuses the existing section-citation mapping so it stays consistent with the inline markers.

## 3. Dosing-schedule FAQ per compound

Extend the compound FAQ generator with a dedicated dosing-schedule group (2–4 questions), derived from data actually on the page — half-life, timing/with-food notes, frequency, missed-dose handling — plus a link to the roundup and the most relevant `/vs/` page. These flow into the existing single FAQPage JSON-LD block (no duplicate FAQPage emissions) and into the on-page accordion.

## 4. Legacy custom stack items become editable

Root cause found: the Add/Edit sheet only works when a library compound is selected. Legacy rows created with `custom_name`/`custom_category` and no `compound_id` fail the save gate, and the save payload wipes custom fields — so edit and some actions silently do nothing.

Fix:
- The edit sheet recognises a custom item and shows an editable name + category field instead of the library picker.
- Saving a custom item preserves `custom_name`/`custom_category` and leaves `compound_id` null; saving a library item behaves exactly as today.
- Optional "link to library compound" action so a legacy item can be upgraded to a full profile.
- Delete/toggle paths verified for custom rows.

## Technical notes

- Files: new `src/routes/vs.*.tsx` pages; `src/routes/vs.index.tsx` and `src/routes/best-dose-tracking-apps.tsx` link updates; sitemap generator.
- `src/routes/library.$slug.tsx` + `src/lib/section-citations.ts` for the evidence block; `src/lib/faq-schema.ts` for dosing FAQs.
- `src/routes/_authenticated/stack.tsx` (`AddEditSheet`) for custom-item editing.
- Verification: run existing FAQ/JSON-LD and head-budget tests, add cases for the dosing FAQ group and custom-item save path.
