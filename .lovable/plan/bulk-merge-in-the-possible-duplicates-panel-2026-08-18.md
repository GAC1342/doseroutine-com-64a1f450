# Bulk merge in the Possible duplicates panel

Today the duplicates panel lists one pair per row with a single "Merge" button, so clearing a long list means clicking through them one at a time. This adds selection and bulk merging.

## What you'll get

- A checkbox on every duplicate row, plus a "Select all" checkbox in the panel header showing how many are selected.
- A "Merge selected (N)" button that appears once at least one row is checked.
- A confirmation dialog listing what will be merged (keep name ← duplicate name) before anything happens.
- Progress while it runs ("Merging 3 of 12…"), the button disabled during the run, and a summary at the end: how many merged, how many were skipped and why.
- Rows that merged successfully disappear; anything that failed stays checked so you can retry.
- Every merge still lands in the audit history below, so each one can be undone individually exactly as today.

## Safety rules

- If two selected pairs touch the same food (for example, three near-identical entries chained together), only the first is merged in that pass and the others are reported as "skipped — will re-appear on next scan". A fresh scan then shows the updated pairing. This avoids merging into a record that was just removed.
- Merges run one at a time, not in parallel, so the catalog stays consistent and the audit log stays ordered.
- Selection is cleared after a successful run and after a re-scan.

## Technical notes

- File: `src/routes/_authenticated/admin/food-catalog.tsx` (duplicates section around lines 810–875).
- New local state: `selectedDupes: Set<string>` keyed by `${keep.id}-${duplicate.id}`, plus `bulkProgress: { done: number; total: number } | null`.
- Reuse the existing `adminMergeFoods` server function via the current `mergeFoodsFn` — no new server function and no schema change. Loop sequentially with `await`, tracking a `Set` of already-touched food ids to enforce the overlap rule.
- Use the existing `AlertDialog` and `Checkbox` shadcn components already imported/available in the admin area; results reported through `sonner` toast like the current single merge.
- Invalidate `["admin-food-duplicates"]` and the food list/audit queries once at the end of the batch rather than per merge.
