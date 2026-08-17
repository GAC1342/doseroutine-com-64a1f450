import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "doseroutine:interaction-acks:v1";
const LEGACY_KEY = "sw:interaction-acks:v1";
const CHANGE_EVENT = "doseroutine:interaction-acks";

type AckRecord = {
  ackedAt: string; // ISO timestamp
};

type AckMap = Record<string, AckRecord>;

function readAll(): AckMap {
  if (typeof window === "undefined") return {};
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // One-time migration from legacy "sw:" key.
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        window.localStorage.setItem(STORAGE_KEY, legacy);
        window.localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as AckMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: AckMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {}
}

/** Stable signature for an unordered pair + severity. Slug pair guards against
 *  a rule being edited to a lower severity later — old ack no longer applies. */
export function ackKey(a: string, b: string, severity: string): string {
  const [x, y] = [a, b].sort();
  return `${x}|${y}|${severity}`;
}

function subscribe(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useInteractionAcks() {
  const map = useSyncExternalStore(
    subscribe,
    () => {
      // Return a snapshot string so React can detect changes cheaply.
      return typeof window !== "undefined" ? (window.localStorage.getItem(STORAGE_KEY) ?? "") : "";
    },
    () => "",
  );

  // Parse only when snapshot changes.
  const parsed = (() => {
    try {
      return map ? (JSON.parse(map) as AckMap) : {};
    } catch {
      return {} as AckMap;
    }
  })();

  const isAcked = useCallback(
    (key: string) => Boolean(parsed[key]),
    [map], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const ackedAt = useCallback(
    (key: string) => parsed[key]?.ackedAt,
    [map], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const acknowledge = useCallback((key: string) => {
    const next = { ...readAll(), [key]: { ackedAt: new Date().toISOString() } };
    writeAll(next);
  }, []);
  const unacknowledge = useCallback((key: string) => {
    const next = { ...readAll() };
    delete next[key];
    writeAll(next);
  }, []);

  return { isAcked, ackedAt, acknowledge, unacknowledge };
}

/** Prune acks that no longer correspond to any current flagged pair.
 *  Prevents indefinite growth as users add/remove compounds. */
export function useAckPrune(activeKeys: string[]) {
  useEffect(() => {
    const all = readAll();
    const keep = new Set(activeKeys);
    let changed = false;
    const next: AckMap = {};
    for (const [k, v] of Object.entries(all)) {
      if (keep.has(k)) next[k] = v;
      else changed = true;
    }
    if (changed) writeAll(next);
  }, [activeKeys.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
}
