/**
 * Single source of truth for "does this user get full app access".
 *
 * Rules:
 *   - Grandfathered users (created before the trial-paywall deploy) ALWAYS
 *     have full access, forever. We never yank active safety warnings out
 *     from under someone mid-stack.
 *   - Anyone with an active/trialing/past-due subscription has full access.
 *   - Everyone else is a new free user who must start the 7-day trial to
 *     unlock the app.
 */
export type AccessInputs = {
  grandfathered: boolean | null | undefined;
  subscriptionActive: boolean | null | undefined;
  /** ISO timestamp of complimentary (tester reward) access, if any. */
  compAccessUntil?: string | null;
};

export function isCompAccessActive(until: string | null | undefined): boolean {
  if (!until) return false;
  const t = new Date(until).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export function hasFullAccess(inputs: AccessInputs): boolean {
  if (inputs.grandfathered) return true;
  if (inputs.subscriptionActive) return true;
  if (isCompAccessActive(inputs.compAccessUntil)) return true;
  return false;
}

/** Free months awarded to closed-testing participants after 14 days. */
export const TESTER_REWARD_MONTHS = 3;

export const TRIAL_DAYS = 7;
export const TRIAL_PRO_MONTHLY_PRICE_ID = "pro_monthly";
export const TRIAL_PRO_YEARLY_PRICE_ID = "pro_yearly";
export const TRIAL_PRO_YEARLY_CENTS = 5999;
export const TRIAL_PRO_MONTHLY_CENTS = 999;
