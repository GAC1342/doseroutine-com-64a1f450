#!/usr/bin/env node
/**
 * Automatic token mapping for the dark-contrast lint.
 *
 * Maps light-only Tailwind palette classes onto the project's semantic design
 * tokens so the lint can *suggest* (and with `--fix`, apply) a replacement
 * instead of only reporting a failure.
 *
 * The mapping is intentionally conservative: a class only gets an automatic
 * replacement when the semantic intent is unambiguous (severity/status chips,
 * neutral surfaces, muted text, links). Anything else falls back to a
 * "pair it with a dark: variant" hint.
 */

/** Palette family -> severity token stem. */
const SEVERITY_FAMILY = {
  red: "avoid",
  rose: "avoid",
  orange: "caution",
  amber: "caution",
  yellow: "caution",
  lime: "synergy",
  green: "synergy",
  emerald: "synergy",
  teal: "synergy",
  cyan: "note",
  sky: "note",
  blue: "note",
  indigo: "note",
  violet: "note",
  purple: "note",
  fuchsia: "note",
  pink: "avoid",
};

const NEUTRAL_FAMILIES = new Set(["slate", "gray", "zinc", "neutral", "stone"]);

/** Shades at or below this read as a *surface* tint rather than a foreground. */
const SURFACE_MAX_SHADE = 300;

/**
 * @param {string} cls  e.g. "bg-amber-50"
 * @returns {{utility:string, family:string, shade:number, alpha:string|null}|null}
 */
export function parseColorClass(cls) {
  const m = /^([a-z-]+)-([a-z]+)-(\d{2,3})(?:\/(\d{1,3}))?$/.exec(cls);
  if (!m) return null;
  return { utility: m[1], family: m[2], shade: Number(m[3]), alpha: m[4] ?? null };
}

/**
 * Suggest a semantic replacement for a light-only palette class.
 *
 * @param {string} cls        the offending class, without variant prefix
 * @param {object} [context]  { isLink, isSkeleton, isInteractive, variants }
 * @returns {{token:string|null, reason:string}}
 */
export function suggestToken(cls, context = {}) {
  const parsed = parseColorClass(cls);
  if (!parsed) return { token: null, reason: "no automatic mapping" };
  const { utility, family, shade } = parsed;
  const variants = context.variants ?? "";
  const prefix = variants ? `${variants}` : "";
  const withPrefix = (token) => `${prefix}${token}`;

  // Skeleton / loading placeholders always want the neutral surface token.
  if (context.isSkeleton && (utility === "bg" || utility === "border")) {
    return {
      token: withPrefix(utility === "bg" ? "bg-muted" : "border-border"),
      reason: "loading placeholders must use the neutral surface token",
    };
  }

  // Links: brand colour, not a raw palette blue.
  if (context.isLink && utility === "text") {
    return {
      token: withPrefix("text-primary"),
      reason: "links should use the themed primary colour",
    };
  }

  if (NEUTRAL_FAMILIES.has(family)) {
    const neutral = {
      bg: shade <= SURFACE_MAX_SHADE ? "bg-muted" : "bg-foreground",
      text: shade <= 500 ? "text-muted-foreground" : "text-foreground",
      border: "border-border",
      divide: "divide-border",
      ring: "ring-ring",
      placeholder: "placeholder:text-muted-foreground",
      fill: "fill-muted-foreground",
      stroke: "stroke-muted-foreground",
    }[utility];
    return neutral
      ? { token: withPrefix(neutral), reason: "neutral palette has a themed equivalent" }
      : { token: null, reason: "no automatic mapping" };
  }

  const severity = SEVERITY_FAMILY[family];
  if (!severity) return { token: null, reason: "no automatic mapping" };

  if (utility === "bg") {
    return {
      token: withPrefix(`bg-[color:var(--severity-${severity}-bg)]`),
      reason: `${family} surface reads as the "${severity}" severity tone`,
    };
  }
  if (utility === "text" || utility === "fill" || utility === "stroke") {
    return {
      token: withPrefix(`${utility}-[color:var(--severity-${severity})]`),
      reason: `${family} foreground reads as the "${severity}" severity tone`,
    };
  }
  if (utility === "border" || utility === "ring" || utility === "outline" || utility === "divide") {
    return {
      token: withPrefix(`${utility}-[color:var(--severity-${severity})]`),
      reason: `${family} edge reads as the "${severity}" severity tone`,
    };
  }
  return { token: null, reason: "no automatic mapping" };
}

/**
 * Fallback hint when no token maps cleanly: pair the class with a dark:
 * counterpart at the mirrored shade (50 <-> 950, 100 <-> 900, ...).
 * @param {string} cls
 * @returns {string|null}
 */
export function mirrorDarkVariant(cls) {
  const parsed = parseColorClass(cls);
  if (!parsed) return null;
  const mirror = {
    50: 950,
    100: 900,
    200: 800,
    300: 700,
    400: 600,
    500: 500,
    600: 400,
    700: 300,
    800: 200,
    900: 100,
    950: 50,
  };
  const target = mirror[parsed.shade];
  if (!target) return null;
  const alpha = parsed.alpha ? `/${parsed.alpha}` : "";
  return `dark:${parsed.utility}-${parsed.family}-${target}${alpha}`;
}
