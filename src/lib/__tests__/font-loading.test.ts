import { describe, expect, it } from "vitest";
import {
  FONT_CONTRACT,
  deriveCriticalPreloads,
  runFontValidation,
} from "../../../scripts/validate-fonts.mjs";

/**
 * Always-on guard for font drift: families, weights (600/700), @font-face
 * definitions, preload links and font-weight class usage must agree.
 * Same checks CI runs via `npm run validate:fonts`.
 */
describe("font loading contract", () => {
  const { errors, info } = runFontValidation();

  it("reports zero drift between CSS, preloads and class usage", () => {
    expect(errors).toEqual([]);
  });

  it("loads only the contracted weights", () => {
    expect(info.loadedWeights).toEqual(FONT_CONTRACT.weights);
  });

  it("preloads only the critical latin faces", () => {
    expect(info.preloadLinkCount).toBe(FONT_CONTRACT.weights.length);
    expect(info.preloadImports.every((s: string) => s.includes("-latin-"))).toBe(true);
  });

  it("declares font-display: swap on every face", () => {
    expect(info.faces.length).toBeGreaterThan(0);
    for (const face of info.faces) {
      expect(face.display).toBe(FONT_CONTRACT.fontDisplay);
      expect(face.family).toBe(FONT_CONTRACT.family);
    }
  });
});

/**
 * The preload list is generated from the parsed @font-face rules, so it can't
 * drift from what the CSS actually ships. These assert the generator itself
 * and that __root.tsx matches its output exactly.
 */
describe("generated critical preload URLs", () => {
  const { info } = runFontValidation();

  it("derives one preload per critical subset/weight from the CSS", () => {
    expect(info.derivedPreloads.length).toBe(
      FONT_CONTRACT.preloadSubsets.length * FONT_CONTRACT.weights.length,
    );
    for (const weight of FONT_CONTRACT.weights) {
      expect(info.derivedPreloads.some((s: string) => s.includes(`-${weight}-`))).toBe(true);
    }
    for (const spec of info.derivedPreloads) {
      expect(spec.startsWith(`${FONT_CONTRACT.package}/`)).toBe(true);
      expect(spec.endsWith(".woff2")).toBe(true);
    }
  });

  it("matches the preloads declared in __root.tsx exactly", () => {
    expect([...info.preloadImports].sort()).toEqual([...info.derivedPreloads].sort());
    expect(info.preloadLinkCount).toBe(info.derivedPreloads.length);
  });

  it("only generates non-critical-subset faces when the contract asks for them", () => {
    const nonCritical = FONT_CONTRACT.subsets.filter(
      (s: string) => !FONT_CONTRACT.preloadSubsets.includes(s),
    );
    for (const subset of nonCritical) {
      expect(info.derivedPreloads.some((s: string) => s.includes(`-${subset}-`))).toBe(false);
    }
  });

  it("drops faces from the generated list when the CSS stops shipping them", () => {
    const faces = [
      {
        cssPath: `${FONT_CONTRACT.package}/latin-600.css`,
        family: FONT_CONTRACT.family,
        weight: 600,
        display: "swap",
        srcs: ["./files/space-grotesk-latin-600-normal.woff2"],
      },
      {
        cssPath: `${FONT_CONTRACT.package}/latin-ext-700.css`,
        family: FONT_CONTRACT.family,
        weight: 700,
        display: "swap",
        srcs: ["./files/space-grotesk-latin-ext-700-normal.woff2"],
      },
    ];
    expect(deriveCriticalPreloads(faces)).toEqual([
      `${FONT_CONTRACT.package}/files/space-grotesk-latin-600-normal.woff2`,
    ]);
    expect(deriveCriticalPreloads([])).toEqual([]);
  });
});
