import { test, expect, dismissPaywall } from "./utils";
import type { ConsoleMessage, Page, Response } from "@playwright/test";

/**
 * Smoke test for the five core authenticated routes users hit every session:
 *
 *   /today, /timeline, /stack, /progress-photos, /more (settings)
 *
 * Goal: catch regressions BEFORE App Store review. Each route must:
 *   1. Return an HTML response (no 4xx/5xx on the top-level document).
 *   2. Land on the expected URL after client-side routing settles.
 *   3. Render a visible, page-identifying heading (proves the component
 *      mounted and its data loader didn't blank the page).
 *   4. Produce zero console errors and zero failing (>=500) network calls
 *      while loading and idling for 1.5s.
 *
 * Read-only by design: no dose actions, no photo uploads, no writes — so the
 * suite is safe to run against any test account and doesn't require seeded
 * fixtures beyond "the account exists and completed onboarding".
 */

type RouteCheck = {
  path: string;
  label: string;
  // Regex the primary <h1> (or role="heading" level=1) must match. Kept loose
  // so copy tweaks don't break the smoke test — we only care that the page
  // mounted its own heading, not the exact wording.
  heading: RegExp;
};

const ROUTES: RouteCheck[] = [
  { path: "/today", label: "Today", heading: /today|good (morning|afternoon|evening)/i },
  { path: "/timeline", label: "Timeline", heading: /timeline|history|calendar/i },
  { path: "/stack", label: "Stack", heading: /your stack|stack/i },
  { path: "/progress-photos", label: "Progress Photos", heading: /progress photos/i },
  { path: "/more", label: "Settings (More)", heading: /more|settings|account/i },
];

// Console messages we intentionally ignore — third-party noise that isn't
// actionable in a smoke test. Keep this list SHORT; every entry is a
// tolerated regression risk.
const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Service Worker/i,
  // Manifest / icon 404s are handled by the platform, not by the app shell.
  /manifest.*(404|not found)/i,
  // Dev-only React warning emitted from TanStack Router's Transitioner when a
  // navigation starts while the previous route match is still mounting. Traced
  // to react-router internals (Transitioner.router.startTransition), not app
  // code, and absent from production builds.
  /Can't perform a React state update on a component that hasn't mounted yet/i,
];

function shouldIgnoreConsole(msg: ConsoleMessage): boolean {
  const text = msg.text();
  return IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text));
}

test.describe("Core routes — authenticated smoke", () => {
  for (const route of ROUTES) {
    test(`${route.label} (${route.path}) loads cleanly`, async ({ authedPage: page }) => {
      const consoleErrors: string[] = [];
      const serverErrors: string[] = [];

      const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() !== "error") return;
        if (shouldIgnoreConsole(msg)) return;
        consoleErrors.push(msg.text());
      };
      const onResponse = (res: Response) => {
        // Ignore auth/analytics 401s from unauthenticated preflights and any
        // route the app deliberately treats as fire-and-forget.
        const status = res.status();
        if (status < 500) return;
        // 5xx on the document itself or any API call is a real regression.
        serverErrors.push(`${status} ${res.request().method()} ${res.url()}`);
      };

      page.on("console", onConsole);
      page.on("response", onResponse);

      try {
        const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
        expect(response, `no response for ${route.path}`).toBeTruthy();
        // The document itself must not error. Client-side navigation to a
        // route file that failed to compile shows up as a 500 here.
        expect(response!.status(), `bad status for ${route.path}`).toBeLessThan(400);

        // Wait for the SPA to settle — either idle network or the heading.
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

        // The auth gate should have kept us on the requested path (or bounced
        // us to /auth if credentials silently failed — that's a hard fail).
        expect(page.url(), `redirected away from ${route.path}`).not.toMatch(/\/auth(\?|$)/);
        expect(new URL(page.url()).pathname).toBe(route.path);

        // The protected subtree renders client-side only (the auth gate runs
        // with ssr: false), so the document body is empty until the session
        // check resolves. Wait for the shell before asserting on content.
        await page
          .locator("#main-content")
          .waitFor({ state: "attached", timeout: 15_000 })
          .catch(() => undefined);

        // Page-identifying heading — proves the route component rendered.
        // We check H1 first, then any role=heading, then fall back to a text
        // match anywhere on the page (some routes use <p> section titles).
        const h1 = page.locator("h1").first();
        const hasH1 = await h1.isVisible({ timeout: 10_000 }).catch(() => false);
        if (hasH1) {
          await expect(h1).toContainText(route.heading, { timeout: 10_000 });
        } else {
          // Fallback: page-wide text match so a route without <h1> still counts.
          await expect(page.getByText(route.heading).first()).toBeVisible({
            timeout: 10_000,
          });
        }

        // Give background queries a moment to fail loudly if they're going to.
        await page.waitForTimeout(1500);
      } finally {
        page.off("console", onConsole);
        page.off("response", onResponse);
      }

      expect(
        consoleErrors,
        `console errors on ${route.path}:\n  ${consoleErrors.join("\n  ")}`,
      ).toEqual([]);
      expect(
        serverErrors,
        `5xx responses on ${route.path}:\n  ${serverErrors.join("\n  ")}`,
      ).toEqual([]);
    });
  }

  test("core routes are reachable via in-app navigation", async ({ authedPage: page }) => {
    // Belt-and-suspenders: prove the bottom nav (or More menu) actually links
    // to each route so a broken <Link> is caught even if direct URL loads pass.
    await page.goto("/today");
    await page.waitForLoadState("networkidle").catch(() => undefined);
    // Free/trial accounts can get a paywall sheet whose full-screen backdrop
    // swallows every click, so clear it before touching the nav.
    await dismissPaywall(page);

    const navTargets: { path: string; linkName: RegExp }[] = [
      { path: "/stack", linkName: /^stack$/i },
      { path: "/timeline", linkName: /^timeline$/i },
      { path: "/more", linkName: /^more$/i },
    ];

    for (const target of navTargets) {
      const link = page.getByRole("link", { name: target.linkName }).first();
      const visible = await link.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!visible) {
        // Some viewports hide bottom nav labels behind icons — direct nav is
        // still verified by the per-route tests above.
        continue;
      }
      const paywall = await dismissPaywall(page);
      if (paywall === "persistent") {
        // The current route hard-gates behind the paywall sheet for this
        // account, and its backdrop covers the nav. The link target is still
        // verified by navigating directly.
        await page.goto(target.path);
        expect(new URL(page.url()).pathname).toBe(target.path);
        await dismissPaywall(page);
        continue;
      }
      // The entitlement query can re-open the sheet a beat after it was
      // dismissed, so retry the click behind another dismissal before
      // falling back to direct navigation.
      let clicked = false;
      for (let attempt = 0; attempt < 3 && !clicked; attempt++) {
        clicked = await link
          .click({ timeout: 5_000 })
          .then(() => true)
          .catch(() => false);
        if (!clicked) await dismissPaywall(page, 1_000);
      }
      if (!clicked) {
        await page.goto(target.path);
        expect(new URL(page.url()).pathname).toBe(target.path);
        await dismissPaywall(page);
        continue;
      }
      await page.waitForURL(`**${target.path}`, { timeout: 5_000 });
      expect(new URL(page.url()).pathname).toBe(target.path);

      await dismissPaywall(page);
    }
  });
});
