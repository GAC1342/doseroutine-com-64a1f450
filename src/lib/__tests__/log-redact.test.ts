import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { redactError, redactId, redactPrefixedId } from "../log-redact";

describe("redactId", () => {
  it("keeps only a short tail of a uuid", () => {
    const id = "2f1c9a44-3b21-4a90-9f0e-123456789be3";
    const out = redactId(id);
    expect(out).toBe("…9be3");
    expect(out).not.toContain("2f1c9a44");
  });

  it("collapses short or missing values entirely", () => {
    expect(redactId("")).toBe("<none>");
    expect(redactId(undefined)).toBe("<none>");
    expect(redactId("abc123")).toBe("<redacted>");
  });
});

describe("redactPrefixedId", () => {
  it("keeps the object-type prefix but not the body", () => {
    expect(redactPrefixedId("cs_test_a1b2c3d4e5f6g7h8")).toBe("cs_…g7h8");
    expect(redactPrefixedId("cs_test_a1b2c3d4e5f6g7h8")).not.toContain("a1b2c3");
  });
});

describe("redactError", () => {
  it("reduces thrown values to a message string", () => {
    expect(redactError(new Error("boom"))).toBe("boom");
    expect(redactError({ message: "nope" })).toBe("nope");
    expect(redactError(42)).toBe("unknown error");
  });
});

describe("payment webhook logging", () => {
  const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

  it("never logs a raw user id or session id", () => {
    const src = read("src/routes/api/public/payments/webhook.ts");
    expect(src).toContain("redactId(userId)");
    expect(src).toContain("redactPrefixedId(session.id)");
    expect(src).not.toMatch(/console\.\w+\([^)]*,\s*userId\s*[,)]/);
    expect(src).not.toContain('console.log("Checkout session completed:", session.id');
  });

  it("logs redacted errors rather than raw exception objects", () => {
    for (const rel of [
      "src/routes/api/public/payments/webhook.ts",
      "src/routes/api/public/payments/revenuecat-webhook.ts",
    ]) {
      expect(read(rel)).not.toMatch(/console\.error\([^)]*,\s*e\)/);
    }
  });
});
