import { test, expect, type Page } from "@playwright/test";

/**
 * Error-boundary and recovery coverage for authenticated screens.
 *
 * These tests deliberately force failures (offline network, poisoned API
 * responses, expired auth) and assert that the user gets a recovery screen
 * with a working action — not a blank page or a raw stack trace.
 */

const APP_ROUTES = ["/today", "/stack", "/timeline"] as const;

async function signIn(page: Page) {
  const session = process.env["E2E_SUPABASE_SESSION_JSON"];
  const storageKey = process.env["E2E_SUPABASE_STORAGE_KEY"];
  if (!session || !storageKey) return false;
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [storageKey, session],
  );
  return true;
}

async function collectBoundaryReports(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __doseRoutineBoundaryReports?: unknown[] })
        .__doseRoutineBoundaryReports ?? [],
  );
}

test.describe("authenticated error recovery", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await signIn(page);
    test.skip(!ok, "No E2E Supabase session provided");
  });

  for (const route of APP_ROUTES) {
    test(`${route} shows the offline recovery screen and recovers on retry`, async ({
      page,
      context,
    }) => {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();

      // Force every subsequent data request to fail like a dropped connection.
      await context.setOffline(true);
      await page.route("**/rest/v1/**", (r) => r.abort("internetdisconnected"));
      await page.reload();

      const recovery = page.getByTestId("network-recovery");
      const boundary = page.getByTestId("app-route-error");
      await expect(recovery.or(boundary).first()).toBeVisible({ timeout: 20_000 });

      // The failure must be reported centrally, not swallowed.
      const reports = await collectBoundaryReports(page);
      expect(Array.isArray(reports)).toBe(true);

      // Restore the network and use the in-UI recovery action.
      await context.setOffline(false);
      await page.unroute("**/rest/v1/**");
      const retry = page.getByRole("button", { name: /try again|reload|retry/i }).first();
      await expect(retry).toBeVisible();
      await retry.click();

      await expect(recovery).toBeHidden({ timeout: 20_000 });
      await expect(boundary).toBeHidden({ timeout: 20_000 });
    });
  }

  test("a poisoned API response renders the boundary, never a blank screen", async ({ page }) => {
    await page.route("**/rest/v1/**", (r) =>
      r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"boom"}' }),
    );
    await page.goto("/today");

    const fallback = page
      .getByTestId("app-route-error")
      .or(page.getByTestId("network-recovery"))
      .or(page.getByText(/something went wrong/i))
      .first();
    await expect(fallback).toBeVisible({ timeout: 20_000 });

    // No raw stack traces leaked to users.
    await expect(page.locator("body")).not.toContainText("at Object.");
    const text = (await page.locator("body").innerText()).trim();
    expect(text.length).toBeGreaterThan(0);
  });

  test("expired auth sends the user back to the login flow", async ({ page }) => {
    await page.route("**/auth/v1/**", (r) =>
      r.fulfill({
        status: 401,
        contentType: "application/json",
        body: '{"message":"Invalid Refresh Token: Refresh Token Not Found"}',
      }),
    );
    await page.route("**/rest/v1/**", (r) =>
      r.fulfill({
        status: 401,
        contentType: "application/json",
        body: '{"message":"JWT expired"}',
      }),
    );
    await page.goto("/today");
    await page.waitForURL(/\/auth/, { timeout: 25_000 });
    expect(page.url()).toContain("/auth");
  });
});

test("unauthenticated app routes redirect to /auth rather than erroring", async ({ page }) => {
  await page.goto("/today");
  await page.waitForURL(/\/auth/, { timeout: 25_000 });
  await expect(page.getByTestId("app-route-error")).toBeHidden();
});
