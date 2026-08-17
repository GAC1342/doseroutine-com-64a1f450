import { test as base, expect, type Page } from "@playwright/test";


/**
 * Visual regression baselines for the Neon Mint accent.
 *
 * Mint is the only accent whose light-mode value had to be darkened for
 * contrast, so a careless token edit can silently change chart fills, tooltip
 * swatches, legend chips or control fills without breaking a single unit test.
 * These snapshots pin the rendered pixels for:
 *   - insight charts (area, bars, multi-line, rotation, supply)
 *   - the chart tooltip (hover state)
 *   - the series legend chips (visible + hidden state)
 *   - UI controls (segmented chart-type toggle, primary CTA)
 * in both light and dark mode.
 *
 * Determinism rules (snapshots are worthless if they flake):
 *   - the clock is frozen, because demo/insight data is derived from "today"
 *   - animations, transitions and caret blink are disabled
 *   - only element screenshots are taken, never full-page
 *   - a small pixel budget absorbs anti-aliasing differences
 */

const THEME_KEY = "dr-theme";
const SCHEME_KEY = "dr-scheme";
const COOKIE_CONSENT_KEY = "doseroutine:cookie-consent:v1";
const WELCOME_TOUR_KEY = "doseroutine_welcome_tour_v1";
const INSTALL_DISMISSED_KEY = "doseroutine_install_sticky_dismissed";

/** Fixed instant so date-derived chart labels never shift between runs. */
const FROZEN_TIME = new Date("2026-03-15T12:00:00Z");

const MODES = ["light", "dark"] as const;
type Mode = (typeof MODES)[number];

const SNAPSHOT_OPTS = {
  // Anti-aliasing on curves/text differs slightly between machine and CI GPU.
  maxDiffPixelRatio: 0.02,
  animations: "disabled",
  scale: "css",
} as const;

