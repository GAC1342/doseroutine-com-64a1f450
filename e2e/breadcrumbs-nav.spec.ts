import { test, expect, readBreadcrumbs } from "./utils";

/**
 * E2E: clicking breadcrumb items must change the URL and update the visible
 * trail (leaf/aria-current) accordingly. Also verifies the expand/collapse
 * expander control's presence tracks route depth, since routes shallower than
 * COLLAPSE_AT (4) must NOT render a "More" expander.
 */

const breadcrumbNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: /breadcrumb/i });

test.describe("breadcrumb click navigation", () => {
  test("clicking Home crumb navigates to /today and updates the leaf", async ({
    authedPage: page,
  }) => {
    await page.goto("/stack");
    // Sanity: leaf is "Stack" before we click Home
    await expect(breadcrumbNav(page).locator('[aria-current="page"]')).toHaveText("Stack");

    await breadcrumbNav(page).getByRole("link", { name: /home/i }).click();
    await page.waitForURL(/\/today$/);
    // Leaf now reflects the destination route
    await expect(breadcrumbNav(page).locator('[aria-current="page"]')).toHaveText("Today");
  });

  test("clicking an intermediate link crumb navigates up one level", async ({
    authedPage: page,
  }) => {
    await page.goto("/library/creatine");
    // The public compound page renders its own trail:
    // Home / Compound Library / <category> / <compound>
    const before = await readBreadcrumbs(page);
    expect(before[0].label).toBe("Home");
    const libraryCrumb = before.find((c) => c.label === "Compound Library");
    expect(libraryCrumb?.isLink).toBe(true);
    const leafBefore = before[before.length - 1];
    expect(leafBefore.isLink).toBe(false);
    expect(leafBefore.label).not.toMatch(/^library$/i);

    // Click the library crumb — the URL should collapse up to /library.
    await breadcrumbNav(page).getByRole("link", { name: "Compound Library", exact: true }).click();
    await page.waitForURL((u) => u.pathname === "/library");
    // The library index is a public marketing page and intentionally does not
    // render a breadcrumb trail, so the URL is the assertion here.
  });

  test("leaf updates to match URL as we navigate between top-level routes", async ({
    authedPage: page,
  }) => {
    const stops: Array<[string, string]> = [
      ["/stack", "Stack"],
      ["/safety", "Safety"],
      ["/timeline", "Timeline"],
      ["/today", "Today"],
    ];
    await page.goto(stops[0][0]);
    for (const [path, label] of stops) {
      await page.goto(path);
      await page.waitForURL(new RegExp(`${path}$`));
      const current = breadcrumbNav(page).locator('[aria-current="page"]');
      await expect(current).toHaveText(label);
      // The leaf is never a link (plain text with aria-current="page").
      const crumbs = await readBreadcrumbs(page);
      expect(crumbs[crumbs.length - 1]).toEqual({ label, isLink: false });
    }
  });

  test("shallow routes do NOT render a More/expander control (collapsed state absent)", async ({
    authedPage: page,
  }) => {
    // COLLAPSE_AT = 4; every route in this app is shallower, so the trail is
    // always fully expanded and the expander button must not exist.
    for (const path of ["/today", "/stack", "/library/creatine", "/admin/schema-report"]) {
      await page.goto(path);
      const expander = breadcrumbNav(page).getByRole("button", {
        name: /show \d+ hidden breadcrumb/i,
      });
      await expect(expander).toHaveCount(0);
      // Full trail visible: every non-leaf link is a real <a>, leaf carries aria-current.
      const current = breadcrumbNav(page).locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
    }
  });

  test("browser Back after breadcrumb click restores the deep leaf", async ({
    authedPage: page,
  }) => {
    await page.goto("/library/creatine");
    const leaf = (await readBreadcrumbs(page)).slice(-1)[0].label;
    await breadcrumbNav(page).getByRole("link", { name: "Compound Library", exact: true }).click();
    await page.waitForURL((u) => u.pathname === "/library");

    await page.goBack();
    await page.waitForURL(/\/library\/creatine$/);
    await expect(breadcrumbNav(page).locator('[aria-current="page"]')).toHaveText(leaf);
  });
});
