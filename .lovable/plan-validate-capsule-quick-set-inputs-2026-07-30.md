# Validate capsule quick-set inputs

Today the quick-set control accepts any number you type. A count of `0` or a negative
strength quietly disables the "Use dose" button with no explanation, and an accidental
huge entry (e.g. typing an extra zero: 90 capsules, or 500000 mg per capsule) is applied
straight to the daily dose with no warning.

## What changes

**Rules enforced**
- Amount per capsule: must be greater than 0, at most 100,000 (in the field's unit).
- How many capsules: must be greater than 0, at most 60 per day, and at most 2 decimal
  places (halves and quarters are fine, 1.333 is not).
- Total daily dose: capped at 1,000,000 in the field's unit — beyond that the entry is
  almost certainly a typo.

**What you see**
- A short red message under the control naming the exact problem, e.g. "Enter how many
  you take (more than 0)" or "That's over 60 a day — check the number".
- The "Use dose" button stays disabled while an entry is invalid, and the offending field
  gets a red border plus a screen-reader-friendly invalid state.
- A soft warning (amber, non-blocking) when the entry is legal but unusual — more than 12
  capsules a day — so you can still apply it deliberately.
- Empty fields stay neutral: the existing hint text shows instead of an error until you
  start typing.

**Safety on apply**
- The dose is re-validated at the moment "Use dose" is pressed, so a value can never reach
  the daily dose field without passing the rules.
- Invalid or out-of-range strengths are no longer written to the remembered per-compound
  storage, and a previously remembered bad value is ignored on load.

## Technical notes

- `src/lib/capsule-dose.ts`: add a `validateCapsuleInput(input, unit)` function returning
  `{ ok, total, error?, warning? }` with the limits above (constants exported for tests).
  Keep `computeCapsuleDose` behaviour unchanged so existing callers and tests still pass.
- `src/components/capsule-quick-set.tsx`: drive button `disabled`, `aria-invalid`,
  `aria-describedby`, and the message area from the validation result; only persist
  strength to `localStorage` when valid; sanitise the restored value on mount.
- Tests: extend `src/lib/__tests__/capsule-dose.test.ts` for zero/negative/over-limit/
  too-many-decimals cases, and add a component test asserting the button is disabled and
  the error text renders for a zero count.
