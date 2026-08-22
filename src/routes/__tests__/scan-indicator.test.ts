import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "src", "routes", "_authenticated", "scan.tsx"),
  "utf8",
);

describe("scan page capture indicator", () => {
  it("shows a visible scanning badge while the camera is active", () => {
    expect(source).toMatch(/Scanning\u2026/);
    expect(source).toContain('aria-live="polite"');
  });

  it("shows a barcode found confirmation when a code is captured", () => {
    expect(source).toContain("Barcode found");
    expect(source).toContain("setCaptureFlash");
  });

  it("clears the found indicator when the user discards or confirms the code", () => {
    expect(source).toMatch(/setCaptureFlash\(null\)/);
  });
});
