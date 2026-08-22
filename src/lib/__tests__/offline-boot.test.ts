import { describe, expect, it, vi, afterEach } from "vitest";
import { isOffline } from "@/lib/offline-boot";
import { classifyBoundaryError } from "@/lib/error-classify";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

afterEach(() => {
  setOnline(true);
  vi.restoreAllMocks();
});

describe("offline cold start", () => {
  it("reports offline from navigator", () => {
    setOnline(false);
    expect(isOffline()).toBe(true);
    setOnline(true);
    expect(isOffline()).toBe(false);
  });

  it("treats chunk download failures as offline, not crashes", () => {
    for (const message of [
      "Failed to fetch dynamically imported module: /assets/today-abc.js",
      "error loading dynamically imported module",
      "Importing a module script failed.",
      "ChunkLoadError: Loading chunk 12 failed",
    ]) {
      expect(classifyBoundaryError(new Error(message))).toBe("offline");
    }
  });
});
