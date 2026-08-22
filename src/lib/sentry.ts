/**
 * Sentry init. Opt-in via VITE_SENTRY_DSN. Safe no-op when unset so preview /
 * dev builds don't ship telemetry. Native builds use @sentry/capacitor which
 * wraps @sentry/react automatically; web builds use @sentry/react directly.
 */
import { isNative } from "./platform";

let initialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
let reactSdk: any = null;

/** True once a DSN was found and the SDK finished loading. */
export function isSentryActive(): boolean {
  return initialized && reactSdk !== null;
}

export async function initSentry(): Promise<void> {
  if (initialized) return;
  if (typeof window === "undefined") return;
  // C3 — build-time env first (always available offline), then the last
  // known-good cached DSN, then the server-held runtime secret. Previously a
  // failed request meant a whole session went unreported, which is exactly
  // when we most need the crash data.
  const { resolvePublicConfig } = await import("./publishable-key-cache");
  const resolved = await resolvePublicConfig(
    "sentry-dsn",
    (import.meta.env.VITE_SENTRY_DSN as string | undefined) || undefined,
    async () => {
      const { getSentryConfig } = await import("./sentry-config.functions");
      return (await getSentryConfig()).dsn;
    },
  );
  // Native/production builds fall back to the baked publishable DSN so a
  // shipped binary can never end up with crash reporting silently disabled.
  const { resolveSentryDsn } = await import("./sentry-dsn");
  const dsn = resolveSentryDsn({
    buildTimeDsn: (import.meta.env.VITE_SENTRY_DSN as string | undefined) ?? null,
    runtimeDsn: resolved ?? null,
    native: isNative(),
    production: import.meta.env.PROD === true,
  });
  if (!dsn) return;
  initialized = true;

  // Tracing sample rate: 10% by default, overridable per environment.
  const rawRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE);
  const tracesSampleRate = Number.isFinite(rawRate) && rawRate >= 0 && rawRate <= 1 ? rawRate : 0.1;

  const commonOptions = {
    dsn,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) || undefined,
    tracesSampleRate,
    // Distributed tracing headers only for our own origins/APIs.
    tracePropagationTargets: [
      /^\//,
      /^https:\/\/([a-z0-9-]+\.)*doseroutine\.com/,
      /^https:\/\/([a-z0-9-]+\.)*supabase\.co/,
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Keep a generous timeline of what happened before an error.
    maxBreadcrumbs: 100,
  };

  try {
    const react = await import("@sentry/react");
    // Page-load + navigation performance, plus automatic fetch/XHR spans and
    // breadcrumbs so slow or failing API calls show up on the trace.
    const integrations = [
      react.browserTracingIntegration({
        instrumentPageLoad: true,
        instrumentNavigation: true,
        enableLongTask: true,
        enableInp: true,
      }),
    ];
    if (isNative()) {
      const cap = await import("@sentry/capacitor");
      cap.init(
        { ...commonOptions, integrations, dist: "native" },
        // forward to @sentry/react so React ErrorBoundary integrations work
        react.init as unknown as (opts: unknown) => void,
      );
    } else {
      react.init({ ...commonOptions, integrations });
    }
    reactSdk = react;
    // Device / app metadata so every event says which platform and build it
    // came from. Best-effort and after init so it never delays reporting.
    void applySentryEnvironment();
  } catch (err) {
    // Never let telemetry break the app
    console.warn("[sentry] init failed", err);
  }
}

/**
 * Attach platform, app build and device details to all future events.
 * Safe to call repeatedly; no-op when Sentry is inactive.
 */
export async function applySentryEnvironment(): Promise<void> {
  if (!reactSdk) return;
  try {
    const { collectSentryEnvironment } = await import("./sentry-device-context");
    const info = await collectSentryEnvironment();
    reactSdk.setTags(info.tags);
    reactSdk.setContext("app_build", info.app);
    reactSdk.setContext("device_info", info.device);
  } catch {
    /* telemetry must never throw */
  }
}

/**
 * Send an already-caught error to Sentry. No-op when no DSN is configured.
 *
 * `options.tags` become searchable/alertable dimensions — Sentry alert rules
 * key off tags, not `extra`, so anything an alert must match on (error class,
 * resolver, correlation id) belongs there.
 */
export function captureToSentry(
  error: unknown,
  context: Record<string, unknown> = {},
  options: { tags?: Record<string, string>; fingerprint?: string[] } = {},
): string | undefined {
  if (!reactSdk) return undefined;
  try {
    return reactSdk.captureException(error, {
      extra: context,
      ...(options.tags ? { tags: options.tags } : {}),
      ...(options.fingerprint ? { fingerprint: options.fingerprint } : {}),
    });
  } catch {
    /* telemetry must never throw */
  }
  return undefined;
}

/** Attach/clear the signed-in user so crashes are attributable. */
export function setSentryUser(userId: string | null, extra?: { email?: string | null }): void {
  if (!reactSdk) return;
  try {
    // Id only: an email adds nothing to triage and needlessly widens the
    // personal data sent to a third-party processor.
    void extra;
    reactSdk.setUser(userId ? { id: userId } : null);
    reactSdk.setTag("signed_in", userId ? "true" : "false");
  } catch {
    /* telemetry must never throw */
  }
}

/**
 * Add a breadcrumb to the current Sentry scope. Breadcrumbs are what turn an
 * "I got locked out" report into a readable timeline of entitlement checks.
 */
export function addSentryBreadcrumb(crumb: {
  category: string;
  message: string;
  level?: "debug" | "info" | "warning" | "error" | "fatal";
  data?: Record<string, unknown>;
}): void {
  if (!reactSdk) return;
  try {
    reactSdk.addBreadcrumb(crumb);
  } catch {
    /* telemetry must never throw */
  }
}

/** Attach a named context block that rides along with the next event. */
export function setSentryContext(key: string, context: Record<string, unknown> | null): void {
  if (!reactSdk) return;
  try {
    reactSdk.setContext(key, context);
  } catch {
    /* telemetry must never throw */
  }
}

/**
 * Force a test error through the reporting pipeline. Used by the CI smoke
 * check and reachable in the native shell as `window.__doseroutineTestCrash()`
 * so a real device build can be verified end to end.
 */
export function sendSentryTestError(label = "manual"): boolean {
  const err = new Error(`DoseRoutine Sentry test error (${label})`);
  const id = captureToSentry(err, { label }, { tags: { test_event: "true" } });
  return typeof id === "string" && id.length > 0;
}

// Debug-only hook: shipped store builds must not expose a hidden trigger.
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>)["__doseroutineTestCrash"] = (label?: string) =>
    sendSentryTestError(label ?? "window");
}
