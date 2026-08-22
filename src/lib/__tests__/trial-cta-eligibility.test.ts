import { describe, expect, it } from "vitest";

import { isTrialEligible, trialCta, TRIAL_CTA_LABEL } from "@/lib/trial-cta";
import { hasEntitlementReturnSignal } from "@/lib/entitlement-refresh";

const FREE = {
  loading: false,
  unresolved: false,
  fullAccess: false,
  subscriptionActive: false,
  isTrialing: false,
  hasUsedTrial: false,
};

describe("trial CTA eligibility", () => {
  it("offers the trial to a fresh free account", () => {
    expect(isTrialEligible(FREE)).toBe(true);
    expect(trialCta(FREE)).toMatchObject({ show: true, label: TRIAL_CTA_LABEL, to: "/trial" });
  });

  it("never advertises the trial to an active subscriber", () => {
    const pro = { ...FREE, subscriptionActive: true, fullAccess: true };
    expect(isTrialEligible(pro)).toBe(false);
    expect(trialCta(pro).show).toBe(false);
  });

  it("never advertises the trial to a user already in a trial", () => {
    const trialing = { ...FREE, isTrialing: true, subscriptionActive: true, fullAccess: true };
    expect(trialCta(trialing).show).toBe(false);
  });

  it("switches to reactivate once the trial has been used", () => {
    const used = { ...FREE, hasUsedTrial: true };
    expect(isTrialEligible(used)).toBe(false);
    expect(trialCta(used)).toMatchObject({ show: true, eligible: false, to: "/upgrade" });
  });

  it("says nothing while entitlement is loading or unresolved", () => {
    expect(trialCta({ ...FREE, loading: true }).show).toBe(false);
    expect(trialCta({ ...FREE, unresolved: true }).show).toBe(false);
  });

  it("grandfathered / comp access users are not pitched a trial", () => {
    expect(trialCta({ ...FREE, fullAccess: true }).show).toBe(false);
  });
});

describe("entitlement return signals", () => {
  it("detects trial and checkout returns", () => {
    for (const search of [
      "?trial=started",
      "?checkout=success",
      "?upgrade=complete",
      "?session_id=cs_test_123",
      "?billing=1",
    ]) {
      expect(hasEntitlementReturnSignal(search), search).toBe(true);
    }
  });

  it("ignores ordinary navigation", () => {
    for (const search of ["", "?tab=stack", "?trial=", "?checkout=cancelled", "?session_id="]) {
      expect(hasEntitlementReturnSignal(search), search).toBe(false);
    }
  });
});
