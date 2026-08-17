import { test as base, expect, devices, chromium, webkit } from "@playwright/test";
import type { ConsoleMessage, Response, BrowserContext } from "@playwright/test";

/**
 * Regression QA sweep — public routes rendered at iOS and Android viewports.
 *
 * Launches WebKit with the iPhone 14 device profile (iOS Safari engine) and
 * Chromium with the Pixel 7 profile (Android WebView engine) manually inside
 * each test, so we don't need per-project config in playwright.config.ts.
 *
 * Each route must:
 *   1. Return a <400 document status
 *   2. Not horizontally overflow the viewport (top polish regression source)
 *   3. Render its H1
 *   4. Not spam console errors or 5xx responses
 */

const PUBLIC_ROUTES: { path: string; heading: RegExp }[] = [
  { path: "/", heading: /doseroutine|track|stack|routine/i },
  { path: "/about", heading: /about/i },
  { path: "/help", heading: /help|support|guide/i },
  { path: "/privacy", heading: /privacy/i },
  { path: "/legal", heading: /terms|legal|medical/i },
  { path: "/ai-policy", heading: /ai/i },
  { path: "/calculator", heading: /calculator/i },
  { path: "/peptide-dosage-calculator", heading: /peptide|dosage/i },
  { path: "/peptide-reconstitution-calculator", heading: /reconstitut/i },
  { path: "/trt-dosage-calculator", heading: /trt|testosterone/i },
  { path: "/library", heading: /library|compound/i },
];

const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Service Worker/i,
  /manifest.*(404|not found)/i,
  /preload.*was not used/i,
];

const DEVICE_MATRIX = [
  { label: "iOS (iPhone 14, WebKit)", device: devices["iPhone 14"], engine: webkit },
  { label: "Android (Pixel 7, Chromium)", device: devices["Pixel 7"], engine: chromium },
];

for (const { label, device, engine } of DEVICE_MATRIX) {
  base.describe(`Regression — ${label}`, () => {
    let context: BrowserContext;

    base.beforeAll(async () => {
      const browser = await engine.launch();
      context = await browser.newContext({ ...device });
    });

    base.afterAll(async () => {
      await context?.browser()?.close();
    });

    for (const route of PUBLIC_ROUTES) {
      base(`${route.path} renders cleanly`, async () => {
        const page = await context.newPage();
        const consoleErrors: string[] = [];
        const serverErrors: string[] = [];

        page.on("console", (m: ConsoleMessage) => {
          if (m.type() !== "error") return;
          const t = m.text();
          if (IGNORED_CONSOLE.some((re) => re.test(t))) return;
          consoleErrors.push(t);
        });
        page.on("response", (r: Response) => {
          if (r.status() >= 500) {
            serverErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
          }
        });

        try {
          const base_url = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
          const res = await page.goto(base_url + route.path, { waitUntil: "domcontentloaded" });
          expect(res, `no response for ${route.path}`).toBeTruthy();
          expect(res!.status(), `bad status for ${route.path}`).toBeLessThan(400);

          await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

          expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe(
            route.path.replace(/\/$/, ""),
          );

          const h1 = page.locator("h1").first();
          await expect(h1).toBeVisible({ timeout: 5_000 });
          await expect(h1).toContainText(route.heading);

          const overflow = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
          }));
          expect(
            overflow.scroll,
            `horizontal overflow on ${route.path}: scroll=${overflow.scroll} vs client=${overflow.client}`,
          ).toBeLessThanOrEqual(overflow.client + 1);

          await page.waitForTimeout(500);
        } finally {
          await page.close();
        }

        expect(consoleErrors, `console errors:\n  ${consoleErrors.join("\n  ")}`).toEqual([]);
        expect(serverErrors, `5xx responses:\n  ${serverErrors.join("\n  ")}`).toEqual([]);
      });
    }
  });
}
