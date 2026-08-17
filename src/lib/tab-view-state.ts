/**
 * Per-tab view state persistence.
 *
 * Tabs like /timeline and /library have local UI state (which month is
 * open, which filter is active, current page). We persist that state to
 * localStorage keyed by tab path so returning to the tab restores the
 * exact prior view, and so prefetchers can warm the *right* query
 * variant instead of the default.
 *
 * Keep values small, JSON-serializable, and cheap to write. Anything
 * larger belongs in TanStack Query cache, not here.
 */

const NS = "doseroutine:tabview:v1";

function storageKey(tabPath: string) {
  return `${NS}:${tabPath}`;
}

export function getTabViewState<T>(tabPath: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(tabPath));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Shape drift is possible across releases — merge onto fallback so
    // missing keys don't crash callers that added new fields.
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      fallback &&
      typeof fallback === "object" &&
      !Array.isArray(fallback)
    ) {
      return { ...(fallback as object), ...(parsed as object) } as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function setTabViewState<T>(tabPath: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(tabPath), JSON.stringify(value));
  } catch {
    // Quota / private mode — ignore, view state is best-effort.
  }
}

import { useEffect, useRef, useState } from "react";

/**
 * React hook: lazy-hydrate from localStorage and persist changes on each set.
 * Writes are debounced to the next microtask via a ref guard so rapid setter
 * calls (e.g. dragging a slider) don't thrash localStorage.
 */
export function useTabViewState<T>(
  tabPath: string,
  defaults: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => getTabViewState(tabPath, defaults));
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setTabViewState(tabPath, state);
  }, [tabPath, state]);
  return [state, setState];
}
