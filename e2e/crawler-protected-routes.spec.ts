/**
 * Crawlers must never see the signed-in app.
 *
 * Analytics showed bots hammering /today, which is a protected route. That is
 * expected — the SSR shell exists — but it must always be an empty, noindexed
 * shell that redirects to /auth once the client boots, and it must never carry
 * a single row of private data in the HTML or in the SSR payload.
 *
 * This suite locks that contract for every gated surface and for robots.txt,
 * so adding a new authenticated route without disallowing it fails CI.
 */

import { expect, test, type Page } from "@playwright/test";

const PROTECTED_PATHS = [
  "/today",
  "/insights",
  "/food",
  "/fitness",
  "/progress",
  "/stack",
  "/admin",
  "/chat",
  "/scan",
];

const CRAWLERS: Record<string, string> = {
  Googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  Bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1",
};

/** Strings that would mean private data leaked into a crawler-visible response. */
const PRIVATE_MARKERS = [
  /"user_id"\s*:/i,
  /"access_token"/i,
  /"refresh_token"/i,
  /"workout_logs"\s*:\s*\[\s*\{/i,
  /"food_logs"\s*:\s*\[\s*\{/i,
  /"stack_items"\s*:\s*\[\s*\{/i,
  /"doses"\s*:\s*\[\s*\{/i,
  // A user's email. The published support address in the Organization JSON-LD
  // is public contact info, not private data, so it is exempted.
  /"email"\s*:\s*"(?!support@doseroutine\.com)[^"]+@/i,
];

function assertNoPrivateData(html: string, path: string) {
  for (const marker of PRIVATE_MARKERS) {
    expect(html, `${path} leaked ${marker} to a crawler`).not.toMatch(marker);
  }
}

async function robotsMeta(page: Page): Promise<string> {
  return page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute("content")
    .then((v) => (v ?? "").toLowerCase())
    .catch(() => "");
}

test.describe("crawlers on protected routes", () => {
  for (const [name, ua] of Object.entries(CRAWLERS)) {
    test.describe(`${name}`, () => {
      test.use({ userAgent: ua });

      for (const path of PROTECTED_PATHS) {
        test(`${path} is noindex/redirected and exposes no private data`, async ({ page }) => {
          const response = await page.goto(path, { waitUntil: "domcontentloaded" });
          expect(response, `${path} returned no response`).toBeTruthy();
          expect(response!.status(), `${path} status`).toBeLessThan(400);

          const html = await page.content();
          assertNoPrivateData(html, path);

          // Either the client bounced us to /auth, or the shell is noindexed.
          await page.waitForTimeout(1200);
          const url = new URL(page.url());
          const redirected = url.pathname.startsWith("/auth");
          const meta = await robotsMeta(page);
          expect(
            redirected || meta.includes("noindex"),
            `${path} neither redirected to /auth nor marked noindex (robots="${meta}")`,
          ).toBe(true);

          // Whatever rendered, it must still be free of private data.
          assertNoPrivateData(await page.content(), path);
        });
      }
    });
  }

  test("robots.txt disallows every protected surface", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    for (const path of PROTECTED_PATHS) {
      expect(body, `robots.txt is missing Disallow: ${path}`).toContain(`Disallow: ${path}`);
    }
    expect(body).not.toMatch(/^Disallow:\s*\/$/m);
  });

  test("the sitemap never lists a protected route", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const path of PROTECTED_PATHS) {
      expect(xml, `sitemap lists protected route ${path}`).not.toMatch(
        // Anchor on the site root so a public docs page like /help/today
        // is not mistaken for the protected /today route.
        new RegExp(`<loc>https?://[^/<]+${path}(</loc>|[/?])`),
      );
    }
  });
});
