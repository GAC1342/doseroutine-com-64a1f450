# Fix the Plan feature: make it actually produce a plan and apply it

You were right on both counts. I smoke-tested it against your real stack and found two separate problems.

## What I found

**1. The plan is coming back empty — that's why the writeup is thin.**

Your most recent saved plan ("Focus & cognition") has a summary sentence and **zero schedule blocks**. I ran the live AI call with your 13 active compounds and saw exactly why: the AI returns blocks labelled `Morning` / `Midday` with a `compounds` list, but our validator only accepts lowercase `morning` and a field named `items`. When one block fails, the current code throws away **the entire schedule silently** and saves just the summary. So the page renders a paragraph and nothing else. Every goal hits this, not just one.

**2. The plan never touches your Stack or Calendar — by design, today.**

The generated plan is saved to its own `plans` table and read only by the Plan page. Today, Stack, and Timeline all read the times you set on each compound (`times_of_day`). Nothing ever writes the plan's timing back. So "sequence your stack" currently means "show you a suggested sequence on this one page" — your actual schedule is untouched. That matches exactly what you observed.

## The fix

### A. Make the generator reliable
- Spell out the exact block/item field names and the five allowed time slots in the request to the AI, instead of the vague "blocks: array" it gets now.
- Add a tolerant normaliser: lowercase time labels, accept `compounds`/`supplements` as aliases for `items`, map near-miss slots (`pre-workout`, `night`, `am`/`pm`) onto the five real slots, and accept `reason` as the block explanation.
- Stop the all-or-nothing wipe: drop only the individual block that can't be repaired, keep the rest.
- If the result still has zero blocks, retry once, then show a real error instead of saving a hollow plan. No more silent empty plans.

### B. Actually apply the plan to your stack
- Add an **Apply this schedule to my stack** button on the Plan page. It rewrites each compound's times to match the plan's blocks, so Today, Stack, and Timeline immediately reflect it.
- Before writing, it snapshots your current times so nothing is lost.
- Show a clear preview line per compound ("Quercetin: 12:00, 18:00 -> 08:00") so you see what will change before confirming.
- Compounds the plan didn't place are left exactly as they are.

### C. Undo / reset
- An **Undo — restore my previous schedule** button appears after applying, and stays available so you can back out later.
- A **Reset to my original times** option restores the snapshot taken before the very first apply, so trying several goals can never strand you in a schedule you don't like.

### D. Verify all six goals
- Run each goal (energy, sleep, recovery, focus, longevity, GLP-1) against a realistic stack and assert every one returns a real multi-block schedule with your compounds placed and doses preserved for controlled items.
- Add a regression test covering the exact malformed AI shape I captured today, so this failure mode can't come back silently.

## Technical notes

- `src/lib/generate-plan.functions.ts`: replace `blocks: z.array(...).catch([])` with per-block normalise-then-filter; tighten `output_schema` in the prompt; add one retry and a hard error on empty output.
- New server function `applyPlanToStack` / `revertPlanApply` writing `user_compounds.times_of_day`, plus a migration adding a `plan_schedule_snapshots` table (user_id, snapshot_json, created_at, kind) with RLS scoped to `auth.uid()` and the required GRANTs.
- `src/routes/_authenticated/plan.tsx`: apply/undo/reset UI, change preview, and invalidation of the today/stack/timeline query keys after a write.
- Tests: extend the plan test suite with the malformed-payload case and a six-goal live smoke script.
