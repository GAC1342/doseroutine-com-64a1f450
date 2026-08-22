import { useEffect } from "react";
import { isNative } from "@/lib/platform";

/**
 * C2 — hides the native splash screen once React has actually painted.
 *
 * The splash used to auto-hide on a fixed timer, so a slow cold start could
 * reveal an empty webview before hydration finished. The config now keeps the
 * splash up (`autoHide: false`) and this component takes it down after the
 * first paint, with a hard safety timeout so the splash can never get stuck.
 */
const SAFETY_TIMEOUT_MS = 4000;

export function NativeSplash() {
  useEffect(() => {
    if (!isNative()) return;
    let done = false;

    const hide = async () => {
      if (done) return;
      done = true;
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* plugin missing or already hidden — never block launch */
      }
    };

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void hide();
      });
    });
    const timer = window.setTimeout(() => void hide(), SAFETY_TIMEOUT_MS);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
