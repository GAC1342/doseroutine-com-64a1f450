/**
 * Offline-first nutrition cache (browser).
 *
 * Barcode lookups depend on two networks we don't control (Open Food Facts and
 * USDA). Both are occasionally slow or down, and a phone in a supermarket
 * basement often has no usable signal at all. Everything we ever resolved is
 * therefore mirrored into IndexedDB, keyed by the canonical 14-digit GTIN, so
 * a repeat scan answers instantly and a network failure degrades to "here's
 * the copy we saved on <date>" instead of "not found".
 *
 * Strategy: stale-while-revalidate. Fresh entries are served immediately and
 * not refetched; stale ones are served immediately AND refreshed in the
 * background; missing ones wait for the network.
 */
import { canonicalGtin } from "@/lib/gtin";

/** Anything the panel lookup returns; kept loose so the cache never fights types. */
export type CachedPanel = {
  found: boolean;
  name: string;
  brand: string | null;
  servingSize: string | null;
  perServing: unknown;
  basis: "serving" | "100g" | null;
  sourceUrl: string;
};

export type CacheEntry<T = CachedPanel> = {
  /** Canonical 14-digit GTIN. */
  key: string;
  /** The exact digits the user scanned or typed. */
  scanned: string;
  panel: T;
  /** Which source answered, for the "where did this come from" line. */
  source: string;
  savedAt: number;
  /** Bumped on every read so pruning can evict the least useful entries. */
  lastUsedAt: number;
  hits: number;
};

const DB_NAME = "doseroutine-nutrition";
const DB_VERSION = 1;
const STORE = "panels";
const META = "meta";

/** Entries older than this are refreshed in the background when online. */
export const CACHE_FRESH_MS = 14 * 24 * 60 * 60 * 1000;
/** Beyond this we still show the copy offline, but flag it as old. */
export const CACHE_STALE_MS = 180 * 24 * 60 * 60 * 1000;
/** A generous ceiling — panels are ~1 KB, so this is a few MB at most. */
export const CACHE_MAX_ENTRIES = 8000;

function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!idbAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let settled = false;
    const done = (value: IDBDatabase | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "key" });
          store.createIndex("lastUsedAt", "lastUsedAt");
          store.createIndex("savedAt", "savedAt");
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: "key" });
        }
      };
      req.onsuccess = () => done(req.result);
      req.onerror = () => done(null);
      req.onblocked = () => done(null);
      // Private-mode Safari can hang the open request outright.
      setTimeout(() => done(null), 2500);
    } catch {
      done(null);
    }
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const transaction = db.transaction(STORE, mode);
          const request = run(transaction.objectStore(STORE));
          request.onsuccess = () => resolve(request.result as T);
          request.onerror = () => resolve(null);
          transaction.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export type CacheFreshness = "fresh" | "stale" | "expired";

export function freshnessOf(entry: CacheEntry, now = Date.now()): CacheFreshness {
  const age = now - entry.savedAt;
  if (age <= CACHE_FRESH_MS) return "fresh";
  if (age <= CACHE_STALE_MS) return "stale";
  return "expired";
}

/** Read a cached panel for any padding variant of a barcode. */
export async function getCachedPanel(barcode: string): Promise<CacheEntry | null> {
  const key = canonicalGtin(barcode);
  if (!key) return null;
  const entry = (await tx<CacheEntry>("readonly", (store) => store.get(key))) as CacheEntry | null;
  if (!entry) return null;
  // Touch asynchronously; a read must never wait on a write.
  void tx("readwrite", (store) =>
    store.put({ ...entry, lastUsedAt: Date.now(), hits: (entry.hits ?? 0) + 1 }),
  );
  return entry;
}

/** Write (or refresh) a panel. Only successful lookups are worth keeping. */
export async function putCachedPanel(
  barcode: string,
  panel: CachedPanel,
  source: string,
): Promise<void> {
  const key = canonicalGtin(barcode);
  if (!key || !panel?.found) return;
  const now = Date.now();
  await tx("readwrite", (store) =>
    store.put({
      key,
      scanned: barcode,
      panel,
      source,
      savedAt: now,
      lastUsedAt: now,
      hits: 1,
    } satisfies CacheEntry),
  );
  void pruneCache();
}

/** Newest-first list, used by the scan history screen and diagnostics. */
export async function listCachedPanels(limit = 50): Promise<CacheEntry[]> {
  const all = (await tx<CacheEntry[]>("readonly", (store) => store.getAll())) ?? [];
  return [...all].sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(0, limit);
}

export async function cacheStats(): Promise<{ entries: number; oldest: number | null }> {
  const all = (await tx<CacheEntry[]>("readonly", (store) => store.getAll())) ?? [];
  return {
    entries: all.length,
    oldest: all.length ? Math.min(...all.map((e) => e.savedAt)) : null,
  };
}

/** Drop expired entries, then the least recently used ones over the ceiling. */
export async function pruneCache(): Promise<number> {
  const all = (await tx<CacheEntry[]>("readonly", (store) => store.getAll())) ?? [];
  if (all.length === 0) return 0;
  const now = Date.now();
  const doomed = all.filter((entry) => freshnessOf(entry, now) === "expired");
  const keepers = all.filter((entry) => freshnessOf(entry, now) !== "expired");
  if (keepers.length > CACHE_MAX_ENTRIES) {
    doomed.push(
      ...[...keepers]
        .sort((a, b) => a.lastUsedAt - b.lastUsedAt)
        .slice(0, keepers.length - CACHE_MAX_ENTRIES),
    );
  }
  for (const entry of doomed) {
    await tx("readwrite", (store) => store.delete(entry.key));
  }
  return doomed.length;
}

export async function clearNutritionCache(): Promise<void> {
  await tx("readwrite", (store) => store.clear());
}

/**
 * Pre-load a batch of panels (e.g. the user's most-logged products) so they
 * are available before the next trip to the shop.
 */
export async function warmCache(
  entries: Array<{ barcode: string; panel: CachedPanel; source: string }>,
): Promise<void> {
  for (const entry of entries) {
    await putCachedPanel(entry.barcode, entry.panel, entry.source);
  }
}
