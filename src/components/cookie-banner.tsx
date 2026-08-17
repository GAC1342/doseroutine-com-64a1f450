import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "doseroutine:cookie-consent:v1";
/** Broadcast so other bottom-fixed layers (sticky CTA) can stand down. */
export const COOKIE_NOTICE_EVENT = "doseroutine:cookie-notice";

function broadcast(open: boolean) {
  try {
    document.documentElement.dataset.cookieNotice = open ? "open" : "closed";
    window.dispatchEvent(new CustomEvent(COOKIE_NOTICE_EVENT, { detail: { open } }));
  } catch {
    // non-browser env
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const open = !localStorage.getItem(STORAGE_KEY);
      setVisible(open);
      broadcast(open);
    } catch {
      // storage blocked — don't render
    }
    return () => broadcast(false);
  }, []);

  const dismiss = (value: "accepted" | "dismissed") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setVisible(false);
    broadcast(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      /* Kept intentionally compact: this mounts after hydration, so a large
         text block here becomes the LCP element on throttled mobile. */
      data-testid="cookie-banner"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
        Necessary cookies + privacy-respecting analytics.{" "}
        <Link to="/cookies" className="text-primary underline">
          Cookie policy
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => dismiss("accepted")}
          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-[color:var(--primary-hover)]"
        >
          Got it
        </button>
        <button
          onClick={() => dismiss("dismissed")}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
