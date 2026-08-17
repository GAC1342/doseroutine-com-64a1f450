/**
 * Shared bot-detection helpers for admin analytics reports.
 *
 * User-agent flags catch declared crawlers; the behavioural pass catches
 * headless crawlers that present a normal desktop UA and no referrer but
 * sweep far more pages, far faster, than a person reads.
 */

/** A session crawling this fast is not a person reading pages. */
export const BOT_PAGES_PER_SESSION = 15;
export const BOT_BURST_PAGES = 8;
export const BOT_BURST_WINDOW_MS = 60_000;

export type SessionTimedEvent = {
  sessionId: string;
  ts: number;
};

/**
 * Returns the set of session ids that look automated purely from crawl
 * behaviour (page count / burst rate). Pass every event in the window.
 */
export function findBehavioralBotSessions(events: SessionTimedEvent[]): Set<string> {
  const perSession = new Map<string, number[]>();
  for (const e of events) {
    if (!e.sessionId) continue;
    const list = perSession.get(e.sessionId);
    if (list) list.push(e.ts);
    else perSession.set(e.sessionId, [e.ts]);
  }

  const behavioral = new Set<string>();
  for (const [sessionId, stamps] of perSession) {
    if (stamps.length >= BOT_PAGES_PER_SESSION) {
      behavioral.add(sessionId);
      continue;
    }
    if (stamps.length >= BOT_BURST_PAGES) {
      const sorted = stamps.slice().sort((a, b) => a - b);
      const span = sorted[sorted.length - 1] - sorted[0];
      if (span >= 0 && span <= BOT_BURST_WINDOW_MS) behavioral.add(sessionId);
    }
  }
  return behavioral;
}

/** Groups a user-agent string into a readable crawler family. */
export function botFamilyFromUa(ua: string): string {
  if (/meta-externalagent|facebookexternalhit|facebot/i.test(ua)) return "Meta";
  if (/gptbot|chatgpt-user|oai-searchbot/i.test(ua)) return "OpenAI";
  if (/claudebot|claude-web|anthropic-ai/i.test(ua)) return "Anthropic";
  if (/perplexitybot|perplexity-user/i.test(ua)) return "Perplexity";
  if (/googlebot|google-extended/i.test(ua)) return "Google";
  if (/bingbot|slurp|duckduckbot/i.test(ua)) return "Search engine";
  if (/ahrefsbot|semrushbot|mj12bot|dotbot/i.test(ua)) return "SEO tool";
  if (/headlesschrome|phantomjs|puppeteer|playwright/i.test(ua)) return "Headless";
  return "Other";
}

export type DeviceKind = "mobile" | "tablet" | "desktop" | "unknown";

/** Best-effort device class from the stored user-agent string. */
export function deviceFromUa(ua: string): DeviceKind {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/.test(s))
    return "mobile";
  if (/mozilla|chrome|safari|firefox|edge|opera/.test(s)) return "desktop";
  return "unknown";
}

export const DEVICE_LABELS: Record<DeviceKind, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
  unknown: "Unknown",
};

/** Strips query/hash and trailing slash so landing pages group cleanly. */
export function normalizeAnalyticsPath(path: string): string {
  const clean = (path || "").split("#")[0].split("?")[0];
  if (!clean) return "/";
  return clean.length > 1 && clean.endsWith("/") ? clean.slice(0, -1) : clean;
}
