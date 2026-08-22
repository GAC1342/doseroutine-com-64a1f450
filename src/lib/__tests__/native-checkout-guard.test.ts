import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { isNativeUserAgent } from "@/lib/native-request";

describe("native user agent detection", () => {
  it("flags the Capacitor shell", () => {
    expect(
      isNativeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 DoseRoutineApp",
      ),
    ).toBe(true);
    expect(isNativeUserAgent("Mozilla/5.0 Android Capacitor/6.0")).toBe(true);
  });

  it("leaves ordinary browsers alone", () => {
    expect(isNativeUserAgent("Mozilla/5.0 (Macintosh) Chrome/130 Safari/537.36")).toBe(false);
    expect(isNativeUserAgent(null)).toBe(false);
  });
});

describe("checkout server function", () => {
  it("refuses native requests before touching Stripe", () => {
    const src = readFileSync("src/lib/payments.functions.ts", "utf8");
    expect(src).toContain("isNativeUserAgent");
  });
});

describe("admin server functions", () => {
  it("verify the admin role server-side", () => {
    const adminRoutes = readdirSync("src/routes/_authenticated/admin");
    const imported = new Set<string>();
    for (const file of adminRoutes) {
      const src = readFileSync(`src/routes/_authenticated/admin/${file}`, "utf8");
      for (const m of src.matchAll(/@\/lib\/([a-z0-9.-]+)\.functions/g)) imported.add(m[1]);
    }
    expect(imported.size).toBeGreaterThan(0);
    for (const mod of imported) {
      const src = readFileSync(`src/lib/${mod}.functions.ts`, "utf8");
      expect(src, `${mod}.functions.ts must verify admin role`).toMatch(
        /is_admin|assertAdmin|requireAdmin/,
      );
    }
  });
});
