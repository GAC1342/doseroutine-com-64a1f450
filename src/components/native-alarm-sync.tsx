/**
 * Keeps device alarms in sync with the database for the whole app.
 *
 * Mounted once inside the authenticated shell. Re-arms alarms on launch, every
 * time the app comes back to the foreground (covers reboots, OS cleanups, and
 * timezone changes), and whenever a screen reports a schedule edit.
 */
import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { syncAllAlarms, ALARMS_CHANGED_EVENT } from "@/lib/alarm-sync";
import { isNativeNotifications } from "@/lib/local-notifications";

export function NativeAlarmSync() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastSync = useRef(0);

  // Catch-all: after any navigation, re-arm if it has been a while. Covers
  // edits made on screens that forget to announce a change.
  useEffect(() => {
    if (!isNativeNotifications()) return;
    const now = Date.now();
    if (now - lastSync.current < 60_000) return;
    lastSync.current = now;
    void syncAllAlarms().catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!isNativeNotifications()) return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      lastSync.current = Date.now();
      void syncAllAlarms().catch(() => {
        /* never surface — alarms retry on next resume */
      });
    };

    run();

    let removeAppListener: (() => void) | undefined;
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) run();
        });
        if (cancelled) void handle.remove();
        else removeAppListener = () => void handle.remove();
      } catch {
        /* plugin unavailable */
      }
    })();

    window.addEventListener(ALARMS_CHANGED_EVENT, run);
    // Safety net: re-arm daily even if the app stays open for days.
    const interval = window.setInterval(run, 6 * 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.removeEventListener(ALARMS_CHANGED_EVENT, run);
      window.clearInterval(interval);
      removeAppListener?.();
    };
  }, []);

  return null;
}
