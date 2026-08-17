// Offline dose logging queue.
// Persists dose status mutations to localStorage when the network fails
// or the device is offline, then replays them once connectivity returns.

import { supabase } from "@/integrations/supabase/client";

const KEY = "doseroutine:offline:dose-queue:v1";
const LEGACY_KEY = "sw:offline:dose-queue:v1";

export type QueuedDoseMutation = {
  id: string; // schedule_events.id
  status: "taken" | "skipped" | "pending" | "missed";
  taken_at: string | null;
  queued_at: string; // ISO
};

function read(): QueuedDoseMutation[] {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: QueuedDoseMutation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable — drop silently
  }
  emitChange();
}

const listeners = new Set<(count: number) => void>();
function emitChange() {
  const count = read().length;
  listeners.forEach((l) => l(count));
}

export function subscribeQueue(cb: (count: number) => void): () => void {
  listeners.add(cb);
  cb(read().length);
  return () => {
    listeners.delete(cb);
  };
}

export function getQueueCount(): number {
  return read().length;
}

/**
 * Enqueue a dose mutation. Last-write-wins per event id: if a mutation for
 * the same id is already queued, it is replaced. Returns the queued row.
 */
export function enqueueDoseMutation(m: Omit<QueuedDoseMutation, "queued_at">): QueuedDoseMutation {
  const row: QueuedDoseMutation = { ...m, queued_at: new Date().toISOString() };
  const existing = read().filter((x) => x.id !== m.id);
  existing.push(row);
  write(existing);
  return row;
}

/**
 * Attempt to flush the queue. Silently succeeds when offline (leaves items).
 * Returns { flushed, remaining, failed }.
 */
export async function flushQueue(): Promise<{
  flushed: number;
  remaining: number;
  failed: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const remaining = read().length;
    return { flushed: 0, remaining, failed: 0 };
  }
  const queue = read();
  if (queue.length === 0) return { flushed: 0, remaining: 0, failed: 0 };

  let flushed = 0;
  let failed = 0;
  const kept: QueuedDoseMutation[] = [];

  for (const item of queue) {
    try {
      const { error } = await supabase
        .from("schedule_events")
        .update({ status: item.status, taken_at: item.taken_at })
        .eq("id", item.id);
      if (error) {
        // Network / transient errors — keep for retry. Permission/validation
        // errors surface with a `code` starting with a digit; drop those so
        // the queue can't wedge on a poisoned row.
        const permissionLike = typeof error.code === "string" && /^\d/.test(error.code);
        if (permissionLike) {
          failed++;
        } else {
          kept.push(item);
        }
      } else {
        flushed++;
      }
    } catch {
      kept.push(item);
    }
  }
  write(kept);
  return { flushed, remaining: kept.length, failed };
}

/**
 * Install listeners that replay the queue whenever the browser reports
 * "online" or the tab becomes visible. Safe to call multiple times — it
 * short-circuits on the second call.
 */
let installed = false;
export function installOfflineFlusher() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const trigger = () => {
    void flushQueue();
  };
  window.addEventListener("online", trigger);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") trigger();
  });
  // Kick once on load in case we missed the "online" event.
  if (navigator.onLine) trigger();
}
