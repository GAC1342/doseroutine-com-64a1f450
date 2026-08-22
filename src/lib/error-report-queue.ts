/**
 * Offline-safe buffer for client error reports.
 *
 * On the installed app a crash very often happens while the device has no
 * usable connection, which is exactly when the report would be dropped. Reports
 * are parked in localStorage and replayed the next time the app is online, so
 * production crashes still reach the health dashboard.
 *
 * The queue only ever holds already-redacted payloads produced by
 * client-error-monitor, is capped, and never throws.
 */
const STORAGE_KEY = "dr.error-queue.v1";
const MAX_QUEUED = 20;
/** Drop anything older than a week — stale crashes aren't actionable. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type QueuedErrorReport = {
  at: number;
  payload: Record<string, unknown>;
};

function read(): QueuedErrorReport[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedErrorReport =>
        !!item && typeof item === "object" && typeof (item as QueuedErrorReport).at === "number",
    );
  } catch {
    return [];
  }
}

function write(items: QueuedErrorReport[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_QUEUED)));
  } catch {
    /* storage full or blocked — telemetry is best effort */
  }
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Park a report for later delivery. */
export function queueErrorReport(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const fresh = read().filter((item) => Date.now() - item.at < MAX_AGE_MS);
  write([...fresh, { at: Date.now(), payload }]);
}

/** Take everything pending; the caller is responsible for delivery. */
export function drainErrorReports(): QueuedErrorReport[] {
  if (typeof window === "undefined") return [];
  const items = read().filter((item) => Date.now() - item.at < MAX_AGE_MS);
  if (items.length) write([]);
  return items;
}

/** Test helper. */
export function __clearErrorQueue(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
