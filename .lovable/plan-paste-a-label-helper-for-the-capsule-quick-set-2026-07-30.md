# Paste-a-label helper for the capsule quick-set

Add an optional "Paste label" box to the quick-set control. You paste the Supplement
Facts text (or just type something like "1 g per serving, 2 softgels"), and the form
fills in the amount per capsule, the number of capsules, and the daily total.

## What it looks like

- A small "Paste label" toggle inside the existing Quick-set panel. Closed by default,
  so nothing changes for people who just type two numbers.
- Opening it shows a multi-line paste box plus a "Read label" button.
- After reading, a plain-English confirmation appears: "Found 1,000 mg per soft gel,
  2 per serving = 2,000 mg daily" with "Use this" and "Clear" buttons. Nothing is
  written into the dose fields until you press "Use this".
- If nothing recognisable is found, an amber note explains what to check ("Couldn't
  find an amount — look for a line like '1,000 mg per softgel'") and the fields are
  left alone.

## What it understands

Common label wordings, read locally (instant, no AI, works offline):

- "Omega-3 1,000 mg per softgel" / "1000mg per capsule" / "Each capsule contains 500 mg"
- "Serving size: 2 softgels" / "2 capsules per serving" / "Take 3 tablets daily"
- Per-serving totals: "1 g per serving" with "Serving size 2 capsules" -> 500 mg per
  capsule, 2 capsules, 1,000 mg daily
- Number formats with commas and decimals ("1,000", "2.5")
- Units mg, mcg, µg, g, IU, ml — grams and micrograms are converted, and the form's
  unit dropdown switches to the converted unit automatically (per your choice).

Everything it produces is run through the validation rules already in place, so a label
that reads as an absurd amount is rejected with the same clear message rather than
filling the dose field.

## Technical notes

- New `src/lib/label-parse.ts`: `parseSupplementLabel(text)` returns
  `{ strengthPerUnit, unit, countPerServing, totalPerServing, noun, confidence }` or
  `null`. Pure regex/pattern matching, no network call. Also exports `convertDose(value,
  from, to)` for g/mcg/mg normalisation across the app's units (`mg`, `mcg`, `iu`, `g`,
  `ml`); IU and ml are never converted between families.
- Precedence: an explicit per-capsule amount wins; otherwise per-serving total divided by
  serving-size count. Text is capped at 4,000 characters and only the first match of each
  pattern is used.
- `src/components/capsule-quick-set.tsx`: add the collapsible paste area and preview
  state; on "Use this" set strength/count, then call the existing apply path so
  `validateCapsuleInput` still gates the result. New optional `onUnitChange?: (unit:
  string) => void` prop, called only when the parsed unit differs from the current one.
- `src/routes/_authenticated/stack.tsx`: pass `onUnitChange={setUnit}` to
  `CapsuleQuickSet` so the dropdown follows the label.
- Tests: `src/lib/__tests__/label-parse.test.ts` covering the wordings above, comma/
  decimal numbers, g→mg and mcg→mg conversion, per-serving division, and unparseable
  text; extend the component test to cover paste → preview → apply and the
  no-match message.