const STABILISING_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
`;

/** Seed theme + dismiss first-run overlays before the first paint. */
async function primeMint(page: Page, mode: Mode) {
  // setFixedTime (not install) so Date is frozen without faking timers/rAF —
  // Recharts needs real timers for hover + resize handling.
  await page.clock.setFixedTime(FROZEN_TIME);
  await page.addInitScript(
    ([theme, scheme, keys]: [string, string, string[]]) => {
      const [themeKey, schemeKey, cookieKey, tourKey, installKey] = keys;
      localStorage.setItem(themeKey, theme);
      localStorage.setItem(schemeKey, scheme);
      localStorage.setItem(cookieKey, "accepted");
      localStorage.setItem(tourKey, new Date().toISOString());
      localStorage.setItem(installKey, "1");
    },
    ["mint", mode, [THEME_KEY, SCHEME_KEY, COOKIE_CONSENT_KEY, WELCOME_TOUR_KEY, INSTALL_DISMISSED_KEY]] as [
      string,
      string,
      string[],
    ],
  );
}

/** Assert the accent actually resolved to mint before comparing pixels. */
async function assertMintApplied(page: Page, mode: Mode) {
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          theme: document.documentElement.getAttribute("data-theme"),
          dark: document.documentElement.classList.contains("dark"),
        })),
      { timeout: 10_000, message: "theme did not settle on mint" },
    )
    .toEqual({ theme: "mint", dark: mode === "dark" });
}

async function settle(page: Page) {
  await page.addStyleTag({ content: STABILISING_CSS });
  await page.evaluate(() => document.fonts.ready);
  // Recharts sizes off a ResizeObserver; wait for two idle frames.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

/**
 * Recharts mounts bars/areas at zero size and grows them on the first frames.
 * Wait until every chart has actually painted geometry, otherwise a snapshot
 * can capture a flat, empty plot.
 */
async function chartsPainted(page: Page) {
  const geometry = () =>
    page.evaluate(() => {
      const surfaces = Array.from(document.querySelectorAll(".recharts-surface"));
      if (surfaces.length === 0) return "";
      return surfaces
        .map((svg) =>
          Array.from(svg.querySelectorAll("path, rect"))
            .map((el) => {
              const box = (el as SVGGraphicsElement).getBBox();
              return `${Math.round(box.width)}x${Math.round(box.height)}`;
            })
            .join(","),
        )
        .join("|");
    });

  // Poll until geometry stops changing across frames: Recharts grows bars and
  // areas with its own JS animation, so "painted" is not the same as "final".
  let previous = "";
  await expect
    .poll(
      async () => {
        const current = await geometry();
        const stable = current !== "" && current === previous && /[1-9]/.test(current);
        previous = current;
        return stable;
      },
      {
        intervals: [150, 150, 250, 250, 250, 500],
        timeout: 20_000,
        message: "charts should finish animating before snapshotting",
      },
    )
    .toBe(true);
}



const test = base.extend({});

test.describe.configure({ mode: "serial" });

for (const mode of MODES) {
  test.describe(`Neon Mint — ${mode} mode`, () => {
    test.use({ colorScheme: mode, reducedMotion: "reduce" });

    test(`insight charts render in mint (${mode})`, async ({ page }) => {
      await primeMint(page, mode);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await assertMintApplied(page, mode);

      const showcase = page.locator("#insights");
      await showcase.scrollIntoViewIfNeeded();
      const cards = showcase.getByTestId("insight-card");
      await expect(cards.first()).toBeVisible();
      await chartsPainted(page);
      await settle(page);

      const count = await cards.count();
      expect(count, "insights showcase should render its metric cards").toBeGreaterThan(2);

      for (let i = 0; i < Math.min(count, 6); i++) {
        await expect(cards.nth(i)).toHaveScreenshot(
          `insight-card-${i}-${mode}.png`,
          SNAPSHOT_OPTS,
        );
      }
    });

    test(`chart tooltip and hover state render in mint (${mode})`, async ({ page }) => {
      await primeMint(page, mode);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await assertMintApplied(page, mode);

      const card = page.locator("#insights").getByTestId("insight-card").first();
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      await settle(page);

      const surface = card.locator(".recharts-surface").first();
      await expect(surface).toBeVisible();

      // Recharts raises the tooltip on a mousemove *inside* the plot surface,
      // and needs a second move so the active index settles on one datapoint.
      // Hovering via the locator re-resolves the box each attempt, so a late
      // scroll or resize can't leave us pointing at stale coordinates.
      const tooltip = page.locator(".recharts-tooltip-wrapper").first();
      await expect(async () => {
        await surface.hover({ position: { x: 60, y: 40 } });
        await surface.hover({ position: { x: 140, y: 50 } });
        await expect(tooltip).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      await settle(page);



      await expect(card).toHaveScreenshot(`chart-tooltip-${mode}.png`, SNAPSHOT_OPTS);
    });

    test(`primary UI controls render in mint (${mode})`, async ({ page }) => {
      await primeMint(page, mode);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await assertMintApplied(page, mode);

      const cta = page.locator("#insights").getByRole("link", { name: /start tracking free/i }).first();
      await cta.scrollIntoViewIfNeeded();
      await expect(cta).toBeVisible();
      await settle(page);

      await expect(cta).toHaveScreenshot(`cta-button-${mode}.png`, SNAPSHOT_OPTS);
    });

    test(`chart-type toggle and series legend render in mint (${mode})`, async ({ page }) => {
      // Uses the internal harness route: the in-app controls only mount once
      // an account has logged data, which is not a stable CI precondition.
      await primeMint(page, mode);
      await page.goto("/lovable/visual/chart-controls", { waitUntil: "domcontentloaded" });
      await assertMintApplied(page, mode);

      const toggle = page.getByTestId("harness-variant-toggle");
      await expect(toggle).toBeVisible({ timeout: 15_000 });
      await settle(page);
      await expect(toggle).toHaveScreenshot(`chart-variant-toggle-${mode}.png`, SNAPSHOT_OPTS);

      // Selected state moves the mint fill to another segment.
      await toggle.getByRole("radio", { name: /bars chart/i }).click();
      await settle(page);
      await expect(toggle).toHaveScreenshot(`chart-variant-toggle-bars-${mode}.png`, SNAPSHOT_OPTS);

      const legend = page.getByTestId("harness-legend");
      await expect(legend).toBeVisible();
      await expect(legend).toHaveScreenshot(`chart-legend-${mode}.png`, SNAPSHOT_OPTS);

      // Hidden state uses a dashed chip with a hollow mint dot — a separate
      // rendering path worth pinning.
      const legendHidden = page.getByTestId("harness-legend-hidden");
      await expect(legendHidden).toBeVisible();
      await expect(legendHidden).toHaveScreenshot(`chart-legend-hidden-${mode}.png`, SNAPSHOT_OPTS);
    });

  });
}
