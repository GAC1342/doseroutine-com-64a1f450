import { test, expect } from "./utils";
import { USE_CASE_LIST } from "../src/lib/app-roundups";

/**
 * Smoke coverage for the /for use-case hub on mobile and desktop viewports.
 *
 * Asserts, per viewport, that:
 *  - the hub renders exactly one H1 and one card link per use case,
 *  - every use-case link has unique, descriptive anchor text that names its
 *    destination (no "Read more"/"Learn more"),
 *  - each link actually navigates to the matching /for/<slug> page, which
 *    renders its own unique H1.
 */

const VIEWPORTS = [
  { name: "mobile", size: { width: 390, height: 844 } },
  { name: "desktop", size: { width: 1280, height: 900 } },
];

const GENERIC = ["read more", "learn more", "click here", "more", "here", "see more"];

for (const viewport of VIEWPORTS) {
  test.describe(`/for @ ${viewport.name}`, () => {
    test.use({ viewport: viewport.size });

    test("hub lists every use case with unique descriptive links", async ({ page }) => {
      await page.goto("/for", { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toHaveCount(1);

      const texts: string[] = [];
      for (const useCase of USE_CASE_LIST) {
        const link = page.locator(`a[href$="/for/${useCase.slug}"]`).first();
        await expect(link, `link to /for/${useCase.slug}`).toBeVisible();
        const text = ((await link.innerText()) || "").replace(/\s+/g, " ").trim();
        expect(GENERIC).not.toContain(text.toLowerCase().replace(/[.…»>→\s]+$/, ""));
        expect(text.toLowerCase()).toContain(useCase.h1.toLowerCase());
        texts.push(text.toLowerCase());
      }
      expect(new Set(texts).size).toBe(texts.length);
    });

    for (const useCase of USE_CASE_LIST) {
      test(`/for/${useCase.slug} loads with the promised heading`, async ({ page }) => {
        await page.goto("/for", { waitUntil: "domcontentloaded" });
        await page.locator(`a[href$="/for/${useCase.slug}"]`).first().click();
        await page.waitForURL(new RegExp(`/for/${useCase.slug}$`));
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("h1")).toHaveText(useCase.h1);
        await expect(page.locator("h2").first()).toBeVisible();
      });
    }
  });
}
