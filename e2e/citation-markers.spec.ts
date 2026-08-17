import { test, expect } from "@playwright/test";
import { dismissFirstRunOverlays } from "./utils";

/**
 * Inline citation markers ("[1]") must always resolve to a real entry in the
 * page's "Sources and references" list, and the browser back button must
 * return the reader to where they were reading.
 */
const SLUG = "/library/creatine";

test.describe("inline citation markers", () => {
  test("every marker jumps to a matching source entry, and back returns", async ({ page }) => {
    await page.goto(SLUG);
    await dismissFirstRunOverlays(page);
    await page.goto(SLUG);

    const sourcesHeading = page.getByRole("heading", { name: "Sources and references" });
    if ((await sourcesHeading.count()) === 0) {
      test.skip(true, "page has no resolvable sources");
    }
    await expect(sourcesHeading).toBeVisible();

    // Expand accordion sections so markers inside them are in the DOM.
    const triggers = page.locator('[data-slot="accordion-trigger"], button[aria-expanded="false"]');
    const triggerCount = await triggers.count();
    for (let i = 0; i < triggerCount; i++) {
      await triggers
        .nth(i)
        .click({ timeout: 2_000 })
        .catch(() => undefined);
    }

    const markers = page.locator('a[href^="#source-"][data-no-citation-modal="true"]');
    const total = await markers.count();
    expect(total, "expected at least one inline citation marker").toBeGreaterThan(0);

    const hrefs = await markers.evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    const unique = [...new Set(hrefs)];

    // 1. Every marker points at an existing, correctly numbered list entry.
    for (const href of unique) {
      const id = href.slice(1);
      const n = Number(id.replace("source-", ""));
      expect(Number.isFinite(n) && n > 0, `bad marker href: ${href}`).toBe(true);

      const target = page.locator(`#${id}`);
      await expect(target, `no sources entry for ${href}`).toHaveCount(1);
      // The entry's visible number must equal the marker number.
      await expect(target).toContainText(new RegExp(`^\\s*${n}\\.`));
      // The entry must live inside the "Sources and references" list.
      const inList = await target.evaluate((el) => {
        const section = el.closest("section");
        return Boolean(section?.querySelector("h2")?.textContent?.includes("Sources"));
      });
      expect(inList, `${href} is not inside the Sources list`).toBe(true);
    }

    // 2. Clicking a marker navigates to the hash and scrolls the entry into view.
    const first = markers.first();
    const firstHref = (await first.getAttribute("href")) ?? "";
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${firstHref.replace("#", "\\#")}$`));

    const targetId = firstHref.slice(1);
    const target = page.locator(`#${targetId}`);
    await expect(target).toBeInViewport({ timeout: 5_000 });

    // 3. Going back returns to the pre-jump location (no hash).
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${SLUG}/?$`));
    await expect(markers.first()).toBeVisible();
  });
});
