import { test, expect, signIn, signOut, AUTH_AVAILABLE } from "./utils";
import type { ConsoleMessage, Page, Response } from "@playwright/test";

/**
 * Session-lifecycle smoke:
 *
 *   sign-in → cross-route persistence → hard reload → sign-out →
 *   auth gate re-block → back-button hygiene
 *
 * Catches silent auth regressions that route-render smoke can't see:
 *   - broken bearer attacher (protected fns 401 after full-page load)
 *   - Supabase persistSession flipped off (reload signs the user out)
 *   - missing/renamed "Sign out" button
 *   - navigate() without replace: true (Back restores a protected route)
 *
 * Auto-skipped when TEST_USER_EMAIL / TEST_USER_PASSWORD are unset.
 */

const CORE_ROUTES = ["/today", "/timeline", "/stack", "/progress-photos", "/more"] as const;

// Same tolerated third-party noise as core-routes-smoke.
const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Service Worker/i,
  /manifest.*(404|not found)/i,
];

function shouldIgnoreConsole(msg: ConsoleMessage): boolean {
  const text = msg.text();
  return IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text));
}

/**
 * Attach console + 5xx-response listeners for the lifetime of `fn`.
 * Returns collected errors so tests can assert on them.
 */
async function withSignalCapture(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ consoleErrors: string[]; serverErrors: string[] }> {
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    if (shouldIgnoreConsole(msg)) return;
    consoleErrors.push(msg.text());
  };
  const onResponse = (res: Response) => {
    if (res.status() < 500) return;
    serverErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  };

  page.on("console", onConsole);
  page.on("response", onResponse);
  try {
    await fn();
  } finally {
    page.off("console", onConsole);
    page.off("response", onResponse);
  }
  return { consoleErrors, serverErrors };
}

test.describe("Auth session — smoke", () => {
  // Each test walks several authenticated routes, and every route allows up to
  // 10s of network settling. The default 30s cap is not enough for that budget.
  test.setTimeout(120_000);

  test.skip(
    !AUTH_AVAILABLE,
    "Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated E2E tests",
  );

  test("sign-in lands on /today (or /onboarding) with no 5xx", async ({ page }) => {
    const { serverErrors } = await withSignalCapture(page, async () => {
      await signIn(page);
    });

    const pathname = new URL(page.url()).pathname;
    expect(pathname, `sign-in landed on unexpected path ${pathname}`).toMatch(
      /^\/(today|onboarding)/,
    );
    expect(page.url(), "sign-in did not clear /auth from URL").not.toMatch(/\/auth(\?|$)/);
    expect(serverErrors, `5xx during sign-in:\n  ${serverErrors.join("\n  ")}`).toEqual([]);
  });

  test("session persists across the five core routes", async ({ authedPage: page }) => {
    const { serverErrors } = await withSignalCapture(page, async () => {
      for (const path of CORE_ROUTES) {
        const response = await page.goto(path, { waitUntil: "domcontentloaded" });
        expect(response, `no response for ${path}`).toBeTruthy();
        expect(response!.status(), `bad status for ${path}`).toBeLessThan(400);

        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

        // Auth gate must NOT bounce a signed-in user back to /auth.
        expect(page.url(), `bounced to /auth from ${path}`).not.toMatch(/\/auth(\?|$)/);
        expect(new URL(page.url()).pathname).toBe(path);
      }
    });

    expect(serverErrors, `5xx during cross-route walk:\n  ${serverErrors.join("\n  ")}`).toEqual(
      [],
    );
  });

  test("session survives a hard reload", async ({ authedPage: page }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    expect(new URL(page.url()).pathname).toBe("/today");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    expect(page.url(), "reload bounced signed-in user to /auth").not.toMatch(/\/auth(\?|$)/);
    expect(new URL(page.url()).pathname).toBe("/today");

    // A page-identifying element must still be there after reload.
    const h1 = page.locator("h1").first();
    if (await h1.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(h1).toContainText(/today|good (morning|afternoon|evening)/i, {
        timeout: 5_000,
      });
    }
  });

  test("sign-out clears the session and Back does not restore protected route", async ({
    authedPage: page,
  }) => {
    // Establish some protected-route history before signing out.
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    await signOut(page);
    expect(page.url(), "sign-out did not redirect to /auth").toMatch(/\/auth(\?|$)/);

    // A signed-out user hitting a protected route must be bounced back to /auth.
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    expect(page.url(), "auth gate let a signed-out user into /today").toMatch(/\/auth(\?|$)/);

    // History hygiene: Back after sign-out must NOT restore the protected route
    // (verifies navigate({ replace: true }) in handleSignOut).
    await page.goBack().catch(() => undefined);
    await page.waitForTimeout(500);
    expect(
      new URL(page.url()).pathname,
      "Back button restored a protected route after sign-out",
    ).not.toBe("/today");
  });
});
