/**
 * Selectable color themes.
 *
 * Only brand tokens change per theme (see the [data-theme] blocks in
 * src/styles.css). Severity, success and money tokens are intentionally
 * invariant so clinical meaning never depends on a cosmetic preference.
 */

export const COLOR_THEMES = [
  { id: "teal", label: "Teal", swatch: "oklch(0.511 0.086 186)", pro: false },
  { id: "blue", label: "Blue", swatch: "oklch(0.512 0.152 257)", pro: false },
  { id: "turquoise", label: "Turquoise", swatch: "oklch(0.520 0.095 202)", pro: true },
  { id: "indigo", label: "Indigo", swatch: "oklch(0.470 0.170 276)", pro: true },
  { id: "green", label: "Green", swatch: "oklch(0.500 0.115 150)", pro: true },
  { id: "violet", label: "Violet", swatch: "oklch(0.495 0.190 305)", pro: true },
  { id: "mint", label: "Neon Mint", swatch: "oklch(0.700 0.160 168)", pro: true },
  { id: "neon-blue", label: "Neon Blue", swatch: "oklch(0.620 0.200 255)", pro: true },
  { id: "neon-pink", label: "Neon Pink", swatch: "oklch(0.655 0.266 352)", pro: true },
  { id: "neon-green", label: "Neon Green", swatch: "oklch(0.865 0.260 146)", pro: true },
  { id: "neon-yellow", label: "Neon Yellow", swatch: "oklch(0.880 0.176 95)", pro: true },
  { id: "graphite", label: "Graphite", swatch: "oklch(0.420 0.014 250)", pro: true },
] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number]["id"];
export type ColorScheme = "light" | "dark" | "system";

export const DEFAULT_COLOR_THEME: ColorTheme = "teal";
export const DEFAULT_COLOR_SCHEME: ColorScheme = "system";

export const THEME_STORAGE_KEY = "dr-theme";
export const SCHEME_STORAGE_KEY = "dr-scheme";

const THEME_IDS = COLOR_THEMES.map((t) => t.id) as readonly string[];

export function isColorTheme(value: unknown): value is ColorTheme {
  return typeof value === "string" && THEME_IDS.includes(value);
}

export function isColorScheme(value: unknown): value is ColorScheme {
  return value === "light" || value === "dark" || value === "system";
}

export function freeThemes(): ColorTheme[] {
  return COLOR_THEMES.filter((t) => !t.pro).map((t) => t.id);
}

/** Resolves "system" against the OS preference. Server-safe (defaults to light). */
export function resolveScheme(scheme: ColorScheme): "light" | "dark" {
  if (scheme !== "system") return scheme;
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Writes the theme onto <html>. Safe to call repeatedly. */
export function applyTheme(theme: ColorTheme, scheme: ColorScheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = resolveScheme(scheme) === "dark";
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-theme-booted", "1");
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

/**
 * Cookies mirror the localStorage choice. They exist so the very first paint
 * on a brand-new tab/device (where localStorage may be empty but the choice is
 * known) already uses the right accent — no teal-then-mint flash.
 */
export const THEME_COOKIE = "dr-theme";
export const SCHEME_COOKIE = "dr-scheme";

/** Persists theme/scheme to localStorage + cookie so boot can read either. */
export function persistThemeLocally(theme: ColorTheme, scheme?: ColorScheme) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (scheme) window.localStorage.setItem(SCHEME_STORAGE_KEY, scheme);
  } catch {
    /* private mode */
  }
  try {
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${oneYear}; SameSite=Lax`;
    if (scheme) {
      document.cookie = `${SCHEME_COOKIE}=${scheme}; path=/; max-age=${oneYear}; SameSite=Lax`;
    }
  } catch {
    /* cookies blocked */
  }
}

/** Reads the theme already painted on <html> by the boot script. */
export function readBootedTheme(): { theme: ColorTheme; scheme: ColorScheme } | null {
  if (typeof document === "undefined") return null;
  const t = document.documentElement.getAttribute("data-theme");
  if (!isColorTheme(t)) return null;
  let s: unknown = null;
  try {
    s = window.localStorage.getItem(SCHEME_STORAGE_KEY);
  } catch {
    s = null;
  }
  return { theme: t, scheme: isColorScheme(s) ? s : DEFAULT_COLOR_SCHEME };
}

/**
 * Inline script injected into <head> so the theme paints before hydration.
 * Kept dependency-free and defensive — a throw here would block first paint.
 *
 * Order of truth: localStorage -> cookie -> default. It also mirrors a cookie
 * value back into localStorage so later reads agree, and marks <html> as
 * booted so React can adopt the painted theme instead of re-deciding it.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var d=document.documentElement;
var IDS=${JSON.stringify(THEME_IDS)};
function ck(n){try{var m=document.cookie.match("(?:^|; )"+n+"=([^;]*)");return m?decodeURIComponent(m[1]):null;}catch(e){return null;}}
function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
var t=ls(${JSON.stringify(THEME_STORAGE_KEY)})||ck(${JSON.stringify(THEME_COOKIE)})||${JSON.stringify(DEFAULT_COLOR_THEME)};
var s=ls(${JSON.stringify(SCHEME_STORAGE_KEY)})||ck(${JSON.stringify(SCHEME_COOKIE)})||${JSON.stringify(DEFAULT_COLOR_SCHEME)};
if(IDS.indexOf(t)<0)t=${JSON.stringify(DEFAULT_COLOR_THEME)};
if(["light","dark","system"].indexOf(s)<0)s=${JSON.stringify(DEFAULT_COLOR_SCHEME)};
try{localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)},t);localStorage.setItem(${JSON.stringify(SCHEME_STORAGE_KEY)},s);}catch(e){}
d.setAttribute("data-theme",t);
d.setAttribute("data-theme-booted","1");
var dark=s==="dark"||(s==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
d.classList.toggle("dark",!!dark);
d.style.colorScheme=dark?"dark":"light";
}catch(e){}})();`;
