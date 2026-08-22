import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { HEALTH_READ_SCOPES, HEALTH_WRITE_SCOPES } from "@/lib/health-bridge";

const ROOT = process.cwd();
const INFO_PLIST = readFileSync(join(ROOT, "ios/App/App/Info.plist"), "utf8");

/**
 * Guards the App Store review surface that lives outside TypeScript: the iOS
 * privacy manifest, the Health purpose strings, and the medical disclaimer
 * that every dosing calculator must carry.
 */
describe("iOS store compliance", () => {
  it("keeps the source privacy manifest and the shipped one identical", () => {
    const source = readFileSync(join(ROOT, "ios-privacy/PrivacyInfo.xcprivacy"), "utf8");
    const shipped = readFileSync(join(ROOT, "ios/App/App/PrivacyInfo.xcprivacy"), "utf8");
    expect(shipped.trim()).toBe(source.trim());
  });

  it("declares every requested Health scope in the purpose strings", () => {
    const share = /<key>NSHealthShareUsageDescription<\/key>\s*<string>([^<]*)<\/string>/.exec(
      INFO_PLIST,
    )?.[1];
    const update = /<key>NSHealthUpdateUsageDescription<\/key>\s*<string>([^<]*)<\/string>/.exec(
      INFO_PLIST,
    )?.[1];
    expect(share).toBeTruthy();
    expect(update).toBeTruthy();

    // Words the purpose string must mention for each scope we request.
    const readWords: Record<string, string[]> = {
      weight: ["weight"],
      steps: ["steps"],
      activeEnergy: ["energy"],
      heartRate: ["heart rate"],
    };
    const writeWords: Record<string, string[]> = {
      workouts: ["workout"],
      nutrition: ["nutrition"],
    };

    for (const scope of HEALTH_READ_SCOPES) {
      const words = readWords[scope];
      expect(words, `NSHealthShareUsageDescription has no wording for "${scope}"`).toBeTruthy();
      for (const w of words!) expect(share!.toLowerCase()).toContain(w);
    }
    for (const scope of HEALTH_WRITE_SCOPES) {
      const words = writeWords[scope];
      expect(words, `NSHealthUpdateUsageDescription has no wording for "${scope}"`).toBeTruthy();
      for (const w of words!) expect(update!.toLowerCase()).toContain(w);
    }
  });

  it("shows a medical disclaimer on every dosing calculator route", () => {
    const dir = join(ROOT, "src/routes");
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".tsx") && /calculator|dosage/i.test(f) && !/guide|chart|\$slug/.test(f),
    );
    expect(files.length).toBeGreaterThan(4);
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      // Layout shells just render an <Outlet />; the disclaimer belongs on the
      // leaf pages they wrap.
      if (src.includes("<Outlet />")) continue;
      const hasDisclaimer =
        src.includes("CalculatorScopeNote") ||
        // Guide-style pages render their disclaimer inside PeptideGuidePage.
        src.includes("PeptideGuidePage") ||
        src.includes("/medical-disclaimer") ||
        /not medical advice/i.test(src);
      expect(hasDisclaimer, `${f} is missing a medical disclaimer`).toBe(true);
    }
  });
});
