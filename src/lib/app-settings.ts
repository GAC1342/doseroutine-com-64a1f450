/**
 * L5 — recovery route after a hard permission denial.
 *
 * Once the OS dialog has been denied, an app can never re-prompt: the only way
 * back is the system Settings screen. iOS accepts the `app-settings:` URL from
 * a WKWebView; Android accepts an `intent:` URL targeting the app's details
 * page. Both are plain navigations, so no extra plugin is needed.
 */
import { getPlatform, isNative } from "@/lib/platform";

export const ANDROID_PACKAGE = "com.doseroutine.app";

/** True when an "Open Settings" button can actually do something. */
export function canOpenAppSettings(): boolean {
  return isNative();
}

export function appSettingsUrl(platform: string = getPlatform()): string | null {
  if (platform === "ios") return "app-settings:";
  if (platform === "android") {
    return `intent://${ANDROID_PACKAGE}#Intent;scheme=package;action=android.settings.APPLICATION_DETAILS_SETTINGS;end`;
  }
  return null;
}

/** Navigate to the OS settings page for this app. Returns false when unsupported. */
export function openAppSettings(): boolean {
  if (typeof window === "undefined") return false;
  const url = appSettingsUrl();
  if (!url) return false;
  try {
    window.location.href = url;
    return true;
  } catch {
    return false;
  }
}
