import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readCachedPublicConfig,
  writeCachedPublicConfig,
  resolvePublicConfig,
} from "../publishable-key-cache";

describe("publishable key cache", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prefers the build-time value and never hits the network", async () => {
    const fetcher = vi.fn();
    await expect(resolvePublicConfig("k", "baked", fetcher)).resolves.toBe("baked");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches once and caches the result for the next cold start", async () => {
    const fetcher = vi.fn().mockResolvedValue("fresh");
    await expect(resolvePublicConfig("k", undefined, fetcher)).resolves.toBe("fresh");
    expect(readCachedPublicConfig("k")).toBe("fresh");
  });

  it("serves the cached value when the fetch fails (offline cold start)", async () => {
    writeCachedPublicConfig("k", "cached");
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(resolvePublicConfig("k", undefined, fetcher)).resolves.toBe("cached");
  });

  it("returns null when there is no value anywhere", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(resolvePublicConfig("missing", undefined, fetcher)).resolves.toBeNull();
  });
});
