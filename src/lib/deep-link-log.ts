/**
 * Hidden diagnostics for deep links / universal links.
 *
 * Records every URL the OS hands the app (cold-start launch URL, warm
 * `appUrlOpen`, or the current web location) together with the path we
 * resolved and whether it was actually handled in-app. Persisted so a cold
 * launch entry survives the navigation that follows it.
 *
 * Read by /debug/deep-link. Never rendered in the normal UI.
 */

import { deepLinkPath, isAppLinkPath } from "./deep-link";

export type DeepLinkSource = "launch" | "appUrlOpen" | "web";

export type DeepLinkEntry = {
  /** Epoch ms. */
  at: number;
  source: DeepLinkSource;
  /** Raw URL exactly as delivered by the OS / browser. */
  url: string;
  /** Path we resolved, or null when the URL isn't ours. */
  path: string | null;
  /** True when the link was routed inside the app. */
  handled: boolean;
  /** Human-readable reason when it wasn't handled. */
  reason?: string;
  /** true = https universal link, false = com.doseroutine.app:// scheme. */
  universal: boolean;
};

const STORAGE_KEY = "doseroutine.deep-link-log";
const MAX_ENTRIES = 25;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readDeepLinkLog(): DeepLinkEntry[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // A partial write from a previous crash can leave malformed entries here;
    // the debug screen reads .at/.path directly, so drop anything unusable.
    return parsed.filter((e): e is DeepLinkEntry => {
      if (!e || typeof e !== "object") return false;
      const entry = e as Partial<DeepLinkEntry>;
      return (
        typeof entry.at === "number" &&
        typeof entry.url === "string" &&
        typeof entry.source === "string" &&
        (entry.path === null || typeof entry.path === "string")
      );
    });
  } catch {
    return [];
  }
}

export function clearDeepLinkLog(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Classify a raw URL without recording it (pure — used by tests + UI). */
export function describeDeepLink(
  rawUrl: string,
  source: DeepLinkSource,
): Omit<DeepLinkEntry, "at" | "handled"> {
  const path = deepLinkPath(rawUrl);
  let universal = false;
  let pathname = "";
  try {
    const url = new URL(rawUrl);
    universal = url.protocol === "https:" || url.protocol === "http:";
    pathname = url.pathname;
  } catch {
    /* unparsable */
  }
  let reason: string | undefined;
  if (!path) {
    if (!universal && !rawUrl.startsWith("com.doseroutine")) reason = "Unparsable or unknown URL";
    else if (pathname && !isAppLinkPath(pathname.replace(/\/+$/, "") || "/"))
      reason = "Web-only path (server endpoint or machine-readable file) — stays in the browser";
    else reason = "Host is not doseroutine.com and scheme is not com.doseroutine.app";
  }
  return { source, url: rawUrl, path, reason, universal };
}

/** Record one opened URL. Returns the stored entry. */
export function recordDeepLink(
  rawUrl: string,
  source: DeepLinkSource,
  handled?: boolean,
): DeepLinkEntry {
  const described = describeDeepLink(rawUrl, source);
  const entry: DeepLinkEntry = {
    at: Date.now(),
    handled: handled ?? described.path !== null,
    ...described,
  };
  const store = storage();
  if (store) {
    try {
      const next = [entry, ...readDeepLinkLog()].slice(0, MAX_ENTRIES);
      store.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }
  return entry;
}
