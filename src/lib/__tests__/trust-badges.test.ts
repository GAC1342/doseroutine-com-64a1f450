import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Trust badges must stay attached to the primary CTAs. This is a source-level
 * contract so a refactor can't silently drop the reassurance copy from a
 * conversion surface.
 */
const SURFACES: Array<{ file: string; variant: string; occurrences: number }> = [
  { file: "src/components/signup-cta.tsx", variant: "trial", occurrences: 1 },
  { file: "src/routes/index.tsx", variant: "trial", occurrences: 4 },
  { file: "src/routes/auth.tsx", variant: "trial", occurrences: 1 },
  { file: "src/routes/closed-testing.tsx", variant: "privacy", occurrences: 1 },
  { file: "src/components/paywall-sheet.tsx", variant: "checkout", occurrences: 1 },
  { file: "src/routes/_authenticated/upgrade.tsx", variant: "checkout", occurrences: 2 },
];

describe("trust badges near primary CTAs", () => {
  for (const { file, variant, occurrences } of SURFACES) {
    it(`${file} renders ${occurrences} ${variant} badge block(s)`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/from ['"]@\/components\/trust-badges['"]/);
      const matches = src.match(new RegExp(`variant="${variant}"`, "g")) ?? [];
      expect(matches.length).toBe(occurrences);
    });
  }

  it("badge copy covers no-card trial, cancellation and privacy promises", () => {
    const src = readFileSync("src/components/trust-badges.tsx", "utf8");
    expect(src).toContain("Free to start — no card needed");
    expect(src).toContain("Secure checkout by Stripe");
    expect(src).toContain("Cancel anytime");
    expect(src.toLowerCase()).toContain("privacy respected");
  });
});
