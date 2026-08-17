/**
 * Sentry init. Opt-in via VITE_SENTRY_DSN. Safe no-op when unset so preview /
 * dev builds don't ship telemetry. Native builds use @sentry/capacitor which
 * wraps @sentry/react automatically; web builds use @sentry/react directly.
 */
import { isNative } from "./platform";

let initialized = false;

export async function initSentry(): Promise<void> {
  if (initialized) return;
  if (typeof window === "undefined") return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  initialized = true;

  const commonOptions = {
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  };

  try {
    if (isNative()) {
      const cap = await import("@sentry/capacitor");
      const react = await import("@sentry/react");
      cap.init(
        { ...commonOptions, dist: "native" },
        // forward to @sentry/react so React ErrorBoundary integrations work
        react.init as unknown as (opts: unknown) => void,
      );
    } else {
      const react = await import("@sentry/react");
      react.init(commonOptions);
    }
  } catch (err) {
    // Never let telemetry break the app
    console.warn("[sentry] init failed", err);
  }
}
