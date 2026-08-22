import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * L2 / L3 — App Store pre-submission regressions.
 *
 * L2: the paywall's in-sheet EULA summary must not drift from the canonical
 *     /legal and /privacy pages (Apple compares the paywall EULA to the one
 *     listed on the product page).
 * L3: the Terms/Privacy links must stay in-sheet. A refactor back to <Link> or
 *     a bare <a> unmounts the paywall mid-purchase ("reloads the whole app").
 */
const dialog = readFileSync("src/components/paywall-legal-dialog.tsx", "utf8");
const paywall = readFileSync("src/components/native-paywall.tsx", "utf8");
const legal = readFileSync("src/routes/legal.tsx", "utf8");

describe("paywall legal copy", () => {
  it("keeps auto-renew and cancellation terms in the paywall sheet", () => {
    expect(dialog).toMatch(/auto-renew/i);
    expect(dialog).toMatch(/24 hours/i);
    expect(dialog).toMatch(/Apple ID or Google account/i);
  });

  it("states the same prices as the canonical legal page", () => {
    for (const price of ["$9.99", "$59.99"]) {
      expect(paywall).toContain(price);
      expect(legal).toContain(price);
    }
  });

  it("links out to the full canonical documents", () => {
    expect(dialog).toContain('to: "/legal"');
    expect(dialog).toContain('to: "/privacy"');
  });
});

describe("paywall legal links stay in-sheet", () => {
  it("renders the dialog for both documents", () => {
    expect(paywall).toContain('<PaywallLegalDialog doc="terms" />');
    expect(paywall).toContain('<PaywallLegalDialog doc="privacy" />');
  });

  it("has no navigation away from the purchase sheet", () => {
    expect(paywall).not.toMatch(/<Link\s[^>]*to="\/(legal|privacy)/);
    expect(paywall).not.toMatch(/<a\s[^>]*href="\/(legal|privacy)/);
  });
});
