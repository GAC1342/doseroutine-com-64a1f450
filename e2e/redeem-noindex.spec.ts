import { test, expect } from "@playwright/test";

/**
 * E2E: /redeem is a private surface (tester comp-code redemption) and must
 * never be indexed. This test asserts the three signals that keep it out of
 * search results, and asserts they hold *without* altering redirect behaviour:
 *
 *   1. `X-Robots-Tag: noindex, nofollow` response header
 *   2. `Cache-Control: private, no-store` response header
 *   3. `<meta name="robots" content="noindex, nofollow">` in the HTML
 *   4. robots.txt disallows /redeem for the wildcard user-agent
 *
 * Redirect behaviour is observed, never changed: the first request is made
 * with redirects disabled so any existing redirect is recorded as-is, and if
 * one exists the redirect target is asserted to carry the same noindex
 * signals. A redirect appearing or disappearing does not fail this test — only
 * a missing noindex/cache signal does.
 */

const PATH = "/redeem";

test.describe("/redeem indexing signals", () => {
  test("serves noindex + private cache headers and meta robots", async ({ request, baseURL }) => {
    const url = new URL(PATH, baseURL ?? "http://localhost:8080").toString();

    // maxRedirects: 0 => observe the response exactly as served, no following.
    const res = await request.get(url, { maxRedirects: 0 });
    const status = res.status();
    const headers = res.headers();

    const robotsHeader = headers["x-robots-tag"] ?? "";
    const cacheControl = headers["cache-control"] ?? "";

    expect(robotsHeader.toLowerCase(), `X-Robots-Tag on ${PATH}`).toContain("noindex");
    expect(robotsHeader.toLowerCase(), `X-Robots-Tag on ${PATH}`).toContain("nofollow");
    expect(cacheControl.toLowerCase(), `Cache-Control on ${PATH}`).toContain("private");
    expect(cacheControl.toLowerCase(), `Cache-Control on ${PATH}`).toContain("no-store");

    if (status >= 300 && status < 400) {
      // Redirect behaviour is whatever the app already does — just make sure
      // the destination is protected the same way.
      const location = headers["location"];
      expect(location, "redirect responses must set Location").toBeTruthy();
      const target = new URL(location, url).toString();
      const followed = await request.get(target, { maxRedirects: 0 });
      const followedRobots = (followed.headers()["x-robots-tag"] ?? "").toLowerCase();
      expect(followedRobots, `X-Robots-Tag on redirect target ${target}`).toContain("noindex");
      return;
    }

    expect(status, `${PATH} should render or redirect, not error`).toBeLessThan(400);

    const html = await res.text();
    const meta = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1];
    expect(meta, `meta robots tag missing on ${PATH}`).toBeTruthy();
    expect(meta!.toLowerCase()).toContain("noindex");
    expect(meta!.toLowerCase()).toContain("nofollow");
  });

  test("robots.txt disallows /redeem", async ({ request, baseURL }) => {
    const res = await request.get(
      new URL("/robots.txt", baseURL ?? "http://localhost:8080").toString(),
    );
    expect(res.status()).toBe(200);
    const txt = await res.text();
    const wildcardGroup = txt.split(/User-agent:/i)[1] ?? "";
    expect(wildcardGroup).toMatch(/^\s*\*/);
    expect(wildcardGroup).toMatch(/^\s*Disallow:\s*\/redeem\s*$/im);
  });

  test("client-side redirect behaviour is unchanged for anonymous visitors", async ({ page }) => {
    // Loads the page in a real browser and records where it ends up. This is a
    // characterisation check: it asserts the route still resolves to a real
    // screen (no crash, no error boundary) and that the rendered document
    // keeps its noindex meta tag wherever the app routes the visitor.
    const response = await page.goto(PATH, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${PATH} navigation status`).toBeLessThan(400);
    await page.waitForLoadState("networkidle").catch(() => {});

    const metaContent = await page.locator('meta[name="robots"]').first().getAttribute("content");
    expect(metaContent?.toLowerCase(), "meta robots after client routing").toContain("noindex");

    const finalPath = new URL(page.url()).pathname;
    expect(finalPath, "anonymous /redeem must stay on a private, noindexed path").toMatch(
      /^\/(redeem|auth)/,
    );
  });
});
