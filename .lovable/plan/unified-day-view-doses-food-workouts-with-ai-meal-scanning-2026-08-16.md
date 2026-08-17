# Unified day view: doses + food + workouts, with AI meal scanning

## Short answer on feasibility

Very realistic, and the foundation is already there. The database already has a `meals` table with photo, estimated calories/protein/carbs/fat, *and* separate "adjusted" columns plus a `was_adjusted` flag — it was designed for exactly this scan-then-correct flow and is currently unused. The app already has an AI gateway, a camera/photo scanner screen, and a month calendar on Timeline. What's missing is the meal capture UI, the AI photo estimate, and wiring food + workouts into the calendar.

Accuracy expectation, honestly: AI photo calorie estimates land within roughly 15-25% for common, clearly visible plated food, and get worse with mixed dishes, sauces, and hidden oils. Every competitor has the same ceiling. The way to beat them is what you described — always show the estimate as editable, show a confidence level, let the user fix portion size fast, and prefer the scanned nutrition label (exact) over the photo guess whenever a barcode is present.

## 1. Fitness page opens on Workouts

The "Body metrics" menu entry currently forces the Body tab. Change it so that entry lands on the Workouts tab, with Body one tap away.

## 2. Meal scanning (the big feature)

Two capture paths, one review screen:

- **Photo path** — take or upload a photo of the meal. Sent to the AI model, which returns identified items, portion estimates, calories, protein, carbs, fat, and a confidence rating.
- **Barcode path** — reuse the existing scanner. When a packaged item is scanned, use the label's real nutrition panel and just ask for serving count. Exact numbers, no guessing.

Then a **review sheet before anything is saved**:

- Each detected item listed with its own macros, editable
- Portion adjuster (half / 1x / 1.5x / 2x, plus free entry) that rescales everything
- Editable totals for calories, protein, carbs, fat
- Meal label and which meal slot (breakfast/lunch/dinner/snack) and time
- A confidence badge with a plain-English note when the model is unsure
- Save writes the AI estimate *and* the user's corrections separately, so we can measure and improve accuracy over time

Entry points: a shortcut button on Today, and a "+" on the calendar day view.

## 3. Everything on one calendar day

Expand the Timeline calendar so a tapped day shows three grouped sections:

- **Doses** — taken, skipped, missed, pending (already built)
- **Food** — meals logged that day, with running calorie and protein totals
- **Training** — scheduled and completed workouts

Past days show what actually happened; today and future days show what's scheduled, so the same screen works as both a plan and a log. Day dots on the month grid gain small indicators for food and training, not just doses.

Scheduled workouts and meal times already exist in the app (the Fitness routine planner) but never reach the calendar — this connects them.

## 4. Suggested order

1. Fitness tab default (tiny)
2. Calendar day view showing doses + workouts together
3. Meal logging with manual entry and the review sheet
4. AI photo estimation feeding that same sheet
5. Barcode nutrition panel path
6. Daily nutrition totals and trends

Steps 1-3 are safe and quick. Step 4 is where the accuracy work lives and deserves its own round of testing with real photos.

## Technical notes

- New Lovable Cloud migration: nutrition targets per user, meal slot/type column on `meals`, and storage for meal photos in a private bucket with owner-scoped policies. `meals` already has the estimate/adjusted/`was_adjusted` columns needed.
- AI call goes through a server function using the existing gateway helper, with a strict structured-output schema (items array + per-item macros + confidence). Model choice: a multimodal Gemini vision model; image sent as a data URL from the client after downscaling to keep the request small and fast.
- The review sheet is a shared component used by the photo path, the barcode path, and manual entry, so all three save identically.
- Calendar day view reads doses, `meals`, and `workout_logs` for the selected date in parallel through authenticated server functions/queries; no change to existing dose logic.
- Everything stays inside the existing design tokens and mobile layout; no visual redesign.
