import { supabase } from "@/integrations/supabase/client";
import { isLikelyBotClient } from "@/lib/bot-detection";
import { isIndexablePath } from "@/lib/non-indexable";

const SESSION_KEY = "sw_session_id";
const BOT_FLAG_KEY = "sw_is_bot";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let s = window.sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return null;
  }
}

function detectBotOnce(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cached = window.sessionStorage.getItem(BOT_FLAG_KEY);
    if (cached === "1") return true;
    if (cached === "0") return false;
    const bot = isLikelyBotClient();
    window.sessionStorage.setItem(BOT_FLAG_KEY, bot ? "1" : "0");
    return bot;
  } catch {
    return isLikelyBotClient();
  }
}

/**
 * Where anonymous events (including `client_error` crash reports) are POSTed.
 *
 * In the packaged Capacitor app the web assets are served from the app bundle
 * (`capacitor://localhost`), so a relative `/api/public/analytics` has no
 * server behind it and every anonymous crash report is silently dropped —
 * exactly the reports we most need from App Store reviewers on a fresh
 * install. Native builds therefore post to the canonical production origin.
 */
export function analyticsEndpoint(): string {
  const path = "/api/public/analytics";
  if (typeof window === "undefined") return path;
  const proto = window.location.protocol;
  const isBundledNative = proto === "capacitor:" || proto === "file:" || proto === "ionic:";
  return isBundledNative ? `https://doseroutine.com${path}` : path;
}

/**
 * Fire-and-forget analytics event. Never throws, never blocks UI.
 *
 * Signed-in users insert directly via the browser client (RLS enforces
 * user_id = auth.uid()). Anonymous users POST to /api/public/analytics
 * which rate-limits per IP and writes via the service-role client — the
 * anon INSERT policy on analytics_events was revoked to prevent flooding.
 */
export function trackEvent(eventName: string, properties: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  try {
    const bot = detectBotOnce();
    const path = window.location.pathname + window.location.hash;
    // Don't pollute human analytics with bot scans of private app surfaces.
    // Public pages still record bot hits so we can monitor SEO crawler behavior.
    if (bot && !isIndexablePath(path)) return;

    const payload = {
      event_name: eventName,
      session_id: getSessionId(),
      path,
      properties: {
        ...properties,
        is_bot: bot,
        ua: navigator.userAgent?.slice(0, 240) ?? null,
      },
    };

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await supabase
            .from("analytics_events")
            .insert({ ...payload, user_id: data.session.user.id } as never);
          return;
        }
      } catch {
        /* fall through to public endpoint */
      }
      try {
        await fetch(analyticsEndpoint(), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
          signal: AbortSignal.timeout(8_000),
        });
      } catch {
        /* noop */
      }
    })();
  } catch {
    /* noop */
  }
}
