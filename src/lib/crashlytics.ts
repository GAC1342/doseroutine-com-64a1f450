/**
 * Firebase Crashlytics init for native iOS/Android builds.
 *
 * Safe no-op on web and when native Firebase config files are missing.
 * Requires:
 *   - iOS: ios/App/App/GoogleService-Info.plist  (from Firebase console)
 *   - Android: android/app/google-services.json  (from Firebase console)
 *
 * Crashlytics collection is enabled by default. To disable in dev, set
 * VITE_CRASHLYTICS_ENABLED="false".
 */
import { isNative } from "./platform";

let initialized = false;

export async function initCrashlytics(): Promise<void> {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!isNative()) return;
  initialized = true;

  const enabled = (import.meta.env.VITE_CRASHLYTICS_ENABLED as string | undefined) !== "false";

  try {
    const { FirebaseCrashlytics } = await import("@capacitor-firebase/crashlytics");
    await FirebaseCrashlytics.setEnabled({ enabled });
    await FirebaseCrashlytics.setCustomKey({
      key: "app_mode",
      value: import.meta.env.MODE,
      type: "string",
    });
  } catch (err) {
    // Never let telemetry crash the app.
    console.warn("[crashlytics] init failed", err);
  }
}

/** Attach the signed-in user's id to future crash reports. */
export async function setCrashlyticsUser(userId: string | null): Promise<void> {
  if (!isNative()) return;
  try {
    const { FirebaseCrashlytics } = await import("@capacitor-firebase/crashlytics");
    await FirebaseCrashlytics.setUserId({ userId: userId ?? "" });
  } catch {
    /* ignore */
  }
}

/** Log a non-fatal error to Crashlytics. */
export async function recordCrashlyticsError(
  message: string,
  extra?: Record<string, string>,
): Promise<void> {
  if (!isNative()) return;
  try {
    const { FirebaseCrashlytics } = await import("@capacitor-firebase/crashlytics");
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        await FirebaseCrashlytics.setCustomKey({ key, value, type: "string" });
      }
    }
    await FirebaseCrashlytics.recordException({ message });
  } catch {
    /* ignore */
  }
}

/**
 * Force a native crash so you can confirm end-to-end Crashlytics reporting.
 *
 * The app process WILL terminate. Only call this from an internal debug
 * screen behind an explicit user confirmation. No-op on web.
 */
export async function forceCrashlyticsCrash(): Promise<void> {
  if (!isNative()) {
    console.warn("[crashlytics] forceCrash is a no-op on web");
    return;
  }
  const { FirebaseCrashlytics } = await import("@capacitor-firebase/crashlytics");
  await FirebaseCrashlytics.log({ message: "Manual test crash triggered from debug screen" });
  await FirebaseCrashlytics.crash({ message: "DoseRoutine internal test crash" });
}
