import { Capacitor } from "@capacitor/core";

export type NativePlatform = "ios" | "android" | "web";

export function getPlatform(): NativePlatform {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
  } catch {
    /* not in a Capacitor context */
  }
  return "web";
}

export function isNative(): boolean {
  const p = getPlatform();
  return p === "ios" || p === "android";
}

export function isIOS(): boolean {
  return getPlatform() === "ios";
}

/**
 * True when running inside the DoseRoutine native shell, using the WebView
 * user-agent tag as a fallback for the brief window before the Capacitor
 * bridge reports a platform. Use this for guards where a false "web" answer
 * would strand the user (blank tabs, print dialogs, web checkout).
 */
export function isNativeShell(): boolean {
  if (isNative()) return true;
  try {
    return /DoseRoutineApp/.test(navigator.userAgent);
  } catch {
    return false;
  }
}
