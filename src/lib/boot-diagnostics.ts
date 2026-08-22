/**
 * Offline boot diagnostics.
 *
 * When a cold start fails in airplane mode the user (and support) needs to
 * know *which* step gave up — session restore, route chunk download, or the
 * route loader — without leaking stack traces, URLs, tokens or other
 * internals. Every step is recorded as a plain-language label plus a coarse
 * outcome, kept in a small in-memory ring buffer, and rendered on the recovery
 * screen behind a disclosure.
 */

export type BootStepId =
  | "app-start"
  | "connectivity"
  | "session-restore"
  | "route-chunk"
  | "route-loader"
  | "recovery-shown"
  | "retry";

export type BootStepStatus = "ok" | "skipped" | "stalled" | "failed";

export type BootStep = {
  id: BootStepId;
  status: BootStepStatus;
  /** Plain-language description shown to the user. Never internals. */
  message: string;
  at: number;
  /** ms since app start, for ordering / "how long did we wait". */
  sinceStartMs: number;
};

const MAX_STEPS = 25;
const START = Date.now();
const steps: BootStep[] = [];
const listeners = new Set<() => void>();

/** Human labels for each step, so the UI never prints an identifier. */
export const BOOT_STEP_LABELS: Record<BootStepId, string> = {
  "app-start": "App start",
  connectivity: "Network check",
  "session-restore": "Sign-in restore",
  "route-chunk": "Screen download",
  "route-loader": "Screen data",
  "recovery-shown": "Recovery screen",
  retry: "Retry",
};

/**
 * Reduce anything we might be handed (Error, Response, random object) to one
 * of a few safe, user-meaningful reasons. Raw messages can contain URLs,
 * tokens or file paths, so they are never surfaced.
 */
export function describeBootFailure(reason: unknown): string {
  const raw = String(
    (reason as { message?: string } | undefined)?.message ?? reason ?? "",
  ).toLowerCase();

  if (!raw) return "No response";
  if (/dynamically imported module|importing a module script|chunkloaderror|preload/.test(raw)) {
    return "Could not download this screen";
  }
  if (/timeout|timed out|deadline/.test(raw)) return "Timed out waiting for the network";
  if (/failed to fetch|networkerror|network request failed|load failed|offline/.test(raw)) {
    return "No network connection";
  }
  if (/abort/.test(raw)) return "Request cancelled";
  if (/401|unauthor|jwt|token/.test(raw)) return "Sign-in needs refreshing";
  if (/5\d\d|server/.test(raw)) return "Service unavailable";
  return "Unexpected problem";
}

/** Record a boot step. Safe to call anywhere, including during SSR. */
export function recordBootStep(id: BootStepId, status: BootStepStatus, message?: string): void {
  const step: BootStep = {
    id,
    status,
    message: message ?? BOOT_STEP_LABELS[id],
    at: Date.now(),
    sinceStartMs: Date.now() - START,
  };
  steps.push(step);
  if (steps.length > MAX_STEPS) steps.splice(0, steps.length - MAX_STEPS);
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    // Test/support hook: same sanitized data, no internals.
    (window as unknown as { __drBootDiagnostics?: BootStep[] }).__drBootDiagnostics =
      getBootSteps();
  }
}

export function getBootSteps(): BootStep[] {
  return steps.slice();
}

export function subscribeBootSteps(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The step that explains the failure, if any. */
export function firstFailedBootStep(): BootStep | undefined {
  return steps.find((s) => s.status === "failed" || s.status === "stalled");
}

/** One-line, copyable summary for support. Contains no identifiers. */
export function bootDiagnosticsSummary(): string {
  return getBootSteps()
    .map((s) => `${s.sinceStartMs}ms ${BOOT_STEP_LABELS[s.id]}: ${s.status} — ${s.message}`)
    .join("\n");
}

/** Test helper. */
export function resetBootDiagnostics(): void {
  steps.length = 0;
}
