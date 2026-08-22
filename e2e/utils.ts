import { test as base, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_USER_EMAIL ?? "";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "";
export const AUTH_AVAILABLE = Boolean(EMAIL && PASSWORD);

const COOKIE_CONSENT_KEY = "doseroutine:cookie-consent:v1";
const WELCOME_TOUR_KEY = "doseroutine_welcome_tour_v1";

/**
 * Suppresses the first-run overlays (cookie notice, welcome tour) that sit on
 * top of the app and intercept pointer events. Seeding localStorage is
 * race-free; clicking them away is not, because they only appear after
 * hydration.
 */
export async function dismissFirstRunOverlays(page: Page): Promise<void> {
  await page
    .evaluate(
      ([cookieKey, tourKey]) => {
        window.localStorage.setItem(cookieKey, "accepted");
        window.localStorage.setItem(tourKey, new Date().toISOString());
      },
      [COOKIE_CONSENT_KEY, WELCOME_TOUR_KEY],
    )
    .catch(() => undefined);
}

/**
 * Accepts the one-time medical disclaimer overlay when it is on screen. It is
 * a `fixed inset-0 z-[100]` backdrop, so it swallows every click until dealt
 * with. No-ops when the account already acknowledged it.
 */
export async function acceptMedicalDisclaimer(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: /i understand and accept/i });
  if (await accept.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await accept.click();
    await accept.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
  }
}

/** @deprecated use dismissFirstRunOverlays */
export const dismissCookieBanner = dismissFirstRunOverlays;

/**
 * Closes the paywall sheet if it is on screen. Unlike the first-run overlays
 * this one is driven by server-side entitlement state, so it can only be
 * dismissed by clicking its Close button. It renders a full-screen
 * `fixed inset-0 z-50` backdrop that intercepts every pointer event, so any
 * test that clicks in-app navigation must call this first.
 * Returns true when a sheet was actually dismissed.
 */
export type PaywallState = "none" | "dismissed" | "persistent";

export async function dismissPaywall(page: Page, waitMs = 2_000): Promise<PaywallState> {
  const backdrop = page.locator("div.fixed.inset-0.z-50").filter({
    has: page.getByRole("button", { name: /^Close\b/ }),
  });
  // The sheet mounts after the route's entitlement query resolves, so give it
  // a beat to appear rather than sampling the DOM once.
  const appeared = await backdrop
    .first()
    .waitFor({ state: "visible", timeout: waitMs })
    .then(() => true)
    .catch(() => false);
  if (!appeared) return "none";

  await backdrop
    .first()
    .getByRole("button", { name: /^Close\b/ })
    .click()
    .catch(() => undefined);
  const hidden = await backdrop
    .first()
    .waitFor({ state: "hidden", timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  // Gated routes such as /timeline re-open the sheet immediately for accounts
  // without a paid subscription — closing it there is a no-op by design.
  return hidden ? "dismissed" : "persistent";
}

/**
 * Signs in via the /auth email form. Assumes the account already exists.
 * Waits for redirect to /today (post-auth landing).
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await dismissFirstRunOverlays(page);
  await page.reload({ waitUntil: "domcontentloaded" });

  const submit = page.locator('form button[type="submit"]');
  const modeToggle = page.locator('p:has-text("Already have an account?") button').first();

  // The page is server-rendered, so the markup exists before React hydrates.
  // Clicking the mode toggle before hydration silently does nothing (and a
  // pre-hydration submit triggers a native form post back to /auth). Retry the
  // toggle until the submit button text actually flips to "Sign in".
  await expect(async () => {
    await modeToggle.click({ timeout: 5_000 });
    await expect(submit.first()).toHaveText(/^sign in$/i, { timeout: 1_500 });
  }).toPass({ timeout: 30_000 });

  // Use IDs: getByLabel(/password/i) is ambiguous because the show/hide toggle
  // carries an aria-label of "Show password".
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await submit.first().click();
  await page.waitForURL(/\/today|\/onboarding/, { timeout: 20_000 });
}

/**
 * Signs out via the More page (mirrors the real user flow in
 * src/routes/_authenticated/more.tsx). Assumes the page is already
 * authenticated. Waits for the redirect back to /auth.
 */
export async function signOut(page: Page): Promise<void> {
  await page.goto("/more", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.getByRole("button", { name: /^sign out$/i }).click({ timeout: 15_000 });

  await page.waitForURL(/\/auth(\?|$)/, { timeout: 10_000 });
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, runTest) => {
    test.skip(
      !AUTH_AVAILABLE,
      "Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated E2E tests",
    );
    await signIn(page);
    await runTest(page);
  },
});

export { expect };

/**
 * Return breadcrumb items as { label, isLink } tuples in visible order.
 * Excludes the "More"/"Show less" expander controls.
 */
export async function readBreadcrumbs(page: Page) {
  const nav = page.getByRole("navigation", { name: /breadcrumb/i });
  await nav.waitFor({ state: "visible" });
  const items = nav.locator("ol > li");
  const count = await items.count();
  const out: { label: string; isLink: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const li = items.nth(i);
    // Decorative separators ("/" or chevrons) are not crumbs.
    if ((await li.getAttribute("aria-hidden")) === "true") continue;
    const linkCount = await li.getByRole("link").count();

    let text = (await li.innerText()).trim();
    if (!text && linkCount > 0) {
      // Icon-only crumbs (e.g. the Home house icon) carry their label in
      // aria-label rather than visible text.
      text = ((await li.getByRole("link").first().getAttribute("aria-label")) ?? "").trim();
    }
    if (!text || /^show less$/i.test(text) || text === "…" || /^\.\.\.$/.test(text)) continue;
    // Skip the expander "More" pill (button, not a link/text segment).
    const isMoreButton = await li.getByRole("button", { name: /show|expand|more/i }).count();
    if (isMoreButton > 0) continue;
    out.push({ label: text, isLink: linkCount > 0 });
  }

  return out;
}
