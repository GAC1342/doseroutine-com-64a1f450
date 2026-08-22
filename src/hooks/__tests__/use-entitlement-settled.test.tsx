import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const accessState = {
  loading: false,
  unresolved: false,
  hasUsedTrial: false,
  fullAccess: false,
  isTrialing: false,
};
let fetchingCount = 0;

vi.mock("@/hooks/use-access", () => ({
  useAccess: () => accessState,
}));
vi.mock("@tanstack/react-query", () => ({
  useIsFetching: () => fetchingCount,
}));

import { useEntitlementSettled } from "../use-entitlement-settled";

describe("useEntitlementSettled", () => {
  beforeEach(() => {
    accessState.loading = false;
    accessState.unresolved = false;
    fetchingCount = 0;
  });

  it("is false while entitlement is loading", () => {
    accessState.loading = true;
    expect(renderHook(() => useEntitlementSettled()).result.current).toBe(false);
  });

  it("is false while a refresh is in flight (post-login / post-checkout)", () => {
    fetchingCount = 1;
    expect(renderHook(() => useEntitlementSettled()).result.current).toBe(false);
  });

  it("is false when entitlement could not be resolved (offline)", () => {
    accessState.unresolved = true;
    expect(renderHook(() => useEntitlementSettled()).result.current).toBe(false);
  });

  it("is true only once the answer is final", () => {
    expect(renderHook(() => useEntitlementSettled()).result.current).toBe(true);
  });
});
