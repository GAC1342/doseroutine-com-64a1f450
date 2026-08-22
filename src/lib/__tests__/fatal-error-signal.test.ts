import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  emitGlobalError,
  initGlobalErrorSignal,
  isIgnoredRuntimeError,
  subscribeToGlobalErrors,
  __resetGlobalErrorSignal,
} from "../fatal-error-signal";

beforeEach(() => {
  __resetGlobalErrorSignal();
  vi.useRealTimers();
});

describe("isIgnoredRuntimeError", () => {
  it("ignores stale-chunk failures (router.tsx already reloads once)", () => {
    expect(isIgnoredRuntimeError("Failed to fetch dynamically imported module: /x.js")).toBe(true);
    expect(isIgnoredRuntimeError("ChunkLoadError: loading chunk 3 failed")).toBe(true);
  });

  it("ignores benign and non-actionable noise", () => {
    for (const m of [
      "ResizeObserver loop completed with undelivered notifications.",
      "AbortError: The user aborted a request.",
      "Script error.",
      "   ",
      "Error at chrome-extension://abc/inject.js",
    ]) {
      expect(isIgnoredRuntimeError(m), m).toBe(true);
    }
  });

  it("does not ignore real application errors", () => {
    expect(isIgnoredRuntimeError("TypeError: x.map is not a function")).toBe(false);
  });
});

describe("emitGlobalError", () => {
  it("notifies subscribers with source and message", () => {
    const seen: string[] = [];
    subscribeToGlobalErrors((e) => seen.push(`${e.source}:${e.message}`));
    emitGlobalError("uncaught", new TypeError("boom"));
    expect(seen).toEqual(["uncaught:TypeError: boom"]);
  });

  it("collapses repeated identical errors within the burst window", () => {
    const seen: string[] = [];
    subscribeToGlobalErrors((e) => seen.push(e.message));
    emitGlobalError("unhandledrejection", new Error("same"));
    emitGlobalError("unhandledrejection", new Error("same"));
    emitGlobalError("unhandledrejection", new Error("other"));
    expect(seen).toEqual(["Error: same", "Error: other"]);
  });

  it("never lets a broken subscriber break error handling", () => {
    const seen: string[] = [];
    subscribeToGlobalErrors(() => {
      throw new Error("listener exploded");
    });
    subscribeToGlobalErrors((e) => seen.push(e.message));
    expect(() => emitGlobalError("uncaught", new Error("real"))).not.toThrow();
    expect(seen).toEqual(["Error: real"]);
  });

  it("unsubscribes cleanly", () => {
    const seen: string[] = [];
    const off = subscribeToGlobalErrors((e) => seen.push(e.message));
    off();
    emitGlobalError("uncaught", new Error("ignored"));
    expect(seen).toEqual([]);
  });
});

describe("initGlobalErrorSignal", () => {
  it("captures window errors and unhandled rejections, and is idempotent", () => {
    const seen: string[] = [];
    subscribeToGlobalErrors((e) => seen.push(`${e.source}:${e.message}`));
    initGlobalErrorSignal();
    initGlobalErrorSignal(); // must not double-register listeners

    window.dispatchEvent(
      new ErrorEvent("error", { error: new Error("render blew up"), message: "render blew up" }),
    );
    const rejection = new Event("unhandledrejection") as Event & { reason?: unknown };
    rejection.reason = new Error("promise blew up");
    window.dispatchEvent(rejection);

    expect(seen).toEqual([
      "uncaught:Error: render blew up",
      "unhandledrejection:Error: promise blew up",
    ]);
  });

  it("ignores resource load failures (they are logged, not fatal)", () => {
    const seen: string[] = [];
    subscribeToGlobalErrors((e) => seen.push(e.message));
    initGlobalErrorSignal();

    const img = document.createElement("img");
    document.body.appendChild(img);
    img.dispatchEvent(new Event("error", { bubbles: true }));

    expect(seen).toEqual([]);
    img.remove();
  });
});
