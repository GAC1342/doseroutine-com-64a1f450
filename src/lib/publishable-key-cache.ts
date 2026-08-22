/**
 * Tiny persistent cache for *publishable* client config that we fetch from the
 * server at runtime (RevenueCat SDK keys, Sentry DSN).
 *
 * C1/C3 — those values used to require a successful network round-trip on every
 * cold start. On a flaky connection that meant in-app purchases silently never
 * initialized and crash reporting never started, which is exactly the state an
 * App Store reviewer is most likely to hit. Caching the last known-good value
 * makes the second and later launches work offline, and a build-time
 * `VITE_*` override lets release builds skip the network entirely.
 *
 * Only values that are safe to ship inside the app binary belong here — never
 * secret keys.
 */

const PREFIX = "dr-pubcfg:";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Last known-good value for `name`, or null. */
export function readCachedPublicConfig(name: string): string | null {
  const s = storage();
  if (!s) return null;
  try {
    const value = s.getItem(PREFIX + name);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Persist a freshly fetched value so the next cold start needs no network. */
export function writeCachedPublicConfig(name: string, value: string | null | undefined): void {
  const s = storage();
  if (!s || !value) return;
  try {
    s.setItem(PREFIX + name, value);
  } catch {
    /* private mode / quota — cache is best-effort */
  }
}

/**
 * Resolve publishable config with graceful degradation:
 *   1. build-time value (baked into the binary — always works offline)
 *   2. cached value from a previous successful fetch
 *   3. live fetch (and cache the result)
 */
export async function resolvePublicConfig(
  name: string,
  buildTimeValue: string | undefined,
  fetcher: () => Promise<string | null | undefined>,
): Promise<string | null> {
  if (buildTimeValue) return buildTimeValue;

  const cached = readCachedPublicConfig(name);
  if (cached) {
    // Refresh in the background so a rotated key is picked up next launch,
    // without ever blocking startup on the network.
    void (async () => {
      try {
        writeCachedPublicConfig(name, await fetcher());
      } catch {
        /* offline — keep using the cached value */
      }
    })();
    return cached;
  }

  try {
    const fresh = await fetcher();
    if (fresh) {
      writeCachedPublicConfig(name, fresh);
      return fresh;
    }
  } catch {
    /* fall through */
  }
  return null;
}
