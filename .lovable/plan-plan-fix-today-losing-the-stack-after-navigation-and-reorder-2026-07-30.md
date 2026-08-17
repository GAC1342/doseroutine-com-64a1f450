# Plan: Fix Today losing the stack after navigation and reorder Stack page

## What I will fix

1. **Today page stops going blank after navigation**
   - The `/today` tab prefetch currently writes `null` into the same cache key the real Today page uses.
   - Because that `null` result is treated as fresh for 30 seconds, returning to Today can show “Nothing scheduled today” even when your stack/scheduled doses exist.
   - I will remove that bad same-key prefetch or replace it with a real Today-data prefetch so navigation cannot overwrite the Today screen with empty data.

2. **Today keeps showing the last good schedule while refreshing**
   - Keep the current “last good data” behavior, but make sure an empty/null cache from navigation does not count as valid Today data.
   - If the app is refreshing, Today should continue showing the previous stack/doses instead of flashing empty.

3. **Stack page order gets corrected**
   - Move the actual stack list above the prescription cross-checker section.
   - Keep the high-level caution banner near the top if needed, but the full cross-checker details should sit below the stack list because `/stack` should first show the user’s stack.

4. **Verify the exact flow**
   - Test the sequence: open Today with scheduled stack items, navigate to Stack/Safety/More, then return to Today.
   - Confirm Today still shows the scheduled stack/doses and no longer falls back to “Nothing scheduled today.”
   - Confirm Stack shows the stack list before the cross-checker.

## Technical details

- Files expected to change:
  - `src/lib/tab-prefetch.ts`
  - `src/routes/_authenticated/today.tsx` if needed for cache guards
  - `src/routes/_authenticated/stack.tsx`
- The main confirmed issue is in `src/lib/tab-prefetch.ts`: `/today` prefetch uses `queryKey: ["today-page"]` but its query returns `null`, which can poison the Today page cache.
- I will avoid changing database schema or backend rules for this fix unless verification proves the data itself is missing.
