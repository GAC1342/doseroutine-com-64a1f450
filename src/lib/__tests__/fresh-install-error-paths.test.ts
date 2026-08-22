/**
 * Fresh-install regression suite: on a brand-new install with no permissions
 * granted, no store connection and no cached data, notification and purchase
 * code must degrade quietly instead of throwing, hanging, or rejecting.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const notificationsMock = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  createChannel: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
  checkExactNotificationSetting: vi.fn(),
  changeExactNotificationSetting: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: notificationsMock,
  Weekday: { Monday: 2 },
}));

const purchasesMock = vi.hoisted(() => ({
  getOfferings: vi.fn(),
  purchasePackage: vi.fn(),
  restorePurchases: vi.fn(),
  getCustomerInfo: vi.fn(),
  configure: vi.fn(),
  setLogLevel: vi.fn(),
  logIn: vi.fn(),
  logOut: vi.fn(),
}));

vi.mock("@revenuecat/purchases-capacitor", () => ({
  Purchases: purchasesMock,
  LOG_LEVEL: { WARN: 2 },
}));

vi.mock("@/lib/platform", () => ({ isNative: () => true, getPlatform: () => "ios" }));
vi.mock("@/lib/revenuecat.functions", () => ({
  getRevenueCatConfig: vi.fn(async () => ({ apiKey: "" })),
  syncRevenueCatSubscription: vi.fn(async () => {
    throw new Error("offline");
  }),
}));

import {
  requestNativePermission,
  checkNativePermission,
  cancelAllDoseAlarms,
  syncDoseAlarms,
} from "@/lib/local-notifications";
import {
  getIAPOfferings,
  purchasePackage,
  restorePurchases,
  isUserCancelledError,
  withStoreTimeout,
} from "@/lib/revenuecat";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notifications on a fresh install", () => {
  it("returns false instead of throwing when the plugin is unavailable", async () => {
    notificationsMock.checkPermissions.mockRejectedValue(new Error("plugin not implemented"));
    await expect(requestNativePermission()).resolves.toBe(false);
    await expect(checkNativePermission()).resolves.toBe(false);
  });

  it("returns false when the user denies the prompt", async () => {
    notificationsMock.checkPermissions.mockResolvedValue({ display: "prompt" });
    notificationsMock.requestPermissions.mockResolvedValue({ display: "denied" });
    await expect(requestNativePermission()).resolves.toBe(false);
  });

  it("schedules nothing (and does not reject) when permission is denied", async () => {
    notificationsMock.checkPermissions.mockResolvedValue({ display: "denied" });
    notificationsMock.requestPermissions.mockResolvedValue({ display: "denied" });
    await expect(
      syncDoseAlarms([{ compoundId: "a", compoundName: "Test", time: "08:00" }]),
    ).resolves.toBe(0);
    expect(notificationsMock.schedule).not.toHaveBeenCalled();
  });

  it("swallows cancel failures on an empty device", async () => {
    notificationsMock.getPending.mockRejectedValue(new Error("no pending list"));
    await expect(cancelAllDoseAlarms()).resolves.toBeUndefined();
  });
});

describe("purchases on a fresh install", () => {
  it("shows no options rather than throwing when the store is unreachable", async () => {
    purchasesMock.getOfferings.mockRejectedValue(new Error("network unavailable"));
    await expect(getIAPOfferings()).resolves.toEqual([]);
  });

  it("returns an empty list when the store has no current offering", async () => {
    purchasesMock.getOfferings.mockResolvedValue({ current: null });
    await expect(getIAPOfferings()).resolves.toEqual([]);
  });

  it("surfaces a readable error when the requested package is missing", async () => {
    purchasesMock.getOfferings.mockResolvedValue({ current: { availablePackages: [] } });
    await expect(purchasePackage("pro_monthly")).rejects.toThrow(/not found/i);
  });

  it("still returns the customer info when the post-purchase sync fails", async () => {
    purchasesMock.getOfferings.mockResolvedValue({
      current: { availablePackages: [{ identifier: "pro_monthly", product: {} }] },
    });
    purchasesMock.purchasePackage.mockResolvedValue({
      customerInfo: { entitlements: { active: { pro: {} } } },
    });
    const info = await purchasePackage("pro_monthly");
    expect(info.activeEntitlements).toEqual(["pro"]);
  });

  it("restores to an empty entitlement set without throwing when sync fails", async () => {
    purchasesMock.restorePurchases.mockResolvedValue({ customerInfo: { entitlements: {} } });
    const info = await restorePurchases();
    expect(info.activeEntitlements).toEqual([]);
  });

  it("treats a user cancel as not an error", () => {
    expect(isUserCancelledError({ userCancelled: true })).toBe(true);
    expect(isUserCancelledError({ code: "1" })).toBe(true);
    expect(isUserCancelledError(new Error("Payment failed"))).toBe(false);
  });

  it("times out a hung store call instead of leaving the paywall spinning", async () => {
    await expect(withStoreTimeout(new Promise(() => {}), 10, "Loading")).rejects.toThrow(
      /timed out/,
    );
  });
});
