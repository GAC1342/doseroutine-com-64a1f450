import { describe, expect, it } from "vitest";
import { userFacingErrorMessage } from "@/lib/error-classify";

describe("userFacingErrorMessage", () => {
  it("turns WKWebView and Chromium fetch failures into offline copy", () => {
    for (const raw of ["Load failed", "Failed to fetch", "NetworkError when attempting to fetch"]) {
      const text = userFacingErrorMessage(new TypeError(raw), "Could not save that meal.");
      expect(text).toMatch(/offline/i);
      expect(text).not.toContain(raw);
    }
  });

  it("asks the user to sign in again when the session expired", () => {
    const text = userFacingErrorMessage(new Error("JWT expired"), "Could not save that meal.");
    expect(text).toMatch(/sign in again/i);
  });

  it("falls back to the caller's wording for oversized internals", () => {
    const text = userFacingErrorMessage(new Error("x".repeat(500)), "Could not save that meal.");
    expect(text).toBe("Could not save that meal.");
  });

  it("keeps short, readable server messages", () => {
    const text = userFacingErrorMessage(new Error("Barcode not recognised"), "Lookup failed.");
    expect(text).toBe("Barcode not recognised");
  });
});
