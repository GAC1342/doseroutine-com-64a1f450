# Meal photo cleanup: 30-day auto-expiry with zip download

Meal photos are only needed to capture the macros at the moment you log a meal. After that they just pile up in storage. This adds a 30-day life span for the image itself — the calories, protein, carbs, fat and every log entry stay forever.

## What you'll see

**On the Food page**
- A small "Photo storage" card: how many photos you have, roughly how much space, and how many expire in the next 7 days.
- "Download all as zip" — saves the expiring photos (or all photos) to your device in one file, named by date and meal so they're easy to find later.
- "Clean up now" — optional manual sweep if you want the space back early.

**Heads-up banner**
- Starting 7 days before a batch expires, a dismissible banner appears on Food and Today: "12 meal photos are removed in 5 days. Save them first?" with the download button right there.

**On old meals**
- Once a photo is gone, the meal row still shows its full macros with a small "photo removed after 30 days" label instead of a broken image.

## How the cleanup runs

A weekly automatic sweep deletes photos attached to meals logged more than 30 days ago, then clears the photo reference on those meals. Nothing else about the meal is touched. Because you get a full week of warning plus a one-tap zip download, nothing disappears without a chance to keep it.

## Technical notes

- New `meal_photo_settings` (or profile columns) is not needed; retention is a fixed 30-day constant in `src/lib/meal-photo-retention.ts` so the UI and the sweeper agree on the same cutoff.
- Server route `src/routes/api/public/hooks/meal-photo-cleanup.ts`: authenticated with the anon `apikey` header, uses the admin client loaded inside the handler to list `meals` with `storage_path IS NOT NULL AND logged_at < now() - interval '30 days'`, calls `storage.from('meal-photos').remove(paths)` in batches, then sets `storage_path = null, photo_url = null` on those rows.
- `pg_cron` + `pg_net` job `meal-photo-cleanup`, weekly (Sundays 03:00 UTC), posting to that route.
- New server fn `getMealPhotoStorageSummary` (`requireSupabaseAuth`) returns counts, approximate bytes, and the next expiry date for the signed-in user.
- Zip download is client-side: signed URLs for the selected photos, fetched and zipped with a small zip helper, then saved via a blob link. Batched so a large export doesn't stall the tab.
- New component `src/components/meal-photo-storage-card.tsx` plus an expiry banner reused on `food.tsx` and the Today view; both read from the same summary query.
- Meal rows render the "photo removed" placeholder whenever `storage_path` is null but the meal has AI items.
- Tests: cutoff math and batching in `src/lib/__tests__/meal-photo-retention.test.ts`; a route test asserting the cleanup only touches rows past the cutoff and never clears macros.
