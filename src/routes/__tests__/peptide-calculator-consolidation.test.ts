/**
 * Guards the "one canonical peptide calculator" rule.
 *
 * /peptide-calculator is the single interactive tool. The two guide pages
 * explain the math and hand users off to it. Regressions we care about:
 *   - a guide re-declaring its own WebApplication @id (splits the tool
 *     across three URLs in search results), or
 *   - a guide CTA linking to the calculator without the #calculator hash,
 *     which drops the user at the top of the page instead of the tool.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PEPTIDE_ID_IMPORT = "PEPTIDE_CALCULATOR_ID";

const read = (p: string) => readFileSync(p, "utf8");

const MAIN = "src/routes/peptide-calculator.tsx";
const GUIDES = ["src/routes/peptides-calculator.tsx", "src/routes/peptide-dosage-calculator.tsx"];

describe("peptide calculator consolidation", () => {
  it("exposes one stable calculator @id pointing at the canonical tool", () => {
    const lib = read("src/lib/peptide-guide-head.ts");
    expect(lib).toContain(
      'export const PEPTIDE_CALCULATOR_ID = "https://doseroutine.com/peptide-calculator#calculator"',
    );
  });

  it("keeps each page self-canonical", () => {
    expect(read(MAIN)).toMatch(/rel: "canonical", href: CANONICAL/);
    for (const guide of GUIDES) {
      const src = read(guide);
      expect(src, `${guide} must not canonicalise to another page`).not.toMatch(
        /rel: "canonical",\s*href: "https:\/\/doseroutine\.com\/peptide-calculator"/,
      );
    }
  });

  it("renders the calculator behind a #calculator anchor", () => {
    const src = read(MAIN);
    expect(src).toContain('id="calculator"');
    expect(src).toContain("scroll-mt-24");
    expect(src).toContain(PEPTIDE_ID_IMPORT);
  });

  it("guides link to the calculator anchor, not the bare page", () => {
    for (const guide of GUIDES) {
      const src = read(guide);
      // JSX links written inline must carry the hash directly.
      const inline = src.match(/to="\/peptide-calculator"[^>]*/g) ?? [];
      for (const link of inline) {
        expect(link, `${guide}: CTA must carry hash="calculator"`).toContain('hash="calculator"');
      }
      // Data-driven link lists (e.g. a TOOLS array) carry it as a field.
      const dataDriven = src.includes('to: "/peptide-calculator"');
      if (dataDriven) {
        expect(src, `${guide}: tool entry needs hash: "calculator"`).toContain(
          'hash: "calculator"',
        );
        expect(src, `${guide}: the Link must forward the hash`).toMatch(/hash=\{[\w.]+hash\}/);
      }
      expect(inline.length > 0 || dataDriven, `${guide} should link to the calculator`).toBe(true);
    }
  });

  it("guides attribute the tool to the canonical @id", () => {
    for (const guide of GUIDES) {
      const src = read(guide);
      const attributes =
        src.includes("PEPTIDE_CALCULATOR_ID") ||
        src.includes('toolUrl: "https://doseroutine.com/peptide-calculator"');
      expect(attributes, `${guide} must attribute the tool to the canonical URL`).toBe(true);
      expect(src, `${guide} must not mint its own app id`).not.toContain("#app`");
    }
  });

  it("keeps the guide CTA destination and calculator hub links measurable and current", () => {
    for (const guide of GUIDES) {
      const src = read(guide);
      expect(src, `${guide}: CTA tracking is missing`).toContain("guide_calculator_cta_click");
      expect(src, `${guide}: stale singular calculator hub`).not.toContain('to="/calculator"');
    }
    expect(read(MAIN)).toContain("calculator_arrival_highlight");
  });
});
