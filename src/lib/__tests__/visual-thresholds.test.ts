import { describe, expect, it } from "vitest";
import {
  resolveVisualProfile,
  resolveVisualThresholds,
  snapshotOptions,
} from "../../../e2e/visual-thresholds";

describe("visual diff thresholds", () => {
  it("defaults to the historical 2% ratio", () => {
    expect(resolveVisualProfile({})).toBe("default");
    expect(resolveVisualThresholds(undefined, {})).toEqual({
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    });
  });

  it("loosens tolerance on the staging profile", () => {
    const t = resolveVisualThresholds(undefined, { VISUAL_DIFF_PROFILE: "staging" });
    expect(t.maxDiffPixelRatio).toBeGreaterThan(0.02);
    expect(t.maxDiffPixels).toBe(5000);
  });

  it("lets explicit env values win over the profile", () => {
    const t = resolveVisualThresholds(undefined, {
      VISUAL_DIFF_PROFILE: "strict",
      VISUAL_MAX_DIFF_PIXEL_RATIO: "0.07",
    });
    expect(t.maxDiffPixelRatio).toBe(0.07);
  });

  it("supports per-spec overrides", () => {
    const env = { VISUAL_MAX_DIFF_PIXEL_RATIO: "0.03", VISUAL_MINT_MAX_DIFF_PIXEL_RATIO: "0.09" };
    expect(resolveVisualThresholds("mint", env).maxDiffPixelRatio).toBe(0.09);
    expect(resolveVisualThresholds("exercise-art", env).maxDiffPixelRatio).toBe(0.03);
  });

  it("rejects invalid values", () => {
    expect(() => resolveVisualProfile({ VISUAL_DIFF_PROFILE: "nope" })).toThrow();
    expect(() =>
      resolveVisualThresholds(undefined, { VISUAL_MAX_DIFF_PIXEL_RATIO: "5" }),
    ).toThrow();
    expect(() => resolveVisualThresholds(undefined, { VISUAL_PIXEL_THRESHOLD: "x" })).toThrow();
  });

  it("keeps determinism options in snapshotOptions", () => {
    const opts = snapshotOptions("mint", {}, {});
    expect(opts).toMatchObject({ animations: "disabled", scale: "css", maxDiffPixelRatio: 0.02 });
  });
});
