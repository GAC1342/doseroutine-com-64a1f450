/**
 * First-party production error monitoring.
 *
 * Every uncaught error, unhandled promise rejection, failed resource load and
 * manually reported error is normalised, de-duplicated, rate limited and
 * written to `analytics_events` as a `client_error` event via `trackEvent`.
 *
 * This runs with no external service and no DSN, so it works in production
 * whether or not Sentry (VITE_SENTRY_DSN) is configured. Sentry, when enabled,
 * stays the deep-dive tool; this is the always-on regression signal that the
 * admin health dashboard reads.
 *
 * Guarantees:
 *   - never throws (telemetry must not break the app)
 *   - never logs secrets: query strings, tokens and emails are redacted
 *   - bounded volume: identical errors collapse, and a hard per-session cap
 *     stops an error loop from flooding the table
 */
import { trackEvent } from "@/lib/analytics";
import { drainErrorReports, isOffline, queueErrorReport } from "@/lib/error-report-queue";
import { isBenignRouterRejection } from "./benign-rejection";

export type ClientErrorKind =
  | "uncaught"
  | "unhandledrejection"
  | "resource"
  | "react_error_boundary"
  | "manual";

export type ClientErrorReport = {
  kind: ClientErrorKind;
  message: string;
  stack?: string | undefined;
  fingerprint: string;
  context?: Record<string, unknown>;
};

/** Max distinct errors reported per page session. */
const MAX_EVENTS_PER_SESSION = 25;
/** Repeats of the same fingerprint inside this window are collapsed. */
const DEDUPE_WINDOW_MS = 30_000;
const MAX_MESSAGE_CHARS = 300;
const MAX_STACK_CHARS = 2_000;

let initialized = false;
let sent = 0;
const lastSeen = new Map<string, number>();

const TOKEN_PATTERNS: { re: RegExp; with: string }[] = [
  // JWTs and bearer tokens
  { re: /\beyJ[A-Za-z0-9._-]{10,}/g, with: "[jwt]" },
  {
    re: /\b(bearer|token|apikey|api_key|access_token|refresh_token)[=:\s]+\S+/gi,
    with: "$1=[redacted]",
  },
  // Supabase publishable/secret keys
  { re: /\bsb_(publishable|secret)_[A-Za-z0-9_-]+/g, with: "sb_[redacted]" },
  // email addresses
  { re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/g, with: "[email]" },
];

/** Strip query strings, hashes of unknown shape, and anything token-like. */
export function redactErrorText(input: string): string {
  let out = input;
  // Drop URL query strings entirely — they can carry tokens or PII.
  out = out.replace(/(https?:\/\/[^\s)"']+?)\?[^\s)"']*/g, "$1?[redacted]");
  for (const p of TOKEN_PATTERNS) out = out.replace(p.re, p.with);
  return out;
}

/** Collapse volatile parts of a message so repeats group together. */
export function errorFingerprint(kind: string, message: string, stack?: string): string {
  const normalizedMessage = message
    .replace(/\d+/g, "#")
    .replace(/(https?:\/\/)[^\s)"']+/g, "$1url")
    .slice(0, 120);
  const topFrame =
    stack
      ?.split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("at ") || l.includes("@"))
      ?.replace(/:\d+:\d+/g, "")
      ?.replace(/\?[^\s)]*/g, "")
      ?.slice(0, 120) ?? "";
  return `${kind}|${normalizedMessage}|${topFrame}`;
}

function shouldSend(fingerprint: string): boolean {
  if (sent >= MAX_EVENTS_PER_SESSION) return false;
  const now = Date.now();
  const prev = lastSeen.get(fingerprint);
  if (prev !== undefined && now - prev < DEDUPE_WINDOW_MS) return false;
  lastSeen.set(fingerprint, now);
  sent += 1;
  return true;
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message, stack: error.stack ?? undefined };
  if (error instanceof Response) {
    return { message: `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` };
  }
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error)?.slice(0, MAX_MESSAGE_CHARS) ?? "Unknown error" };
  } catch {
    return { message: "Unknown error" };
  }
}

/** Build the payload without sending — exported for tests. */
export function buildErrorReport(
  kind: ClientErrorKind,
  error: unknown,
  context: Record<string, unknown> = {},
): ClientErrorReport {
  const { message, stack } = describe(error);
  const safeMessage = redactErrorText(message).slice(0, MAX_MESSAGE_CHARS);
  const safeStack = stack ? redactErrorText(stack).slice(0, MAX_STACK_CHARS) : undefined;
  return {
    kind,
    message: safeMessage,
    stack: safeStack,
    fingerprint: errorFingerprint(kind, safeMessage, safeStack),
    context,
  };
}

/** Report an error we already caught (boundaries, mutations, handlers). */
export function captureClientError(
  error: unknown,
  context: Record<string, unknown> = {},
  kind: ClientErrorKind = "manual",
): void {
  if (typeof window === "undefined") return;
  try {
    const report = buildErrorReport(kind, error, context);
    if (!report.message) return;
    if (!shouldSend(report.fingerprint)) return;
    // Mirror into Sentry when a DSN is configured (deep-dive tool; no-op otherwise).
    void import("@/lib/sentry").then((m) =>
      m.captureToSentry(error, { kind: report.kind, fingerprint: report.fingerprint, ...context }),
    );
    const payload = {
      kind: report.kind,
      message: report.message,
      stack: report.stack ?? null,
      fingerprint: report.fingerprint,
      release: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? null,
      mode: import.meta.env.MODE,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: typeof navigator !== "undefined" ? navigator.onLine : null,
      ...context,
    };
    // Offline (very common for a native crash): park it and replay on reconnect
    // so production errors are not silently lost.
    if (isOffline()) queueErrorReport(payload);
    else trackEvent("client_error", payload);
  } catch {
    /* telemetry must never throw */
  }
}

/** Install global listeners. Idempotent and safe to call on every mount. */
export function initClientErrorMonitor(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  initialized = true;

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as (HTMLElement & { src?: string; href?: string }) | null;
      // Resource load failures (images, scripts, stylesheets) don't bubble as
      // ErrorEvent.error — they surface with the failing element as the target.
      if (target && target !== (window as unknown as EventTarget) && target.tagName) {
        const url = target.src ?? target.href;
        if (url) {
          captureClientError(
            new Error(`Failed to load ${target.tagName.toLowerCase()}: ${redactErrorText(url)}`),
            { resource_tag: target.tagName.toLowerCase() },
            "resource",
          );
          return;
        }
      }
      captureClientError(
        event.error ?? new Error(event.message),
        {
          source_file: event.filename ? redactErrorText(event.filename) : null,
          line: event.lineno ?? null,
          column: event.colno ?? null,
        },
        "uncaught",
      );
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    if (isBenignRouterRejection(event.reason)) return;
    captureClientError(event.reason ?? new Error("Unhandled rejection"), {}, "unhandledrejection");
  });

  window.addEventListener("online", flushQueuedErrors);
  // A crash that happened offline is usually only replayable on the next launch.
  flushQueuedErrors();
}

/** Send anything captured while offline. Safe to call at any time. */
export function flushQueuedErrors(): void {
  if (typeof window === "undefined") return;
  if (isOffline()) return;
  try {
    for (const item of drainErrorReports()) {
      trackEvent("client_error", { ...item.payload, delayed_ms: Date.now() - item.at });
    }
  } catch {
    /* telemetry must never throw */
  }
}

/** Test-only reset of the dedupe/rate-limit state. */
export function __resetClientErrorMonitor(): void {
  initialized = false;
  sent = 0;
  lastSeen.clear();
}
