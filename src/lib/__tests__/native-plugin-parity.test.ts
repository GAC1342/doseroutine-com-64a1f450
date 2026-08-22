/**
 * Audit finding C-2 regression test.
 *
 * Every Capacitor plugin installed in package.json must be registered in the
 * checked-in native projects, otherwise the bridge call fails on device even
 * though the browser build looks healthy (this is exactly how the missing
 * Browser / Health / barcode plugins shipped unnoticed).
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .mjs audit script, no types
import { checkPlatform } from "../../../scripts/check-native-plugin-parity.mjs";

describe("native plugin parity", () => {
  it("registers every installed plugin in the iOS SPM package", () => {
    const { missing } = checkPlatform("ios") as { missing: string[] };
    expect(missing).toEqual([]);
  });

  it("registers every installed plugin in the Android Gradle project", () => {
    const { missing } = checkPlatform("android") as { missing: string[] };
    expect(missing).toEqual([]);
  });

  it("documents a reason for every intentionally-absent plugin", () => {
    const excepted = [
      ...(checkPlatform("ios") as { excepted: { reason: string }[] }).excepted,
      ...(checkPlatform("android") as { excepted: { reason: string }[] }).excepted,
    ];
    for (const entry of excepted) {
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });
});
