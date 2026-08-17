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
        await fetch("/api/public/analytics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch {
        /* noop */
      }
    })();
  } catch {
    /* noop */
  }
}
