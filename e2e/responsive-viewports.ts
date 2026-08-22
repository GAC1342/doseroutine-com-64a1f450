/**
 * Viewport matrix for the responsive screenshot suite
 * (`responsive-visual.spec.ts`).
 *
 * These are breakpoint boundaries, not specific handsets: each entry is the
 * width where our layout actually changes behaviour, so a regression shows up
 * once rather than five times across near-identical phones.
 *
 * CI can shard by viewport with `RESPONSIVE_VIEWPORTS=phone,tablet`, the same
 * env-filter pattern the illustration matrix uses (ART_VIEWPORTS).
 */

export type ResponsiveViewport = {
  name: string;
  width: number;
  height: number;
  class: "mobile" | "tablet" | "desktop";
};

export const ALL_RESPONSIVE_VIEWPORTS: readonly ResponsiveViewport[] = [
  // Smallest screen still in the field — the first place a grid stops fitting.
  { name: "phone-small", width: 320, height: 568, class: "mobile" },
  // iPhone SE (2nd/3rd gen) — the smallest handset with real market share.
  { name: "iphone-se", width: 375, height: 667, class: "mobile" },
  // iPhone 14 / 13 / 12 — the reference handset most users actually see.
  // (Formerly named "phone"; the old name still works as an env-filter alias.)
  { name: "iphone-14", width: 390, height: 844, class: "mobile" },

  // Pixel 7 — Android's common width; taller aspect than iPhone.
  { name: "pixel-7", width: 412, height: 915, class: "mobile" },
  // Large phone: bottom sheets and sticky CTAs get extra room here.
  { name: "phone-large", width: 430, height: 932, class: "mobile" },
  // iPad portrait — the `md` breakpoint, where two-column layouts kick in.
  { name: "tablet", width: 768, height: 1024, class: "tablet" },
  // iPad Pro 12.9" portrait — widest tablet; desktop-ish layouts on touch.
  { name: "ipad-pro", width: 1024, height: 1366, class: "tablet" },
  // Desktop reference; matches the default viewport in playwright.config.ts.
  { name: "laptop", width: 1280, height: 900, class: "desktop" },
];

/**
 * WebKit only runs the rows where Safari genuinely diverges (mobile/tablet
 * layout, safe-area insets, sticky positioning). Running the desktop row on
 * every engine would triple the baseline count for no extra signal.
 */
const WEBKIT_VIEWPORTS = new Set(["iphone-se", "iphone-14", "tablet", "ipad-pro"]);

/** Historical names accepted by the env filter so old CI configs keep working. */
const VIEWPORT_ALIASES: Record<string, string> = {
  phone: "iphone-14",
  iphone: "iphone-14",
  ipad: "tablet",
  pixel: "pixel-7",
};

/** Firefox is excluded from this suite entirely — see README. */
const SUITE_PROJECTS = new Set(["chromium", "webkit", "mobile-safari"]);

export function isResponsiveProject(project: string): boolean {
  return SUITE_PROJECTS.has(project);
}

/** Applies the `RESPONSIVE_VIEWPORTS` env filter (comma-separated names). */
export function filterByEnv(
  viewports: readonly ResponsiveViewport[],
  env: Record<string, string | undefined> = process.env,
): readonly ResponsiveViewport[] {
  const raw = (env["RESPONSIVE_VIEWPORTS"] ?? "").trim();
  if (!raw) return viewports;
  const wanted = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => VIEWPORT_ALIASES[s] ?? s),
  );
  const selected = viewports.filter((v) => wanted.has(v.name));
  if (selected.length === 0) {
    throw new Error(
      `RESPONSIVE_VIEWPORTS="${raw}" matched no viewport. Available: ${viewports
        .map((v) => v.name)
        .join(", ")}`,
    );
  }
  return selected;
}

/** The viewports a given Playwright project should snapshot. */
export function viewportsFor(
  project: string,
  env: Record<string, string | undefined> = process.env,
): readonly ResponsiveViewport[] {
  if (!isResponsiveProject(project)) return [];
  const base =
    project === "chromium"
      ? ALL_RESPONSIVE_VIEWPORTS
      : ALL_RESPONSIVE_VIEWPORTS.filter((v) => WEBKIT_VIEWPORTS.has(v.name));
  return filterByEnv(base, env);
}
