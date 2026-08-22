/**
 * UTM / referral attribution capture.
 *
 * First touch is persisted in localStorage for 90 days so a visitor who lands
 * from a Reddit post, leaves, and signs up two days later is still credited to
 * Reddit. Last touch is kept per session. Both travel with the closed-testing
 * sign-up so the funnel can be measured by source.
 */

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];

export type Touch = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_path: string | null;
  at: string;
};

export type Attribution = {
  first: Touch | null;
  last: Touch | null;
};

const FIRST_KEY = "dr_attr_first";
const LAST_KEY = "dr_attr_last";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_LEN = 160;

function clean(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim().slice(0, MAX_LEN);
  return s.length ? s : null;
}

/** Known ad-click ids mapped to a sensible source when no utm_source is set. */
const CLICK_ID_SOURCES: Record<string, string> = {
  gclid: "google",
  gbraid: "google",
  wbraid: "google",
  fbclid: "facebook",
  ttclid: "tiktok",
  msclkid: "bing",
  twclid: "twitter",
  li_fat_id: "linkedin",
};

function referrerSource(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (typeof window !== "undefined" && host === window.location.hostname) return null;
    return host;
  } catch {
    return null;
  }
}

/** Reads the current URL/referrer into a touch record. Returns null when there is nothing new. */
export function readCurrentTouch(search?: string, referrer?: string): Touch | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(search ?? window.location.search);
  const rawRef = clean(referrer ?? document.referrer ?? null);
  // A same-site referrer is internal navigation, not an acquisition source.
  const ref = rawRef && referrerSource(rawRef) === null ? null : rawRef;

  const touch: Touch = {
    utm_source: clean(params.get("utm_source")),
    utm_medium: clean(params.get("utm_medium")),
    utm_campaign: clean(params.get("utm_campaign")),
    utm_content: clean(params.get("utm_content")),
    utm_term: clean(params.get("utm_term")),
    referrer: ref,
    landing_path: clean(window.location.pathname),
    at: new Date().toISOString(),
  };

  if (!touch.utm_source) {
    for (const [param, source] of Object.entries(CLICK_ID_SOURCES)) {
      if (params.get(param)) {
        touch.utm_source = source;
        touch.utm_medium = touch.utm_medium ?? "cpc";
        break;
      }
    }
  }

  if (!touch.utm_source) {
    const host = referrerSource(ref);
    if (host) {
      touch.utm_source = host;
      touch.utm_medium = touch.utm_medium ?? "referral";
    }
  }

  const hasSignal =
    !!touch.utm_source || !!touch.utm_medium || !!touch.utm_campaign || !!touch.referrer;
  return hasSignal ? touch : null;
}

function readStored(key: string, storage: Storage | null): Touch | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Touch;
    if (!parsed?.at) return null;
    if (Date.now() - new Date(parsed.at).getTime() > MAX_AGE_MS) {
      storage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function safeStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Records the current touch (call once on landing) and returns the full
 * attribution. Safe to call repeatedly — first touch is only written once.
 */
export function captureAttribution(): Attribution {
  const local = safeStorage("local");
  const session = safeStorage("session");
  const current = readCurrentTouch();

  if (current) {
    try {
      if (local && !readStored(FIRST_KEY, local)) {
        local.setItem(FIRST_KEY, JSON.stringify(current));
      }
      session?.setItem(LAST_KEY, JSON.stringify(current));
    } catch {
      /* storage blocked — attribution still returned for this pageview */
    }
  }

  return {
    first: readStored(FIRST_KEY, local) ?? current,
    last: current ?? readStored(LAST_KEY, session) ?? readStored(FIRST_KEY, local),
  };
}

/** Reads stored attribution without writing anything. */
export function getAttribution(): Attribution {
  const local = safeStorage("local");
  const session = safeStorage("session");
  return {
    first: readStored(FIRST_KEY, local),
    last: readStored(LAST_KEY, session) ?? readStored(FIRST_KEY, local),
  };
}

/** Flat, analytics-friendly shape of the attribution (first touch wins). */
export function attributionProperties(attr: Attribution = getAttribution()) {
  const t = attr.first ?? attr.last;
  return {
    utm_source: t?.utm_source ?? "direct",
    utm_medium: t?.utm_medium ?? "none",
    utm_campaign: t?.utm_campaign ?? "none",
    utm_content: t?.utm_content ?? null,
    utm_term: t?.utm_term ?? null,
    referrer: t?.referrer ?? null,
    landing_path: t?.landing_path ?? null,
    last_source: attr.last?.utm_source ?? null,
  };
}
