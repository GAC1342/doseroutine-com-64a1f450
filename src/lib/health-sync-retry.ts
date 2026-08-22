/**
 * Retry policy and error mapping for Apple Health / Health Connect syncs.
 *
 * Two jobs:
 *  1. `classifyHealthError` turns whatever the native bridge reported into a
 *     stable category with a plain-English explanation and a fix hint, so the
 *     status panel can say *exactly* what went wrong instead of "Failed".
 *  2. `backoffDelayMs` / `nextRetryAt` implement capped exponential backoff
 *     with jitter, and tell the UI when the next automatic attempt lands.
 *
 * Pure module — safe to unit test and to import from anywhere.
 */

export type HealthErrorKind =
  | "unavailable"
  | "permission"
  | "plugin"
  | "network"
  | "auth"
  | "rateLimit"
  | "data"
  | "unknown";

export type HealthErrorInfo = {
  kind: HealthErrorKind;
  /** Short label for the badge/summary line. */
  title: string;
  /** Plain-English explanation of what happened. */
  explanation: string;
  /** What the user can do about it. */
  fix: string;
  /** Whether retrying (automatically) can plausibly help. */
  retryable: boolean;
  /** The raw reason string reported by the bridge, if any. */
  raw?: string;
};

const RULES: Array<{ test: RegExp; info: Omit<HealthErrorInfo, "raw"> }> = [
  {
    test: /only available in the installed app|not available on web|unavailable on this device|not supported/i,
    info: {
      kind: "unavailable",
      title: "Not available here",
      explanation: "Health data can only be read inside the installed iPhone or Android app.",
      fix: "Open DoseRoutine from your home screen and sync there.",
      retryable: false,
    },
  },
  {
    test: /plugin (could not be loaded|unavailable)/i,
    info: {
      kind: "plugin",
      title: "Health plugin missing",
      explanation: "The Health bridge did not load on this build of the app.",
      fix: "Update to the latest app version, then try again.",
      retryable: false,
    },
  },
  {
    test: /permission|denied|not authoriz|unauthoriz(?!ed request)|no access/i,
    info: {
      kind: "permission",
      title: "Permission not granted",
      explanation: "Health has not given the app access to this data type.",
      fix: "Enable it in Settings › Health › Data Access & Devices › DoseRoutine.",
      retryable: false,
    },
  },
  {
    test: /network|fetch failed|offline|timed? ?out|timeout|ECONN|socket/i,
    info: {
      kind: "network",
      title: "Connection problem",
      explanation: "The sync could not reach the server to save your data.",
      fix: "Check your connection — we'll retry automatically.",
      retryable: true,
    },
  },
  {
    test: /jwt|token|sign in|session|401|403/i,
    info: {
      kind: "auth",
      title: "Session expired",
      explanation: "Your sign-in expired part-way through the sync.",
      fix: "Sign in again, then run the sync.",
      retryable: false,
    },
  },
  {
    test: /rate ?limit|too many requests|429/i,
    info: {
      kind: "rateLimit",
      title: "Too many requests",
      explanation: "The server asked us to slow down.",
      fix: "We'll wait and retry automatically.",
      retryable: true,
    },
  },
  {
    test: /duplicate|constraint|invalid|parse|NaN|null value/i,
    info: {
      kind: "data",
      title: "Unexpected data",
      explanation: "One of the Health samples couldn't be saved in the expected format.",
      fix: "Other data types still synced. Report it if it keeps happening.",
      retryable: false,
    },
  },
];

export function classifyHealthError(reason?: string | null): HealthErrorInfo {
  const raw = (reason ?? "").trim();
  for (const rule of RULES) {
    if (rule.test.test(raw)) return { ...rule.info, ...(raw ? { raw } : {}) };
  }
  return {
    kind: "unknown",
    title: "Sync failed",
    explanation: raw || "The Health bridge didn't say why this data type failed.",
    fix: "Retrying usually clears a one-off failure.",
    retryable: true,
    ...(raw ? { raw } : {}),
  };
}

/* ── Exponential backoff ─────────────────────────────────────────────── */

export const BASE_RETRY_MS = 5_000;
export const MAX_RETRY_MS = 5 * 60_000;
export const MAX_AUTO_ATTEMPTS = 5;

/**
 * Capped exponential backoff: 5s, 10s, 20s, 40s, 80s … capped at 5 minutes.
 * `jitter` (0–1) spreads retries so several devices don't stampede; pass 0 in
 * tests for a deterministic value.
 */
export function backoffDelayMs(attempt: number, jitter = Math.random()): number {
  const n = Math.max(0, Math.floor(attempt));
  const base = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** n);
  const spread = base * 0.2 * Math.min(1, Math.max(0, jitter));
  return Math.round(base + spread);
}

export function nextRetryAt(attempt: number, now: Date = new Date(), jitter?: number): Date | null {
  if (attempt >= MAX_AUTO_ATTEMPTS) return null;
  return new Date(now.getTime() + backoffDelayMs(attempt, jitter));
}

/** "in 40s" / "in 3 min" — used for the countdown line in the panel. */
export function describeCountdown(msRemaining: number): string {
  const secs = Math.max(0, Math.ceil(msRemaining / 1000));
  if (secs < 60) return `in ${secs}s`;
  const mins = Math.ceil(secs / 60);
  return `in ${mins} min`;
}

/** Should the panel schedule another automatic attempt? */
export function shouldAutoRetry(attempt: number, errors: Array<{ reason?: string }>): boolean {
  if (attempt >= MAX_AUTO_ATTEMPTS) return false;
  return errors.some((e) => classifyHealthError(e.reason).retryable);
}
