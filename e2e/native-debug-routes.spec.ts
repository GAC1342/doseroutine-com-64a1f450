import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect, dismissFirstRunOverlays, dismissPaywall, signIn } from "./utils";
import { emulateNativeShell, expectNoFatalUi, type NativePlatform } from "./native-signals";

/**
 * Debug tooling must be unreachable inside the native binary (App Store
 * guideline 2.3.1 — no hidden/undocumented features). Every `/debug/*` route
 * the router can serve has to land back on /today with the app shell intact.
 *
 * Route list is derived from the filesystem rather than hardcoded, so a new
 * debug screen is covered the moment it is added.
 */
function debugRoutePaths(): string[] {
  const routesDir = join(process.cwd(), "src/routes");
  const out = new Set<string>(["/debug"]);
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, entry.name.startsWith("_") ? prefix : `${prefix}/${entry.name}`);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const base = entry.name.replace(/\.tsx?$/, "");
      if (!base.startsWith("debug")) continue;
      out.add(
        `${prefix}/${base
          .split(".")
          .filter((s) => s !== "index")
          .join("/")}`,
      );
    }
  };
  walk(routesDir, "");
  // An unknown sub-path must be caught by the prefix rule, not a route match.
  out.add("/debug/not-a-real-screen");
  return [...out];
}

function debugSuite(label: string, platform: NativePlatform): void {
  test(`${label}: every /debug route redirects to /today`, async ({ page }) => {
    await emulateNativeShell(page, platform);
    await signIn(page);
    await dismissFirstRunOverlays(page);
    await dismissPaywall(page);
    test.skip(/\/onboarding/.test(page.url()), "account is still in onboarding");

    const appOrigin = new URL(page.url()).origin;

    for (const path of debugRoutePaths()) {
      await expect(async () => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
      }).toPass({ timeout: 45_000 });
      await dismissPaywall(page);

      // The guard runs after hydration, so poll rather than sampling once.
      await expect(page, `expected ${path} to redirect`).toHaveURL(/\/today/, { timeout: 25_000 });
      expect(new URL(page.url()).origin).toBe(appOrigin);
      // No debug tooling leaked into the DOM on the way through.
      await expect(page.getByRole("heading", { name: /debug/i })).toHaveCount(0);
      await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
      await expectNoFatalUi(page);
    }
  });
}

test.describe("Native shell — debug routes are unreachable", () => {
  debugSuite("iOS", "ios");
  debugSuite("Android", "android");
});
