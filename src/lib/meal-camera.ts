/**
 * Meal photo capture.
 *
 * On device we use the Capacitor Camera plugin (base64, quality 70, width 1024,
 * no editing) when it is present in the shell; everywhere else — and whenever
 * the plugin is missing or the user cancels the native sheet — we fall back to
 * a plain `<input type="file" accept="image/*" capture="environment">`.
 *
 * The plugin is imported through a variable specifier on purpose so the web
 * bundle never hard-depends on it: shells without the plugin simply use the
 * file input instead of failing to build.
 */
import { isNative } from "@/lib/platform";

const CAMERA_PLUGIN = "@capacitor/camera";

export type MealCapture = { dataUrl: string };

/**
 * Why a native capture produced no photo. The caller must tell these apart:
 * "cancelled" is silent, but "denied" needs an explanation, because falling
 * back to a file input cannot rescue a revoked camera permission on iOS.
 */
export type CaptureOutcome =
  | { kind: "photo"; dataUrl: string }
  | { kind: "cancelled" }
  | { kind: "denied" }
  | { kind: "unavailable" };

function outcomeFromError(err: unknown): CaptureOutcome {
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? "");
  if (/denied|not authorized|unauthorized|permission/i.test(text)) return { kind: "denied" };
  if (/cancel|dismiss|no image|user did not/i.test(text)) return { kind: "cancelled" };
  return { kind: "unavailable" };
}

/** True when the native camera plugin can be used on this device. */
export async function nativeCameraAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const mod = (await import(/* @vite-ignore */ CAMERA_PLUGIN)) as { Camera?: unknown };
    return Boolean(mod?.Camera);
  } catch {
    return false;
  }
}

/**
 * Take a meal photo with the native camera, reporting *why* it produced
 * nothing so the caller can either fall back quietly or explain the block.
 */
export async function captureMealPhoto(): Promise<CaptureOutcome> {
  if (!isNative()) return { kind: "unavailable" };
  try {
    const mod = (await import(/* @vite-ignore */ CAMERA_PLUGIN)) as {
      Camera?: { getPhoto: (opts: Record<string, unknown>) => Promise<{ base64String?: string }> };
      CameraResultType?: Record<string, string>;
      CameraSource?: Record<string, string>;
    };
    if (!mod?.Camera) return { kind: "unavailable" };
    const photo = await mod.Camera.getPhoto({
      resultType: mod.CameraResultType?.["Base64"] ?? "base64",
      source: mod.CameraSource?.["Camera"] ?? "CAMERA",
      quality: 70,
      width: 1024,
      allowEditing: false,
      correctOrientation: true,
    });
    if (!photo?.base64String) return { kind: "cancelled" };
    return { kind: "photo", dataUrl: `data:image/jpeg;base64,${photo.base64String}` };
  } catch (err) {
    return outcomeFromError(err);
  }
}
