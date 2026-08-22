/**
 * Meal photo thumbnail cache.
 *
 * The meal-photos bucket is private, so every thumbnail needs a signed URL.
 * Signing one URL per row on every render of the Today card meant a burst of
 * storage round-trips each time the screen opened, and the images themselves
 * were re-fetched cold. This module:
 *
 *  - signs paths in a single batch request instead of one call per photo,
 *  - remembers signed URLs (memory + localStorage) until shortly before they
 *    expire, so re-opening Today reuses them with no network call,
 *  - warms the browser image cache for today's photos ahead of render.
 *
 * Signed URLs are scoped to the signed-in user's own photos and expire, but
 * they are still capability URLs — the cache is cleared on sign-out via
 * `clearMealThumbCache()`.
 */

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "meal-photos";
const SIGNED_TTL_SECONDS = 3600;
/** Retire an entry early so a URL never expires mid-render. */
const SAFETY_WINDOW_MS = 5 * 60_000;
const STORAGE_KEY = "doseroutine:mealthumbs:v1";
const MAX_ENTRIES = 120;

type Entry = { url: string; expiresAt: number };

const memory = new Map<string, Entry>();
/** In-flight signing requests, so N rows mounting at once make one call. */
const inflight = new Map<string, Promise<string | null>>();
let hydrated = false;

function now() {
  return Date.now();
}

function isFresh(entry: Entry | undefined): entry is Entry {
  return !!entry && entry.expiresAt - SAFETY_WINDOW_MS > now();
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    for (const [path, entry] of Object.entries(parsed)) {
      if (isFresh(entry)) memory.set(path, entry);
    }
  } catch {
    // Corrupt or unavailable storage — start from an empty cache.
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    const entries = [...memory.entries()]
      .filter(([, e]) => isFresh(e))
      .slice(-MAX_ENTRIES)
      .reduce<Record<string, Entry>>((acc, [path, entry]) => {
        acc[path] = entry;
        return acc;
      }, {});
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota / private mode — the in-memory cache still helps this session.
  }
}

function remember(path: string, url: string): void {
  memory.set(path, { url, expiresAt: now() + SIGNED_TTL_SECONDS * 1000 });
  persist();
}

/** A cached URL for this path, or null when nothing usable is cached. */
export function cachedMealThumbUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  hydrate();
  const entry = memory.get(path);
  return isFresh(entry) ? entry.url : null;
}

/** Sign a batch of paths in one request, skipping anything already cached. */
async function signMissing(paths: string[]): Promise<void> {
  const wanted = [...new Set(paths.filter(Boolean))].filter(
    (p) => !isFresh(memory.get(p)) && !inflight.has(p),
  );
  if (wanted.length === 0) return;

  const pending = (async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(wanted, SIGNED_TTL_SECONDS);
    if (error || !data) return;
    for (const row of data) {
      if (row.path && row.signedUrl) remember(row.path, row.signedUrl);
    }
  })();

  for (const p of wanted) {
    inflight.set(
      p,
      pending.then(() => cachedMealThumbUrl(p)),
    );
  }
  try {
    await pending;
  } finally {
    for (const p of wanted) inflight.delete(p);
  }
}

/** Signed URL for one photo, served from cache whenever possible. */
export async function mealThumbUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  hydrate();
  const cached = cachedMealThumbUrl(path);
  if (cached) return cached;
  const pending = inflight.get(path);
  if (pending) return pending;
  await signMissing([path]);
  return cachedMealThumbUrl(path);
}

/** Warm the browser's image cache so a later render paints instantly. */
function warmImage(url: string): void {
  if (typeof window === "undefined" || typeof Image === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

/**
 * Sign and pre-download today's thumbnails in one pass. Safe to call on every
 * render of the list: cached paths cost nothing.
 */
export async function prefetchMealThumbs(paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => typeof p === "string" && p.length > 0);
  if (list.length === 0) return;
  await signMissing(list);
  for (const path of list) {
    const url = cachedMealThumbUrl(path);
    if (url) warmImage(url);
  }
}

/** Drop every cached capability URL (called on sign-out). */
export function clearMealThumbCache(): void {
  memory.clear();
  inflight.clear();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing more we can do; the in-memory cache is already gone.
  }
}
