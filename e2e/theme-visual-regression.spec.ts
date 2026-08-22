import { test, expect } from "./utils";

/**
 * Visual regression for theme color + illustration presence.
 *
 * Two classes of bug shipped before and are guarded here:
 *   1. neon themes rendering dull (a token edited to a low-chroma value, or a
 *      theme not applying at all so the page stays teal),
 *   2. exercise illustrations missing / not loading (a new exercise added
 *      without art, or a stale cached URL 404ing).
 *
 * Instead of pixel snapshots (which churn on every copy tweak) this compares
 * *computed colors* and *decoded images* on the main pages.
 */

const THEMES = ["neon-blue", "neon-pink", "neon-green", "neon-yellow"] as const;
const PAGES = ["/", "/booty-workout", "/peptide-calculator"];

/** Parse any computed CSS color into sRGB 0-1 and report its saturation. */
function saturationOf(color: string): number {
  const m = color.match(/-?[\d.]+/g);
  if (!m) return 0;
  const [r, g, b] = m.slice(0, 3).map((v) => Number(v) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

async function applyTheme(page: import("@playwright/test").Page, theme: string, scheme: string) {
  await page.evaluate(
    ([t, s]) => {
      localStorage.setItem("dr-theme", t);
      localStorage.setItem("dr-scheme", s);
      document.documentElement.setAttribute("data-theme", t);
      document.documentElement.classList.toggle("dark", s === "dark");
    },
    [theme, scheme],
  );
}

test.describe("theme + illustration visual regression", () => {
  for (const theme of THEMES) {
    for (const scheme of ["light", "dark"] as const) {
      test(`${theme} (${scheme}) renders a vivid, distinct primary`, async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await applyTheme(page, theme, scheme);

        const { primary, background, foreground } = await page.evaluate(() => {
          const cs = getComputedStyle(document.documentElement);
          const probe = document.createElement("div");
          document.body.appendChild(probe);
          const read = (token: string) => {
            probe.style.color = `var(${token})`;
            return getComputedStyle(probe).color;
          };
          const out = {
            primary: read("--primary"),
            background: read("--background"),
            foreground: cs.getPropertyValue("--foreground"),
          };
          probe.remove();
          return out;
        });

        // Neon primary must be clearly colorful, not a washed-out gray.
        expect(saturationOf(primary), `${theme} primary ${primary}`).toBeGreaterThan(0.35);
        // ...and clearly different from the page background.
        expect(saturationOf(background)).toBeLessThan(0.2);
        expect(primary).not.toBe(background);
        expect(foreground.length).toBeGreaterThan(0);
      });
    }
  }

  test("theme choice survives a reload and a navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await applyTheme(page, "neon-pink", "dark");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "neon-pink");
    await page.goto("/booty-workout", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "neon-pink");
  });

  for (const path of PAGES) {
    test(`every image on ${path} actually decodes`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      await page.waitForTimeout(1200);
      const broken = await page.evaluate(() =>
        [...document.querySelectorAll("img")]
          .filter((img) => img.loading !== "lazy" || img.getBoundingClientRect().top < innerHeight)
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src),
      );
      expect(broken, `broken images on ${path}`).toEqual([]);
    });
  }

  test("workout illustrations carry the cache-busting version stamp", async ({ page }) => {
    await page.goto("/booty-workout", { waitUntil: "load" });
    const cards = page
      .locator("[data-exercise-card], article, li")
      .filter({ has: page.locator("img") });
    await expect(cards.first()).toBeVisible();

    const srcs = await page
      .locator("img")
      .evaluateAll((imgs) =>
        imgs.map((i) => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src),
      );
    const art = srcs.filter((s) => s.includes("/assets-v1/") || s.includes("/exercises/"));
    expect(art.length, "exercise illustrations on the page").toBeGreaterThan(0);
    // Cache-busting stamp must survive into the rendered markup.
    for (const src of art) expect(src, src).toMatch(/[?&]v=/);
  });
});
