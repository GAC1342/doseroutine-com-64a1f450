import { test, expect } from "@playwright/test";
import { emulateNativeShell } from "./native-signals";

/**
 * Inside the iOS/Android shell, citation links must never navigate the app's
 * own webview to a publisher site. Two paths are covered:
 *
 *  1. An allowlisted source link opens the in-app citation preview modal
 *     (intercepted, no webview navigation, no window.open).
 *  2. "Open full source" inside that modal — and any non-previewable citation
 *     anchor — is handed to the OS browser through openExternalUrl(), i.e.
 *     window.open(url, "_blank").
 */

const COMPOUND_PATH = "/library/creatine";

async function instrument(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    w["__opened"] = [];
    window.open = ((url?: string | URL) => {
      (w["__opened"] as unknown[]).push(String(url ?? ""));
      return {} as Window;
    }) as typeof window.open;
  });
}

async function opened(page: import("@playwright/test").Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as Record<string, unknown>)["__opened"] as string[],
  );
}

for (const platform of ["ios", "android"] as const) {
  test(`${platform}: citation source links never navigate the webview`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await page.goto(COMPOUND_PATH, { waitUntil: "domcontentloaded" });
    await instrument(page);

    const link = page
      .locator('a[href^="https://"]:not([data-internal-link="true"])')
      .filter({ hasNot: page.locator("[hidden]") })
      .first();
    const count = await page.locator('a[href^="https://"]').count();
    test.skip(count === 0, "no outbound citation links rendered on this page");

    const href = await link.getAttribute("href");
    await link.click();
    await page.waitForTimeout(500);

    // Either the citation modal intercepted it, or it was handed to the OS.
    const calls = await opened(page);
    const modalOpen = await page.locator('[role="dialog"]').count();
    expect(modalOpen > 0 || calls.length > 0).toBe(true);
    if (calls.length > 0) expect(calls[0]).toBe(href);

    // The app itself never left its own origin.
    expect(new URL(page.url()).pathname).toBe(COMPOUND_PATH);
  });

  test(`${platform}: "Open full source" hands the citation to the system browser`, async ({
    page,
  }) => {
    await emulateNativeShell(page, platform);
    await page.goto(COMPOUND_PATH, { waitUntil: "domcontentloaded" });
    await instrument(page);

    const link = page.locator('a[href^="https://"]').first();
    test.skip((await link.count()) === 0, "no outbound citation links rendered on this page");
    await link.click();

    const dialog = page.locator('[role="dialog"]');
    if ((await dialog.count()) === 0) {
      // Non-previewable publisher: already handed off above, nothing more to do.
      expect((await opened(page)).length).toBeGreaterThan(0);
      return;
    }

    const full = dialog.locator('a[href^="https://"]').first();
    await full.click();
    await page.waitForTimeout(300);

    const calls = await opened(page);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]).toMatch(/^https:\/\//);
    expect(new URL(page.url()).pathname).toBe(COMPOUND_PATH);
  });
}
