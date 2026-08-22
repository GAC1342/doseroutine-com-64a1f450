/**
 * Bookmarks for the instruction manual.
 *
 * Stored in two places on purpose:
 *  - localStorage: instant read on mount, keeps working offline.
 *  - manual_bookmarks (Lovable Cloud): the source of truth that follows the
 *    account across phones and browsers.
 *
 * Conflict resolution: every section keeps a state ("saved" or "removed") plus
 * the timestamp of the last change, on both sides. When the same section was
 * changed on two devices, the newer timestamp wins (last-write-wins) instead of
 * a naive union that could resurrect a bookmark removed elsewhere. Removals are
 * kept as tombstones (removed = true) so they can travel between devices.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "doseroutine:manual-bookmarks:v2";
const LEGACY_KEY = "doseroutine:manual-bookmarks:v1";
const EVENT = "doseroutine:manual-bookmarks-changed";

export type BookmarkEntry = { removed: boolean; updatedAt: string };
export type BookmarkMap = Record<string, BookmarkEntry>;

function parseMap(raw: string | null): BookmarkMap | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: BookmarkMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const v = value as { removed?: unknown; updatedAt?: unknown };
      if (typeof v.updatedAt !== "string") continue;
      out[id] = { removed: v.removed === true, updatedAt: v.updatedAt };
    }
    return out;
  } catch {
    return null;
  }
}

/** Reads the full state map, migrating the old array format if present. */
export function readBookmarkMap(): BookmarkMap {
  if (typeof window === "undefined") return {};
  const current = parseMap(window.localStorage.getItem(KEY));
  if (current) return current;
  // Legacy array of saved ids — treat as saved at the epoch so any later
  // change on another device wins.
  try {
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "null");
    if (Array.isArray(legacy)) {
      const map: BookmarkMap = {};
      for (const id of legacy) {
        if (typeof id === "string") {
          map[id] = { removed: false, updatedAt: new Date(0).toISOString() };
        }
      }
      return map;
    }
  } catch {
    // ignore
  }
  return {};
}

export function idsFromMap(map: BookmarkMap): string[] {
  return Object.entries(map)
    .filter(([, entry]) => !entry.removed)
    .map(([id]) => id);
}

export function readBookmarks(): string[] {
  return idsFromMap(readBookmarkMap());
}

function writeBookmarkMap(map: BookmarkMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Quota / private mode — cloud copy still holds the truth.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Last-write-wins merge of two state maps. */
export function mergeBookmarkMaps(a: BookmarkMap, b: BookmarkMap): BookmarkMap {
  const merged: BookmarkMap = { ...a };
  for (const [id, entry] of Object.entries(b)) {
    const existing = merged[id];
    if (!existing || Date.parse(entry.updatedAt) > Date.parse(existing.updatedAt)) {
      merged[id] = entry;
    }
  }
  return merged;
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export type SyncState = "idle" | "syncing" | "synced" | "offline";

export function useManualBookmarks() {
  const [ids, setIds] = useState<string[]>([]);
  const [sync, setSync] = useState<SyncState>("idle");

  useEffect(() => {
    setIds(readBookmarks());
    const onLocalChange = () => setIds(readBookmarks());
    window.addEventListener(EVENT, onLocalChange);
    window.addEventListener("storage", onLocalChange);

    let cancelled = false;
    (async () => {
      setSync("syncing");
      const userId = await currentUserId();
      if (!userId || cancelled) {
        if (!cancelled) setSync("offline");
        return;
      }
      const { data, error } = await supabase
        .from("manual_bookmarks")
        .select("section_id, removed, updated_at")
        .eq("user_id", userId);
      if (cancelled) return;
      if (error) {
        setSync("offline");
        return;
      }
      const remote: BookmarkMap = {};
      for (const row of data as Array<{
        section_id: string;
        removed: boolean | null;
        updated_at: string | null;
      }>) {
        remote[row.section_id] = {
          removed: row.removed === true,
          updatedAt: row.updated_at ?? new Date(0).toISOString(),
        };
      }
      const local = readBookmarkMap();
      const merged = mergeBookmarkMaps(remote, local);

      // Push up anything where the local copy is the winner.
      const toPush = Object.entries(merged).filter(([id, entry]) => {
        const r = remote[id];
        return !r || r.removed !== entry.removed || r.updatedAt !== entry.updatedAt;
      });
      if (toPush.length > 0) {
        await supabase.from("manual_bookmarks").upsert(
          toPush.map(([section_id, entry]) => ({
            user_id: userId,
            section_id,
            removed: entry.removed,
            updated_at: entry.updatedAt,
          })),
          { onConflict: "user_id,section_id" },
        );
      }
      if (cancelled) return;
      writeBookmarkMap(merged);
      setSync("synced");
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onLocalChange);
      window.removeEventListener("storage", onLocalChange);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const map = readBookmarkMap();
    const removing = !!map[id] && !map[id].removed;
    const updatedAt = new Date().toISOString();
    map[id] = { removed: removing, updatedAt };
    writeBookmarkMap(map);

    void (async () => {
      const userId = await currentUserId();
      if (!userId) return;
      await supabase
        .from("manual_bookmarks")
        .upsert(
          { user_id: userId, section_id: id, removed: removing, updated_at: updatedAt },
          { onConflict: "user_id,section_id" },
        );
    })();
  }, []);

  const clear = useCallback(() => {
    const map = readBookmarkMap();
    const updatedAt = new Date().toISOString();
    const next: BookmarkMap = {};
    for (const id of Object.keys(map)) next[id] = { removed: true, updatedAt };
    writeBookmarkMap(next);

    void (async () => {
      const userId = await currentUserId();
      if (!userId) return;
      const rows = Object.keys(next).map((section_id) => ({
        user_id: userId,
        section_id,
        removed: true,
        updated_at: updatedAt,
      }));
      if (rows.length === 0) return;
      await supabase.from("manual_bookmarks").upsert(rows, { onConflict: "user_id,section_id" });
    })();
  }, []);

  return { ids, sync, isBookmarked: (id: string) => ids.includes(id), toggle, clear };
}
