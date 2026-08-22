import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { isNative } from "@/lib/platform";
import { captureClientError } from "@/lib/client-error-monitor";
import { supabase } from "@/integrations/supabase/client";
import { createDeepLinkOpener, deepLinkPath } from "@/lib/deep-link";
import { closeNativeAuthBrowser } from "@/lib/native-oauth";
import { recordDeepLink } from "@/lib/deep-link-log";

/**
 * L7 — native app lifecycle listeners.
 *
 * `appUrlOpen`: universal links / custom-scheme opens (e.g. an emailed
 * https://doseroutine.com/today link, or com.doseroutine.app://today) used to
 * do nothing once the app was already running — the OS handed the URL to the
 * app and it was dropped. We now route to the in-app path client-side.
 *
 * `backButton` (Android): without a listener, the hardware back button exits
 * the app from any screen. It now pops in-app history first and only exits
 * from the root.
 *
 * No-op on web; the plugin is imported dynamically so web bundles skip it.
 */
export { deepLinkPath };

export function NativeAppListeners() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;
    let disposed = false;
    const handles: Array<{ remove: () => void }> = [];

    (async () => {
      try {
        const { App } = await import("@capacitor/app");

        // H3 — an opened link used to navigate immediately, before the auth
        // session had hydrated. A protected target then bounced to /auth and
        // the intended path was lost. We now wait for the session lookup to
        // settle (it resolves from local storage, so this is fast) before
        // routing, and never navigate after unmount. Cold-start and warm
        // `appUrlOpen` links share one queue so they can't interleave.
        const openPath = createDeepLinkOpener({
          hydrateSession: () => supabase.auth.getSession(),
          navigate: async (path) => {
            // C1 — an OAuth round trip returns through the system browser;
            // dismiss it before the app takes over, otherwise the user is left
            // staring at a blank Safari sheet on top of the signed-in app.
            if (path.startsWith("/auth/callback")) await closeNativeAuthBrowser();
            return router.navigate({ to: path, replace: false });
          },
          isDisposed: () => disposed,
          onError: (err, path) => captureClientError(err, { deep_link: path }, "manual"),
        });

        // Cold start: the OS delivers the launch URL before listeners attach.
        try {
          const launch = await App.getLaunchUrl();
          if (launch?.url) {
            recordDeepLink(launch.url, "launch");
            void openPath(launch.url);
          }
        } catch (err) {
          // "no launch URL" is normal; a real plugin failure means a broken
          // universal link that would otherwise be invisible in telemetry.
          captureClientError(
            err instanceof Error ? err : new Error(String(err)),
            { stage: "getLaunchUrl" },
            "manual",
          );
        }

        const urlHandle = await App.addListener("appUrlOpen", (event) => {
          recordDeepLink(event.url, "appUrlOpen");
          void openPath(event.url);
        });

        const backHandle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack || window.history.length > 1) {
            router.history.back();
            return;
          }
          void App.exitApp();
        });

        if (disposed) {
          urlHandle.remove();
          backHandle.remove();
          return;
        }
        handles.push(urlHandle, backHandle);
      } catch (err) {
        // Plugin missing or platform unsupported — never break launch.
        console.warn("[native] app listeners unavailable", err);
      }
    })();

    return () => {
      disposed = true;
      handles.forEach((h) => {
        try {
          h.remove();
        } catch {
          /* already removed */
        }
      });
    };
  }, [router]);

  return null;
}
