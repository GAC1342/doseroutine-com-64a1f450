import { useEffect, useState } from "react";

/**
 * Cold-start offline handling.
 *
 * Launching the app in airplane mode is the worst case for a webview app: the
 * auth SDK can't refresh, route chunks can't download and loaders never
 * settle, so the user stares at a spinner (or a blank screen) with no idea
 * what went wrong. These helpers turn "hanging forever" into an explicit,
 * recoverable state.
 */

/** True when the platform reports no connectivity. Safe during SSR. */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** How long a pending route may spin before we call it stalled. */
export const STALL_ONLINE_MS = 8000;
/** Offline we don't need to be patient — nothing is going to arrive. */
export const STALL_OFFLINE_MS = 2500;

/**
 * Reports whether a pending screen has been waiting long enough that we should
 * stop spinning and show the recovery state instead. Resets automatically when
 * connectivity returns so a reconnect can retry rather than stay stuck.
 */
export function useBootStall(options?: { onlineMs?: number; offlineMs?: number }): boolean {
  const onlineMs = options?.onlineMs ?? STALL_ONLINE_MS;
  const offlineMs = options?.offlineMs ?? STALL_OFFLINE_MS;
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setStalled(true), isOffline() ? offlineMs : onlineMs);
    };

    const onOnline = () => {
      setStalled(false);
      arm();
    };
    const onOffline = () => arm();

    arm();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [onlineMs, offlineMs]);

  return stalled;
}
