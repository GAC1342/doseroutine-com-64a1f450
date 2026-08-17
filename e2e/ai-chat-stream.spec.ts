import { test as base, expect } from "@playwright/test";
import { AUTH_AVAILABLE, test } from "./utils";

/**
 * AI Coach end-to-end coverage.
 *
 * Regression guard for the July bug where /api/chat answered 200 and then the
 * stream died immediately (system messages were passed inside `messages`,
 * which AI SDK v7 rejects). The HTTP status looked healthy, so only reading
 * the streamed body catches it.
 *
 * Auth-free checks always run. The full round-trip needs
 * TEST_USER_EMAIL / TEST_USER_PASSWORD and is skipped without them.
 */

const QUESTION = "In one short sentence, what does DoseRoutine help me track?";

/** A healthy answer completes well inside this; a hung stream must fail, not hang the suite. */
const STREAM_TIMEOUT_MS = 45_000;

base("chat route rejects unauthenticated callers instead of erroring", async ({ request }) => {
  const res = await request.post("/api/chat", {
    data: { messages: [{ id: "1", role: "user", parts: [{ type: "text", text: QUESTION }] }] },
  });
  // 401 proves the route is wired and configured. 500 would mean missing
  // LOVABLE_API_KEY / backend env on this build.
  expect(res.status(), await res.text()).toBe(401);
});

base.describe("signed-in AI coach", () => {
  base.skip(
    !AUTH_AVAILABLE,
    "Set TEST_USER_EMAIL / TEST_USER_PASSWORD to run the AI coach round-trip",
  );

  test("AI coach streams a real answer with no error part", async ({ authedPage: page }) => {
    // Read the signed-in session token the app itself uses.
    const token = await page.evaluate(() => {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k || !/^sb-.*-auth-token$/.test(k)) continue;
        try {
          const parsed = JSON.parse(window.localStorage.getItem(k) ?? "{}");
          if (parsed?.access_token) return parsed.access_token as string;
        } catch {
          /* ignore malformed entries */
        }
      }
      return null;
    });
    expect(token, "signed-in session token not found in storage").toBeTruthy();

    const started = Date.now();
    const res = await page.request.post("/api/chat", {
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      data: {
        messages: [{ id: "e2e-1", role: "user", parts: [{ type: "text", text: QUESTION }] }],
      },
      timeout: STREAM_TIMEOUT_MS,
    });

    const body = await res.text();
    const elapsed = Date.now() - started;

    // Daily/monthly quota is a legitimate product response, not a failure.
    if (res.status() === 402) {
      test.skip(true, `chat quota reached for the test account: ${body}`);
      return;
    }

    expect(res.status(), body).toBe(200);

    // The UI message stream is SSE-ish JSON lines. A healthy answer contains
    // text deltas; a broken model call contains an error part instead.
    expect(body, "stream contained an error part").not.toContain('"type":"error"');
    expect(body).toContain('"type":"text-delta"');

    // Deltas alone are not enough: the stream must reach a normal completion
    // rather than being cut off mid-answer. Assert the full terminal sequence.
    const events = body
      .split("\n")
      .map((line) => line.replace(/^data:\s*/, "").trim())
      .filter(Boolean);
    const finish = events
      .filter((e) => e !== "[DONE]")
      .map((e) => {
        try {
          return JSON.parse(e) as { type?: string; finishReason?: string };
        } catch {
          return null;
        }
      })
      .find((e) => e?.type === "finish");

    expect(events.at(-1), "stream did not terminate with [DONE]").toBe("[DONE]");
    expect(body, "stream never closed the text part").toContain('"type":"text-end"');
    expect(body, "stream never emitted finish-step").toContain('"type":"finish-step"');
    expect(finish, `stream ended without a finish event: ${body.slice(-500)}`).toBeTruthy();
    // "stop" = the model finished its answer. "length"/"error"/"tool-calls"
    // here would mean a truncated or failed completion.
    expect(finish?.finishReason, "completion was truncated, not a normal finish").toBe("stop");
    expect(elapsed, "stream took too long to complete").toBeLessThan(STREAM_TIMEOUT_MS);

    const answer = [...body.matchAll(/"delta":"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => JSON.parse(`"${m[1]}"`))
      .join("");
    expect(
      answer.trim().length,
      `assistant produced no text: ${body.slice(0, 500)}`,
    ).toBeGreaterThan(20);
  });

  test("AI coach chat page renders a final assistant reply, not an error", async ({
    authedPage: page,
  }) => {
    await page.goto("/chat");

    const input = page.getByRole("textbox").first();
    await input.waitFor({ state: "visible", timeout: 15_000 });
    await input.fill(QUESTION);
    await input.press("Enter");

    // Either a real reply arrives, or the visible quota notice appears.
    const errorText = page.getByText(/an error occurred|hit an error|something went wrong/i);
    const readMain = async () => (await page.locator("body").innerText()).toLowerCase();

    const outcome = await expect
      .poll(
        async () => {
          if (await errorText.count()) return "error";
          const text = await readMain();
          if (text.includes("limit") && text.includes("upgrade")) return "quota";
          return text.length > QUESTION.length + 60 ? "answered" : "pending";
        },
        { timeout: STREAM_TIMEOUT_MS, intervals: [1000] },
      )
      .not.toBe("pending")
      .then(readMain);

    await expect(errorText).toHaveCount(0);

    if (outcome.includes("limit") && outcome.includes("upgrade")) {
      test.skip(true, "chat quota reached for the test account");
      return;
    }

    // Partial deltas are not a pass: wait for the stream to settle and assert
    // the rendered answer is final (text stopped growing, composer re-enabled).
    let previous = "";
    await expect
      .poll(
        async () => {
          const text = await readMain();
          const settled = text === previous && text.length > 0;
          previous = text;
          return settled;
        },
        { timeout: STREAM_TIMEOUT_MS, intervals: [1500] },
      )
      .toBe(true);

    // A live stream keeps the send control in stop/disabled state; once the
    // run completes normally the composer accepts input again.
    await expect(input).toBeEnabled();
    await expect(page.getByRole("button", { name: /stop/i })).toHaveCount(0);

    // The settled transcript must contain a real answer beyond the question.
    const finalAnswer = previous.replace(QUESTION.toLowerCase(), "").trim();
    expect(
      finalAnswer.length,
      `no final assistant answer rendered: ${previous.slice(0, 500)}`,
    ).toBeGreaterThan(40);
  });
});
