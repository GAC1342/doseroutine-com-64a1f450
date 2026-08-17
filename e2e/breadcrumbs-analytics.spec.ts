import { test, expect, readBreadcrumbs } from "./utils";
import type { Page, Request } from "@playwright/test";

/**
 * Browser-level assertion of the analytics payloads emitted by the breadcrumb
 * component during real interactions. We stub the analytics layer by
 * intercepting the Supabase REST insert to `analytics_events`, capturing the
 * JSON body server-side without letting it hit the database, and asserting
 * the exact { event_name, properties } shape trackEvent() sends.
 */

type Captured = { event_name: string; properties: Record<string, unknown>; path: string };

async function stubAnalytics(page: Page): Promise<Captured[]> {
  const events: Captured[] = [];
  await page.route(/\/rest\/v1\/analytics_events(\?|$)/, async (route) => {
    const req: Request = route.request();
    if (req.method() === "POST") {
      try {
        const body = req.postDataJSON() as Captured | Captured[] | undefined;
        if (Array.isArray(body)) events.push(...body);
        else if (body) events.push(body);
      } catch {
        /* ignore malformed */
      }
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: "[]",
    });
  });
  return events;
}

async function waitForEvent(
  events: Captured[],
  predicate: (e: Captured) => boolean,
  timeoutMs = 5_000,
): Promise<Captured> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hit = events.find(predicate);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(
    `Timed out waiting for analytics event. Captured so far: ${JSON.stringify(
      events.map((e) => e.event_name),
    )}`,
  );
}

test.describe("breadcrumb analytics payloads (browser-level)", () => {
  test("emits breadcrumb_trail_impression with exact payload on first visit", async ({
    authedPage: page,
  }) => {
    const events = await stubAnalytics(page);

    // The in-app <Breadcrumbs /> (and its analytics) render inside the
    // authenticated app shell; public library pages have their own static
    // trail. /admin/schema-report is the deepest in-shell route.
    await page.goto("/admin/schema-report");
    // Wait for the breadcrumb to render (impression fires from an effect).
    await readBreadcrumbs(page);

    const impression = await waitForEvent(
      events,
      (e) =>
        e.event_name === "breadcrumb_trail_impression" &&
        (e.properties as { pathname?: string }).pathname === "/admin/schema-report",
    );

    expect(impression.path).toContain("/admin/schema-report");
    const props = impression.properties as {
      pathname: string;
      depth: number;
      collapsed: boolean;
      trail: string[];
    };
    expect(props.depth).toBe(2);
    // COLLAPSE_AT = 4, so shallow routes must report collapsed:false.
    expect(props.collapsed).toBe(false);
    // Trail is the ordered list of hrefs for every crumb.
    expect(props.trail).toEqual(["/admin", "/admin/schema-report"]);
  });

  test("emits breadcrumb_click with position/depth/from when Home is clicked", async ({
    authedPage: page,
  }) => {
    const events = await stubAnalytics(page);
    await page.goto("/stack");
    await readBreadcrumbs(page);

    const nav = page.getByRole("navigation", { name: /breadcrumb/i });
    await nav.getByRole("link", { name: /home/i }).click();
    await page.waitForURL(/\/today$/);

    const click = await waitForEvent(
      events,
      (e) =>
        e.event_name === "breadcrumb_click" &&
        (e.properties as { label?: string }).label === "Home",
    );

    // Home click is fired with href="/today", position 0, depth = crumbs+1,
    // from = the pathname the user was on when they clicked.
    expect(click.properties).toMatchObject({
      href: "/today",
      label: "Home",
      position: 0,
      from: "/stack",
    });
    expect(typeof (click.properties as { depth: unknown }).depth).toBe("number");
    expect((click.properties as { depth: number }).depth).toBeGreaterThanOrEqual(2);
  });

  test("non-navigable intermediate crumb is not a link, and Home click reports full depth", async ({
    authedPage: page,
  }) => {
    const events = await stubAnalytics(page);
    await page.goto("/admin/schema-report");
    const crumbs = await readBreadcrumbs(page);

    // "Admin" is not a routable page on its own — it must render as plain
    // text, so there is nothing to click and no event to emit for it.
    const admin = crumbs.find((c) => c.label === "Admin");
    expect(admin?.isLink).toBe(false);

    const nav = page.getByRole("navigation", { name: /breadcrumb/i });
    await nav.getByRole("link", { name: /home/i }).click();
    await page.waitForURL(/\/today$/);

    const click = await waitForEvent(
      events,
      (e) =>
        e.event_name === "breadcrumb_click" &&
        (e.properties as { href?: string }).href === "/today",
    );

    expect(click.properties).toMatchObject({
      href: "/today",
      label: "Home",
      position: 0,
      from: "/admin/schema-report",
    });
    // Depth counts Home plus every path segment crumb.
    expect((click.properties as { depth: number }).depth).toBe(3);
  });

  test("impression is emitted at most once per pathname during a session", async ({
    authedPage: page,
  }) => {
    const events = await stubAnalytics(page);

    // The memo is session-scoped and resets on a full page load, so this must
    // navigate in-app (SPA) rather than calling page.goto() each time.
    await page.goto("/stack");
    await readBreadcrumbs(page);

    const tab = (name: RegExp) =>
      page.getByRole("navigation", { name: /main|primary|tab/i }).getByRole("link", { name });

    await page
      .getByRole("link", { name: /^safety$/i })
      .first()
      .click();
    await page.waitForURL(/\/safety$/);
    await readBreadcrumbs(page);

    await page
      .getByRole("link", { name: /^stack$/i })
      .first()
      .click();
    await page.waitForURL(/\/stack$/);
    await readBreadcrumbs(page);
    void tab;

    // Give any deferred effects a beat to flush.
    await page.waitForTimeout(500);

    const stackImpressions = events.filter(
      (e) =>
        e.event_name === "breadcrumb_trail_impression" &&
        (e.properties as { pathname?: string }).pathname === "/stack",
    );
    expect(stackImpressions).toHaveLength(1);
  });
});
