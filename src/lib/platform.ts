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
