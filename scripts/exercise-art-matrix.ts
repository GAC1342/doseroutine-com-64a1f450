/**
 * Emits the CI viewport/device matrix for the illustration visual regression
 * suite, derived from the single source of truth in
 * e2e/exercise-art-viewports.ts. Adding a viewport there adds a CI job here
 * automatically — no workflow edit required.
 *
 * Usage (in CI): bun scripts/exercise-art-matrix.ts >> "$GITHUB_OUTPUT"
 *   prints  matrix=<json>
 * Usage (local): bun scripts/exercise-art-matrix.ts --pretty
 */
import { ALL_VIEWPORTS } from "../e2e/exercise-art-viewports";

/** Engines every width is checked in. WebKit/Chromium also cover the density runs. */
const BROWSERS = ["chromium", "firefox", "webkit"] as const;

const include = ALL_VIEWPORTS.flatMap((viewport) =>
  BROWSERS.map((browser) => ({
    name: `${viewport.name}-${browser}`,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    class: viewport.class,
    browser,
    // Firefox ignores deviceScaleFactor, so it only runs the 1x control.
    dprs: browser === "firefox" ? "1" : "1,2,3",
  })),
);

const matrix = { include };

/**
 * Modal-stability fan-out: the same mobile widths, but run through the
 * `mobile-safari` Playwright project (WebKit engine + iPhone UA/touch/DPR).
 * iOS-style rendering is where the full-size illustration modal actually
 * overflows — dynamic Safari toolbars shrink the visual viewport and WebKit
 * rounds sub-pixel layout differently from Blink — so the containment,
 * scroll/resize, zoom and touch-target suites need their own WebKit jobs
 * rather than only the desktop-Safari pass in `include`.
 *
 * `engine` is what `playwright install` understands; `project` is the config
 * project name. Desktop widths are excluded: there is no iOS device that wide.
 */
const stabilityInclude = ALL_VIEWPORTS.filter((v) => v.class === "mobile").map((viewport) => ({
  name: `${viewport.name}-mobile-safari`,
  viewport: viewport.name,
  width: viewport.width,
  height: viewport.height,
  class: viewport.class,
  engine: "webkit",
  project: "mobile-safari",
  // WebKit honours deviceScaleFactor, so the full Retina/high-density ladder runs.
  dprs: "1,2,3",
}));

const stabilityMatrix = { include: stabilityInclude };

const pretty = process.argv.includes("--pretty");
const which = process.argv.includes("--stability") ? stabilityMatrix : matrix;
const key = process.argv.includes("--stability") ? "stability" : "matrix";

if (pretty) {
  console.log(JSON.stringify(which, null, 2));
} else {
  console.log(`${key}=${JSON.stringify(which)}`);
}
