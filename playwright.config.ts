import { defineConfig, devices } from "@playwright/test";
import { pinnedFirefoxPath } from "./scripts/install-playwright-firefox.mjs";

/**
 * Firefox executable: PLAYWRIGHT_FIREFOX_PATH wins, otherwise the wrapper
 * pinned by `npm run e2e:install:firefox` (matching revision + the library
 * path it needs on Nix images). Empty string means "use Playwright's default".
 */
const FIREFOX_PATH = pinnedFirefoxPath();

/**
 * E2E tests for DoseRoutine breadcrumbs across nested authenticated routes.
 *
 * The dev server is expected to be running on http://localhost:8080 (Vite).
 * Set TEST_USER_EMAIL / TEST_USER_PASSWORD to sign in with an email account
 * that already exists in the project. Tests that require auth are skipped
 * when credentials are absent.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  // CI also emits the HTML report on every run (pass or fail) so
  // scripts/collect-visual-artifacts.mjs can ship it as an artifact.
  reporter: process.env.CI
    ? [["blob"], ["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    // Nightly runs capture full traces/screenshots/videos for every test so
    // debugging doesn't depend on a rerun; PR/push runs stay retain-on-failure
    // to keep artifact size and wall-clock small.
    trace: process.env.PW_FULL_ARTIFACTS ? "on" : "retain-on-failure",
    screenshot: process.env.PW_FULL_ARTIFACTS ? "on" : "only-on-failure",
    // Videos are downscaled so the per-test clip stays small enough to upload
    // as a CI artifact and play inline in the failure-media gallery.
    video: {
      mode: process.env.PW_FULL_ARTIFACTS ? "on" : "retain-on-failure",
      size: { width: 640, height: 900 },
    },
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Allows pointing at a preinstalled Chromium (sandboxes/CI images that
        // ship their own binary). Ignored when unset.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // Firefox has no isMobile/hasTouch emulation; some bundled builds
        // reject the option outright at the protocol level, which reads as an
        // unrelated "not described in this scheme" crash. Strip them.
        isMobile: undefined,
        hasTouch: undefined,
        // Deterministic rendering for pixel baselines: no smooth scrolling, no
        // chrome animations, no first-run/telemetry UI drawing over the page,
        // and reduced motion so CSS transitions settle instantly.
        launchOptions: {
          ...(FIREFOX_PATH ? { executablePath: FIREFOX_PATH } : {}),
          firefoxUserPrefs: {
            "general.smoothScroll": false,
            "toolkit.cosmeticAnimations.enabled": false,
            "ui.prefersReducedMotion": 1,
            "gfx.font_rendering.fontconfig.max_generic_substitutions": 0,
            "browser.startup.homepage_override.mstone": "ignore",
            "datareporting.policy.dataSubmissionEnabled": false,
            "toolkit.telemetry.enabled": false,
            "browser.shell.checkDefaultBrowser": false,
            "app.update.auto": false,
            "network.dns.disablePrefetch": true,
            "network.prefetch-next": false,
          },
        },
      },
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        // Same escape hatch as Chromium/Firefox: point at a preinstalled
        // WebKit build when the image ships its own. Ignored when unset.
        ...(process.env.PLAYWRIGHT_WEBKIT_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_WEBKIT_PATH } }
          : {}),
      },
    },
    {
      // iOS Safari: WebKit with the iPhone user agent, touch input and mobile
      // flags. Specs override the viewport themselves (e.g. landscape sizes),
      // so only the device characteristics come from the preset.
      name: "mobile-safari",
      use: {
        ...devices["iPhone 13"],
        ...(process.env.PLAYWRIGHT_WEBKIT_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_WEBKIT_PATH } }
          : {}),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:8080",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
