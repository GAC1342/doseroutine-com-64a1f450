import { useEffect, useState } from "react";
import { X } from "lucide-react";

const ACK_KEY = "dr-rebrand-ack-v1";

/** One-time in-app banner for users who installed the PWA when it was still
 *  Stackwise. iOS and Android snapshot manifest.icons + apple-touch-startup
 *  splash tags at install time — no JS can flush those. Prompt the user to
 *  reinstall so the DR icon replaces the old Stackwise "S" on their home
 *  screen. Web visitors (non-standalone) never see this. */
export function RebrandReinstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(ACK_KEY) === "1") return;
      const mql = window.matchMedia("(display-mode: standalone)");
      const isStandalone =
        mql.matches ||
        // iOS Safari legacy flag
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      if (isStandalone) setShow(true);
    } catch {
      // Ignore — private mode / disabled storage; simply don't show.
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(ACK_KEY, "1");
    } catch {
      // Ignore storage errors.
    }
    setShow(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-3 mt-3 flex items-start gap-3 rounded-lg border border-border bg-background p-3 shadow-sm md:mx-6"
    >
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">New app icon available</p>
        <p className="mt-1 text-muted-foreground">
          You installed DoseRoutine when it was called Stackwise. To see the new
          <span className="font-medium text-foreground"> DR</span> icon and splash screen, remove
          DoseRoutine from your home screen and reinstall it from
          <span className="font-medium text-foreground"> doseroutine.com</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="tap-target -m-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
