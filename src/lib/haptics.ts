import { isNative } from "./platform";

type Style = "light" | "medium" | "heavy";

/**
 * Fire a native haptic tap. No-op on web (or if the plugin is unavailable).
 * Uses dynamic import so web bundles never load the native module eagerly.
 */
export async function hapticTap(style: Style = "light"): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = await import("@capacitor/haptics");
    const impactStyle =
      style === "heavy"
        ? mod.ImpactStyle.Heavy
        : style === "medium"
          ? mod.ImpactStyle.Medium
          : mod.ImpactStyle.Light;
    await mod.Haptics.impact({ style: impactStyle });
  } catch {
    /* haptics unavailable — silent */
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = await import("@capacitor/haptics");
    await mod.Haptics.notification({ type: mod.NotificationType.Success });
  } catch {
    /* silent */
  }
}

export async function hapticWarning(): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = await import("@capacitor/haptics");
    await mod.Haptics.notification({ type: mod.NotificationType.Warning });
  } catch {
    /* silent */
  }
}
