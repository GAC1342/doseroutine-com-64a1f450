/**
 * Crash reporting shim.
 *
 * The Firebase Crashlytics native plugins were removed from the iOS/Android
 * builds: `FirebaseAppPlugin.load()` calls `FirebaseApp.configure()` while the
 * Capacitor bridge boots, and without a bundled `GoogleService-Info.plist`
 * that raises an uncaught Objective-C exception, so the app aborted (SIGABRT)
 * on every launch — including during App Store review.
 *
 * Crash/error reporting now flows through the first-party monitor
 * (`client-error-monitor.ts`, surfaced at /admin/health) plus Sentry when a
 * DSN is configured. These functions stay so callers keep working; they are
 * intentionally never able to crash the app.
 */
import { isNative } from "./platform";
import { captureClientError } from "./client-error-monitor";

export const CRASH_REPORTING_PROVIDER = "first-party" as const;

/** No native crash SDK is initialised at launch by design. */
export async function initCrashlytics(): Promise<void> {
  /* intentional no-op — see file header */
}

/** Kept for API compatibility; user identity is attached by the first-party monitor. */
export async function setCrashlyticsUser(_userId: string | null): Promise<void> {
  /* intentional no-op */
}

/** Log a non-fatal error to the first-party monitor. */
export async function recordCrashlyticsError(
  message: string,
  extra?: Record<string, string>,
): Promise<void> {
  try {
    captureClientError(new Error(message), { ...extra, native: String(isNative()) }, "manual");
  } catch {
    /* never let telemetry throw */
  }
}

/**
 * Previously forced a native crash to test Crashlytics. Deliberately disabled:
 * shipping code must have no path that intentionally aborts the process.
 */
export async function forceCrashlyticsCrash(): Promise<void> {
  await recordCrashlyticsError("Debug: forced-crash action invoked (no-op)", {
    trigger: "debug_screen",
  });
}
