import { describe, expect, it } from "vitest";
import {
  buildAttReport,
  declaredDependencies,
  findIdfaSdks,
  plistHasKey,
} from "@/lib/att-readiness";

describe("ATT / IDFA readiness", () => {
  it("finds no advertising or attribution SDKs in the bundle", () => {
    expect(findIdfaSdks()).toEqual([]);
    expect(declaredDependencies().length).toBeGreaterThan(10);
  });

  it("flags a tracking SDK when one is added", () => {
    expect(findIdfaSdks(["@capacitor-community/admob", "react"])).toEqual([
      "AdMob (@capacitor-community/admob)",
    ]);
  });

  it("keeps NSUserTrackingUsageDescription out of Info.plist while nothing tracks", () => {
    expect(plistHasKey("NSUserTrackingUsageDescription")).toBe(false);
    expect(plistHasKey("SKAdNetworkItems")).toBe(false);
  });

  it("keeps every permission the app actually requests declared", () => {
    for (const key of [
      "NSCameraUsageDescription",
      "NSPhotoLibraryUsageDescription",
      "NSHealthShareUsageDescription",
      "NSHealthUpdateUsageDescription",
    ]) {
      expect(plistHasKey(key), key).toBe(true);
    }
  });

  it("answers No to Apple's IDFA question with no failing checks", () => {
    const report = buildAttReport();
    expect(report.usesIdfa).toBe(false);
    expect(report.attPromptRequired).toBe(false);
    expect(report.checks.filter((c) => c.status === "fail")).toEqual([]);
  });
});

describe("purchases SDK stays IAP-only", () => {
  it("never calls collectDeviceIdentifiers anywhere in the app source", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (
          /\.(ts|tsx)$/.test(entry) &&
          !full.includes("__tests__") &&
          !full.endsWith("att-readiness.ts")
        ) {
          if (readFileSync(full, "utf8").includes("collectDeviceIdentifiers")) offenders.push(full);
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});
