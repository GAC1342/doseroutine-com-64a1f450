import { describe, it, expect, vi } from "vitest";
import { isUserCancelledError, withStoreTimeout } from "@/lib/revenuecat";

describe("isUserCancelledError", () => {
  it("detects store cancellation shapes", () => {
    expect(isUserCancelledError({ userCancelled: true })).toBe(true);
    expect(isUserCancelledError({ code: "1" })).toBe(true);
    expect(isUserCancelledError({ code: "PURCHASE_CANCELLED_ERROR" })).toBe(true);
    expect(isUserCancelledError(new Error("Purchase was cancelled"))).toBe(true);
  });

  it("does not swallow real failures", () => {
    expect(isUserCancelledError(new Error("Network request failed"))).toBe(false);
    expect(isUserCancelledError(null)).toBe(false);
    expect(isUserCancelledError({ code: "2" })).toBe(false);
  });
});

describe("withStoreTimeout", () => {
  it("resolves fast promises", async () => {
    await expect(withStoreTimeout(Promise.resolve("ok"), 50, "Test")).resolves.toBe("ok");
  });

  it("rejects when the store never answers", async () => {
    vi.useFakeTimers();
    const pending = withStoreTimeout(new Promise(() => {}), 1000, "Restoring purchases");
    const assertion = expect(pending).rejects.toThrow(/Restoring purchases timed out/);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    vi.useRealTimers();
  });

  it("passes through underlying rejections", async () => {
    await expect(withStoreTimeout(Promise.reject(new Error("boom")), 50, "Test")).rejects.toThrow(
      "boom",
    );
  });
});
