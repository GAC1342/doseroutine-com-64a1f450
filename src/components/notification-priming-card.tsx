import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { isNative } from "@/lib/platform";

const DISMISSED_KEY = "notif-prime-dismissed-v1";

/**
 * Pre-permission priming card for iOS/Android.
 *
 * Apple best practice + higher opt-in rates: explain WHY you need
 * notifications before triggering the OS prompt. On accept, we call the
 * native LocalNotifications.requestPermissions() which shows the OS dialog.
 * On dismiss, we don't ask again (user can re-enable in device Settings).
 *
 * On web: no-op (browser notifications are handled via the push flow).
 */
export function NotificationPrimingCard() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    (async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
          setVisible(true);
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
      await LocalNotifications.requestPermissions();
    } catch (e) {
      console.warn("LocalNotifications request failed", e);
    } finally {
      localStorage.setItem(DISMISSED_KEY, "1");
      setVisible(false);
      setRequesting(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/15 p-2">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Never miss a dose</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Turn on notifications and DoseRoutine will remind you at the right time for every
            compound in your stack — with quiet hours you control.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={accept}
              disabled={requesting}
              className="tap-target flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {requesting ? "Requesting…" : "Enable reminders"}
            </button>
            <button
              onClick={dismiss}
              className="tap-target rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground"
            >
              Not now
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
