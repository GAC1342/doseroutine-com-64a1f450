/**
 * One rule for "may we advertise the 7-day free trial to this user?".
 *
 * The trial is only real for an account that has never started one and has no
 * paid/comp access right now. Showing it to a Pro member, someone mid-trial, or
 * someone whose trial already ran out makes the app look broken (and, on iOS,
 * risks a guideline 3.1.2 rejection for advertising an offer the user cannot
 * take). Every signed-in surface routes its CTA through this helper so the
 * rules can never drift apart between Today, the paywall and the banners.
 */
export type TrialCtaInputs = {
  /** Entitlement still resolving — say nothing yet. */
  loading: boolean;
  /** Entitlement lookup failed — never guess "free" and pitch the trial. */
  unresolved: boolean;
  fullAccess: boolean;
  subscriptionActive: boolean;
  isTrialing: boolean;
  hasUsedTrial: boolean;
};

export const TRIAL_CTA_LABEL = "Start 7-day free trial";
export const REACTIVATE_CTA_LABEL = "Reactivate Pro";

export type TrialCta = {
  /** Render a subscription CTA at all? */
  show: boolean;
  /** True only when the CTA may mention the free trial. */
  eligible: boolean;
  label: string;
  to: "/trial" | "/upgrade";
};

/** True when the free trial is still available to this account. */
export function isTrialEligible(input: TrialCtaInputs): boolean {
  if (input.loading || input.unresolved) return false;
  if (input.fullAccess || input.subscriptionActive || input.isTrialing) return false;
  return !input.hasUsedTrial;
}

/** What (if anything) a signed-in upgrade CTA should say. */
export function trialCta(input: TrialCtaInputs): TrialCta {
  const eligible = isTrialEligible(input);
  if (eligible) return { show: true, eligible: true, label: TRIAL_CTA_LABEL, to: "/trial" };
  const show =
    !input.loading &&
    !input.unresolved &&
    !input.fullAccess &&
    !input.subscriptionActive &&
    !input.isTrialing;
  return { show, eligible: false, label: REACTIVATE_CTA_LABEL, to: "/upgrade" };
}
