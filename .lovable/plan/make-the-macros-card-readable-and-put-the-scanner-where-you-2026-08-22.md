# Make the Macros card readable and put the scanner where you look for it

## Answers to your three questions first

**1. The chart is not actually disagreeing with itself — but it reads like it is.**
I checked your real logged meals. This week you logged 654 kcal on Monday and 492 kcal on Thursday (that Thursday meal was logged at 11:28pm your time). 654 + 492 = 1,146 kcal, which is exactly what the weekly line says, and the two bars match those numbers.

The top row says 0 because it is **today's** total (Saturday, nothing logged yet) — but nothing on the card says the word "Today", so it looks like it is contradicting the week below it. On top of that the chart's left-hand numbers are cut off ("00" instead of "600"), which makes the whole thing look broken. Both are presentation bugs worth fixing.

**2. The scan button exists, but it is hiding.**
The Quick Add scanner is behind the round floating button in the bottom-right corner of the Today screen — and it is just a "+" icon, so it does not read as "scan food". Meanwhile the "Log a meal" link on the Macros card sends you to the old Food page flow instead of opening the new scanner, and the Food page still has its own separate camera/barcode buttons. Three doors to the same room, none of them obviously labelled "scan".

**3. Breakfast/Lunch/Dinner/Snack is already automatic.**
You do not pick it. The app looks at the clock when you open the scanner and pre-selects the slot (before 11am = breakfast, and so on), and the AI is told which slot it is. The chips are only there so you can override it when you eat dinner at 2am. It is worth keeping the categories — every nutrition app groups the day this way so you can see "I under-ate at breakfast, that's why I binged at night" — but the UI should make it obvious it was auto-detected rather than looking like a required choice.

## What I will change

### Macros card (fixes the "two different things" feeling)
- Label the top row **"Today"** with the date, so the 0 is clearly today and not the week.
- Fix the clipped chart axis so calorie numbers show in full.
- Highlight today's bar in the week chart so the 0 up top and the empty Saturday bar visibly line up.
- Show "0 of 7 days logged this week" alongside the weekly totals for context.

### One obvious way to scan
- Change the floating button on Today from a bare "+" to a **camera/scan icon with a "Scan" label**, so it reads as the food scanner.
- Make "Log a meal" on the Macros card open the Quick Add scanner directly instead of navigating to the Food page.
- Add the same scan entry point to the top of the Food page and to the day view, so wherever you are looking at food you can scan from there.
- Point the Food page's existing separate camera and barcode buttons at the same unified Quick Add sheet, so there is one scanning experience rather than two.

### Make the auto-categorisation visible
- In the Quick Add sheet, show the detected slot as **"Dinner - detected from the time, tap to change"** rather than four equal-looking buttons.
- Keep the manual override chips, just de-emphasised behind that line.

## Technical notes

- `src/components/macro-progress.tsx`: add the Today heading, fix `BarChart` margin/`YAxis` width clipping, use the already-computed `isSelected` flag to colour today's bar, and swap the `Link to="/food"` for a callback that opens the Quick Add sheet.
- `src/routes/_authenticated/today.tsx`: FAB icon/label change; pass a shared `openQuickAdd` handler down to `MacroProgress` and `TodayMealsCard`.
- `src/routes/_authenticated/food.tsx`: route the existing Camera and Barcode buttons into `QuickAddMealSheet` instead of the older inline estimate flow, keeping the manual-entry fallback.
- `src/components/quick-add-meal-sheet.tsx`: restyle the meal-type row to show `mealTypeForHour()`'s result as detected-with-override.
- No database or scanning-logic changes; totals, AI analysis and storage stay exactly as they are.
- Add tests covering the "Today" labelling, the highlighted current-day bar, and that every scan entry point opens the same sheet.
