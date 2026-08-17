import { test as base, expect, type Page } from "@playwright/test";
import { AUTH_AVAILABLE, test } from "./utils";

/**
 * AI Coach error surfacing.
 *
 * The July bug shipped a chat page that swallowed the real failure and printed
 * a generic "An error occurred." — impossible to debug from a user report.
 * /api/chat now returns the real reason (model/gateway message, quota text,
 * config error) and the UI renders it verbatim.
 *
 * These tests force /api/chat to fail in each of the ways it can fail, and
 * assert the specific message reaches the screen.
 *
 * Needs TEST_USER_EMAIL / TEST_USER_PASSWORD because /chat is behind auth.
 */

const GENERIC = /an error occurred\.?$/i;
const QUESTION = "What should I know about magnesium timing?";

/** Serialize a UI-message stream (what toUIMessageStreamResponse emits). */
function uiStream(parts: Array<Record<string, unknown>>) {
  return [...parts.map((p) => `data: ${JSON.stringify(p)}\n\n`), "data: [DONE]\n\n"].join("");
}

/** Send QUESTION on /chat and return the visible error banner text. */
async function askAndReadError(page: Page) {
  await page.goto("/chat");
  const input = page.getByRole("textbox").first();
  await input.waitFor({ state: "visible", timeout: 15_000 });
  await input.fill(QUESTION);
  await input.press("Enter");

  const banner = page.getByTestId("chat-error");
  await banner.waitFor({ state: "visible", timeout: 20_000 });
  return (await banner.innerText()).trim();
}

base.describe("AI coach surfaces real errors", () => {
  base.skip(
    !AUTH_AVAILABLE,
    "Set TEST_USER_EMAIL / TEST_USER_PASSWORD to run the AI coach error tests",
  );

  test("model/gateway failure mid-stream shows the real message", async ({ authedPage: page }) => {
    const REAL = "Upstream model provider rejected the request: model overloaded (503)";

    // A 200 response whose stream carries an error part — exactly how a
    // gateway/model failure reaches the browser in production.
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: uiStream([
          { type: "start" },
          { type: "start-step" },
          { type: "error", errorText: REAL },
        ]),
      }),
    );

    const shown = await askAndReadError(page);
    expect(shown, "UI hid the real model error").toContain("model overloaded (503)");
    expect(shown).not.toMatch(GENERIC);
  });

  test("server-side failure response shows the real message, not a placeholder", async ({
    authedPage: page,
  }) => {
    const REAL = "Server not configured";

    await page.route("**/api/chat", (route) =>
      route.fulfill({ status: 500, contentType: "text/plain", body: REAL }),
    );

    const shown = await askAndReadError(page);
    expect(shown, "UI replaced the server error with a placeholder").toContain(REAL);
    expect(shown).not.toMatch(GENERIC);
  });

  test("quota response surfaces limit details rather than a generic error", async ({
    authedPage: page,
  }) => {
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          error: "limit_reached",
          usedToday: 5,
          usedMonth: 5,
          dailyLimit: 5,
          monthlyLimit: 155,
          tier: "free",
        }),
      }),
    );

    await page.goto("/chat");
    const input = page.getByRole("textbox").first();
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await input.fill(QUESTION);
    await input.press("Enter");

    // Either the upgrade/limit affordance or the raw limit payload is fine —
    // a bare "An error occurred." is not.
    await expect
      .poll(async () => (await page.locator("body").innerText()).toLowerCase(), {
        timeout: 20_000,
        intervals: [500],
      })
      .toMatch(/limit|upgrade|402/);

    await expect(page.getByText(GENERIC)).toHaveCount(0);
  });

  test("recovers: a normal answer streams after an error", async ({ authedPage: page }) => {
    let call = 0;
    await page.route("**/api/chat", (route) => {
      call += 1;
      if (call === 1) {
        return route.fulfill({
          status: 200,
          headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
          body: uiStream([
            { type: "start" },
            { type: "error", errorText: "transient gateway error" },
          ]),
        });
      }
      return route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: uiStream([
          { type: "start" },
          { type: "start-step" },
          { type: "text-start", id: "t0" },
          { type: "text-delta", id: "t0", delta: "Magnesium is usually taken in the evening." },
          { type: "text-end", id: "t0" },
          { type: "finish-step" },
          { type: "finish", finishReason: "stop" },
        ]),
      });
    });

    const shown = await askAndReadError(page);
    expect(shown).toContain("transient gateway error");

    const input = page.getByRole("textbox").first();
    await input.fill("try again");
    await input.press("Enter");

    await expect(page.getByText(/magnesium is usually taken in the evening/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});
