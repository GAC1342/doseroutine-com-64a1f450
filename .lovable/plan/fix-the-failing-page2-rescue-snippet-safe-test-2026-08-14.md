# Fix the failing page2-rescue snippet-safe test

## What's wrong

Running the suite shows exactly one failure, and it is deterministic (not flaky):

```text
FAIL  page-2 rescue entries > gaba is snippet-safe
AssertionError: expected 156 to be less than or equal to 155
```

The `gaba` entry's meta description is 156 characters — one character over the
155-character snippet-safe limit every other entry respects. All 40 other
assertions in the file pass.

Current text (156 chars):

> GABA is the brain's main inhibitory neurotransmitter, also sold as a calming supplement. What it does, whether oral GABA crosses into the brain, and safety.

## The fix

Shorten the `gaba` meta description so it fits comfortably under the limit
without losing meaning or keywords, for example (149 chars):

> GABA is the brain's main inhibitory neurotransmitter, also sold as a calming supplement. What it does, whether oral GABA reaches the brain, and safety.

This is a content-only edit — no layout, component, or schema changes. The
description still leads with the target query ("GABA supplement" intent), keeps
the same three promises, and stays long enough that Google won't pad it.

## Keeping it from recurring

The test itself is the guard, but it only fires if the file is run. Confirm
`page2-rescue.test.ts` is picked up by the standard `vitest run` used in CI so a
future over-length entry fails the build rather than shipping a truncated
snippet. No new tooling is added if it already runs there.

## Technical notes

- File: `src/lib/page2-rescue.ts`, `gaba.metaDescription`.
- Verify with `npx vitest run src/lib/page2-rescue.test.ts` — expect 41 passed.
- No change to `PAGE2_RESCUE` shape, so the lazy loader in
  `src/routes/library.$slug.tsx` and the rendered `/library/gaba` page are
  unaffected apart from the shorter `<meta name="description">`.
