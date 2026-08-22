import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { isNative } from "@/lib/platform";
import { canOpenAppSettings, openAppSettings } from "@/lib/app-settings";

const DISMISSED_KEY = "notif-prime-dismissed-v1";
const DENIED_DISMISSED_KEY = "notif-denied-dismissed-v1";

type Mode = "prime" | "denied" | null;

/**
 * Pre-permission priming card for iOS/Android.
 *
 * Apple best practice + higher opt-in rates: explain WHY you need
 * notifications before triggering the OS prompt. On accept, we call the
 * native LocalNotifications.requestPermissions() which shows the OS dialog.
 * We never re-prompt after a dismissal or a denial — the OS wouldn't show the
 * dialog again anyway.
 *
 * L5 — after a hard denial the only way back is the system Settings screen,
 * so we surface an explicit "Open Settings" recovery route instead of leaving
 * reminders silently broken.
 *
 * On web: no-op (browser notifications are handled via the push flow).
 */
export function NotificationPrimingCard() {
  const [mode, setMode] = useState<Mode>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    if (typeof localStorage === "undefined") return;

    (async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
          if (!localStorage.getItem(DISMISSED_KEY)) setMode("prime");
          return;
        }
        if (perm.display === "denied" && !localStorage.getItem(DENIED_DISMISSED_KEY)) {
          setMode("denied");
        }
      } catch {
        /* plugin not available on this platform */
      }
    })();
  }, []);

  async function accept() {
    setRequesting(true);
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.requestPermissions();
      localStorage.setItem(DISMISSED_KEY, "1");
      // Hard denial → immediately offer the Settings recovery route.
      setMode(result.display === "denied" ? "denied" : null);
    } catch (e) {
      console.warn("LocalNotifications request failed", e);
      localStorage.setItem(DISMISSED_KEY, "1");
      setMode(null);
    } finally {
      setRequesting(false);
    }
  }

  function dismiss() {
    localStorage.setItem(mode === "denied" ? DENIED_DISMISSED_KEY : DISMISSED_KEY, "1");
    setMode(null);
  }

  if (!mode) return null;

  const denied = mode === "denied";

  return (
    <div
      data-testid={denied ? "notification-denied-card" : "notification-priming-card"}
      className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/15 p-2">
          {denied ? (
            <BellOff className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {denied ? "Reminders are turned off" : "Never miss a dose"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {denied
              ? "Notifications are blocked for DoseRoutine, so dose reminders can't reach you. You can turn them back on in your device settings."
              : "Turn on notifications and DoseRoutine will remind you at the right time for every compound in your stack — with quiet hours you control."}
          </p>
          <div className="mt-3 flex gap-2">
            {denied ? (
              canOpenAppSettings() ? (
                <button
                  onClick={() => openAppSettings()}
                  data-testid="open-app-settings"
                  className="tap-target flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Open Settings
                </button>
              ) : null
            ) : (
              <button
                onClick={accept}
                disabled={requesting}
                className="tap-target flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {requesting ? "Requesting…" : "Enable reminders"}
              </button>
            )}
            <button
              onClick={dismiss}
              className="tap-target rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground"
            >
              {denied ? "Dismiss" : "Not now"}
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-full p-1 text-muted-foreground hover:bg-background"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
