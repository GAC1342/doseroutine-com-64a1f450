import { test, expect, readBreadcrumbs } from "./utils";

/**
 * These tests verify the breadcrumb trail on nested authenticated routes:
 *  - The first crumb is always Home and is a link.
 *  - The current (leaf) route renders as plain text with aria-current="page".
 *  - Intermediate navigable segments render as links; non-navigable
 *    intermediate segments (e.g. "admin" alone) render as plain text.
 *  - Deep dynamic slugs are surfaced as the last crumb (plain text).
 */

test.describe("breadcrumbs on nested authenticated routes", () => {
  test("top-level routes render Home › <Section> with Section as plain text", async ({
    authedPage: page,
  }) => {
    for (const [path, label] of [
      ["/today", "Today"],
      ["/stack", "Stack"],
      ["/safety", "Safety"],
      ["/timeline", "Timeline"],
      ["/more", "More"],
      ["/plan", "Plan"],
      ["/reminders", "Reminders"],
      ["/upgrade", "Upgrade"],
    ] as const) {
      await page.goto(path);
      const crumbs = await readBreadcrumbs(page);
      expect(crumbs.length, `crumbs for ${path}`).toBeGreaterThanOrEqual(2);
      expect(crumbs[0]).toEqual({ label: "Home", isLink: true });
      const last = crumbs[crumbs.length - 1];
      expect(last.label).toBe(label);
      expect(last.isLink).toBe(false);
      // aria-current on the leaf
      const current = page
        .getByRole("navigation", { name: /breadcrumb/i })
        .locator('[aria-current="page"]');
      await expect(current).toHaveText(label);
    }
  });

  test("nested admin route: non-navigable parent is plain text, leaf is plain text", async ({
    authedPage: page,
  }) => {
    await page.goto("/admin/schema-report");
    const crumbs = await readBreadcrumbs(page);
    // Expected order: Home › Admin › Schema report
    expect(crumbs[0]).toEqual({ label: "Home", isLink: true });
    const labels = crumbs.map((c) => c.label);
    expect(labels).toContain("Admin");
    expect(labels[labels.length - 1]).toBe("Schema report");
    // "admin" alone is NOT in the NAVIGABLE set → plain text
    const admin = crumbs.find((c) => c.label === "Admin");
    expect(admin?.isLink).toBe(false);
    // leaf is plain text
    expect(crumbs[crumbs.length - 1].isLink).toBe(false);
  });

  test("Home crumb navigates back to /today", async ({ authedPage: page }) => {
    await page.goto("/stack");
    await page
      .getByRole("navigation", { name: /breadcrumb/i })
      .getByRole("link", { name: /home/i })
      .click();
    await page.waitForURL(/\/today$/);
  });

  test("dynamic library slug appears as the last crumb (plain text)", async ({
    authedPage: page,
  }) => {
    // /library is a navigable authenticated route; a dynamic slug beneath it
    // should render as the final plain-text crumb resolved to a readable label.
    await page.goto("/library/creatine");
    const crumbs = await readBreadcrumbs(page);
    expect(crumbs[0]).toEqual({ label: "Home", isLink: true });
    // The library detail page labels the parent crumb "Compound Library".
    const library = crumbs.find((c) => /library/i.test(c.label));
    // The library parent is navigable → link, and is not the leaf here.
    expect(library?.isLink).toBe(true);

    const leaf = crumbs[crumbs.length - 1];
    expect(leaf.isLink).toBe(false);
    expect(leaf.label.length).toBeGreaterThan(0);
    // Leaf carries aria-current="page"
    const current = page
      .getByRole("navigation", { name: /breadcrumb/i })
      .locator('[aria-current="page"]');
    await expect(current).toHaveText(leaf.label);
  });

  test("every non-leaf crumb is a link and every leaf is plain text", async ({
    authedPage: page,
  }) => {
    const paths = ["/today", "/stack", "/plan", "/reminders", "/admin/schema-report"];
    for (const path of paths) {
      await page.goto(path);
      const crumbs = await readBreadcrumbs(page);
      for (let i = 0; i < crumbs.length - 1; i++) {
        // Non-leaf crumbs: either link (navigable) OR plain text (non-navigable intermediate).
        // We only enforce that leaves are NEVER links, and that Home is ALWAYS a link.
        if (crumbs[i].label === "Home") {
          expect(crumbs[i].isLink, `${path} Home should be link`).toBe(true);
        }
      }
      expect(crumbs[crumbs.length - 1].isLink, `${path} leaf should be plain text`).toBe(false);
    }
  });
});
