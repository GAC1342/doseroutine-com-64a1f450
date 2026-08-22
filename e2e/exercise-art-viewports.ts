/**
 * Single source of truth for the widths and pixel densities the workout-type
 * illustration must hold its geometry at.
 *
 * Both the pixel-regression suite (exercise-art-visual.spec.ts) and the
 * density suite (exercise-art-dpr.spec.ts) read this list, and CI fans it out
 * into one job per viewport (see .github/workflows/exercise-art-matrix.yml)
 * via the ART_VIEWPORTS / ART_DPRS env filters. Adding a device here adds it
 * to the matrix automatically — the workflow enumerates this file at runtime.
 */

export type ArtViewport = {
  name: string;
  width: number;
  height: number;
  /** "mobile" covers phones and tablets; "desktop" covers laptop widths up. */
  class: "mobile" | "desktop";
};

/**
 * Widths AND heights both matter here: the workout sheet is a scroll container
 * and the full-size modal is sized from the illustration's aspect ratio, so a
 * short viewport is the case where the dialog gets clipped even though the
 * width is fine. The list therefore covers the common phone *heights* in the
 * field (568/640/667/740/844/852/896/915/926/932) and not just widths:
 *
 *   phone-320x568  iPhone SE (1st gen) — smallest screen still in use
 *   phone-360x640  the most common short Android viewport
 *   phone-360      360x740 tall narrow Android
 *   phone-375x667  iPhone SE (2nd/3rd gen), iPhone 8
 *   phone-390      iPhone 12/13/14 — the reference device
 *   phone-393x852  Pixel 8 / iPhone 14 Pro
 *   phone-412x915  Pixel 7 Pro
 *   phone-414      iPhone 11 / XR
 *   phone-428x926  iPhone 14 Plus
 *   phone-430      iPhone 15 Pro Max
 * plus portrait/landscape tablets, a laptop and a wide desktop.
 */
export const ALL_VIEWPORTS: readonly ArtViewport[] = [
  { name: "phone-320x568", width: 320, height: 568, class: "mobile" },
  { name: "phone-360x640", width: 360, height: 640, class: "mobile" },
  { name: "phone-360", width: 360, height: 740, class: "mobile" },
  { name: "phone-375x667", width: 375, height: 667, class: "mobile" },
  { name: "phone-390", width: 390, height: 844, class: "mobile" },
  { name: "phone-393x852", width: 393, height: 852, class: "mobile" },
  { name: "phone-412x915", width: 412, height: 915, class: "mobile" },
  { name: "phone-414", width: 414, height: 896, class: "mobile" },
  { name: "phone-428x926", width: 428, height: 926, class: "mobile" },
  { name: "phone-430", width: 430, height: 932, class: "mobile" },
  { name: "tablet-768", width: 768, height: 1024, class: "mobile" },
  { name: "tablet-1024", width: 1024, height: 768, class: "mobile" },
  { name: "laptop-1280", width: 1280, height: 900, class: "desktop" },
  { name: "desktop-1440", width: 1440, height: 900, class: "desktop" },
] as const;

/**
 * The shortest viewport of each width family — the ones most likely to clip a
 * dialog vertically. Used as the default keyboard-suite matrix so that suite
 * stays fast while still covering the tight cases.
 */
export const SHORT_VIEWPORT_NAMES = ["phone-320x568", "phone-360x640", "phone-375x667"] as const;

/** Retina and high-density Android, with 1x as the control. */
export const ALL_DPRS = [1, 2, 3] as const;

/**
 * Rotates a viewport 90 degrees. Landscape phones are the tightest case for a
 * full-size illustration modal: the height collapses to ~360-430 CSS px, so a
 * dialog sized from the image's aspect ratio can easily overflow vertically.
 * The `-landscape` suffix keeps snapshot filenames distinct from portrait.
 */
export function landscape(viewport: ArtViewport): ArtViewport {
  return {
    name: `${viewport.name}-landscape`,
    width: viewport.height,
    height: viewport.width,
    class: viewport.class,
  };
}

/**
 * The landscape form of whatever `selectedViewports()` resolved to.
 *
 * Phones and tablets are rotated 90 degrees. Desktop widths are already
 * landscape (1280x900, 1440x900) — rotating them would produce a portrait
 * canvas no laptop ever has, so they are kept at their native size and only
 * given the `-landscape` suffix so they run the same full-size modal cutoff
 * assertions with their own snapshot filenames.
 */
export function selectedLandscapeViewports(): readonly ArtViewport[] {
  return selectedViewports().map((v) =>
    v.class === "mobile" ? landscape(v) : { ...v, name: `${v.name}-landscape` },
  );
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Viewports for this run. `ART_VIEWPORTS` accepts viewport names, the classes
 * "mobile"/"desktop", the "short" preset, or "all" (default). Unknown names fail loudly rather
 * than silently running nothing.
 */
export function selectedViewports(): readonly ArtViewport[] {
  const requested = parseList(process.env.ART_VIEWPORTS);
  if (requested.length === 0 || requested.includes("all")) return ALL_VIEWPORTS;

  const picked: ArtViewport[] = [];
  for (const token of requested) {
    if (token === "short") {
      picked.push(...ALL_VIEWPORTS.filter((v) => SHORT_VIEWPORT_NAMES.includes(v.name as never)));
      continue;
    }
    if (token === "mobile" || token === "desktop") {
      picked.push(...ALL_VIEWPORTS.filter((v) => v.class === token));
      continue;
    }
    const match = ALL_VIEWPORTS.find((v) => v.name === token);
    if (!match) {
      throw new Error(
        `Unknown ART_VIEWPORTS entry "${token}". Known: ${ALL_VIEWPORTS.map((v) => v.name).join(", ")}, mobile, desktop, short, all`,
      );
    }
    picked.push(match);
  }
  return [...new Map(picked.map((v) => [v.name, v])).values()];
}

/** Densities for this run. `ART_DPRS` accepts a comma list such as "1,2,3". */
export function selectedDprs(): readonly number[] {
  const requested = parseList(process.env.ART_DPRS);
  if (requested.length === 0) return ALL_DPRS;
  const parsed = requested.map((v) => Number(v));
  if (parsed.some((n) => !Number.isFinite(n) || n <= 0)) {
    throw new Error(`Invalid ART_DPRS value "${process.env.ART_DPRS}". Use e.g. "1,2,3".`);
  }
  return parsed;
}
