# Homepage refresh: lead with the food scanner

Goal: make the AI meal scanner (calories, protein, carbs) a headline selling point on the homepage, refresh the dated sections, soften copy that reads badly, drop the "coming soon" app-store framing, and push the result to GitHub.

## 1. Food scanner on the homepage

Today the homepage never mentions food, calories or macros — the scanner is only visible after login. Add a dedicated, high-placement section:

- New "Scan your meal" block placed right after the hero (above the current protocol/differentiator strip) with a short benefit headline, three steps (snap or scan barcode → AI returns calories/protein/carbs/fat → edit and save), and a "Start free" CTA.
- Add a macro/food bullet to the hero feature list and a nutrition line to the hero sub-copy so it is visible before any scrolling.
- Add "AI meal scanner", "Barcode + photo food logging" and "Daily calorie & macro goals" entries to the Pro features grid.
- Add a food/macros FAQ entry to the homepage FAQ (helps search and AI answers).

## 2. Make it sellable

Copy leads with the outcome ("Photograph your plate, get calories and macros in seconds — logged next to your protocol and training"), highlights that it works from a photo *or* a barcode, that every value is editable before saving, and that food, workouts and doses land on one timeline — the thing no other tracker does.

## 3. Comparisons refreshed

- `/vs/cronometer` currently states DoseRoutine has no food tracking and no barcode food scanner. Correct those rows and the surrounding copy to reflect photo + barcode meal scanning and macro tracking, while keeping the honest distinction (Cronometer goes deeper on micronutrients).
- Update the comparison hub (`/vs`) and `/alternatives` blurbs to mention meal scanning.
- Add a food/macros row to the homepage-facing comparison links so people can find it.

## 4. Verification

- Read the scanner path end to end (photo/barcode capture → `scanMealInput` server function → review sheet → save to the meals table → day timeline totals) and confirm nothing is broken.
- Run the existing meal recalculation tests plus a typecheck.
- Drive the live preview with a browser check: open the food screen, confirm the capture button, review sheet and save flow render and totals update.

## 5. "What shipped this week"

Replace the three stale cards (session context, workout reminders, safety filters) with the current shipments: AI meal scanner with photo + barcode, unified food/workout day timeline, and the instruction manual with cross-device bookmarks.

## 6. "How DoseRoutine works"

Rework the three steps so nutrition is part of the story: 1) add what you take, 2) log meals, workouts and doses in one tap, 3) get reminders and see what's actually changing. Updated across all 12 locales.

## 7. Softer trust heading

"Built for the people who actually track this stuff" reads as dismissive. Replace with something warmer (e.g. "Built for people who want to stay on top of their routine") in English and all 11 other locales.

## 8. About DoseRoutine

Update the sitewide About block and `/about` so the description includes meal scanning and macro tracking alongside supplements, peptides and hormones.

## 9. Remove "coming soon" app-store framing

Drop the "iPhone and Android apps are coming soon" line and the footer "App Store & Google Play coming soon" text. The strip becomes an install/add-to-home-screen prompt with the Google Play tester link retained.

## 10. Push to GitHub

Re-push the updated tree to `GAC1342/doseroutine-com-64a1f450` on `main` using the same GitHub API sync used previously.

## Technical notes

- Files: `src/routes/index.tsx`, `src/lib/i18n.ts` (12 locales), `src/components/about-doseroutine-block.tsx`, `src/routes/about.tsx`, `src/routes/vs.cronometer.tsx`, `src/routes/vs.index.tsx`, `src/routes/alternatives.tsx`.
- No design-token or layout-system changes; new section reuses existing `Card`, spacing and coral/teal tokens.
- Homepage JSON-LD FAQ entries stay in sync with the visible FAQ additions.
