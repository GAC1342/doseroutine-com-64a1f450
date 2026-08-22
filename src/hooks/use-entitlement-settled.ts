import { useIsFetching } from "@tanstack/react-query";
import { useAccess } from "./use-access";

/**
 * Anti-flicker guard for entitlement-dependent UI (trial cards, upgrade
 * banners, paywall CTAs).
 *
 * `useAccess().loading` only covers the *first* load of each query. Right
 * after signup, login, or a return from checkout we deliberately invalidate
 * the profile + subscription queries (see `entitlement-refresh.ts`), so the
 * hooks briefly report a resolved-but-stale state. Anything rendered from
 * that window paints once and vanishes — which is how the "7-day free trial"
 * card used to flash at users who already had Pro.
 *
 * This hook stays `false` until nothing entitlement-related is in flight, so
 * callers can hold their render until the answer is final.
 */
export function useEntitlementSettled(): boolean {
  const access = useAccess();
  const refetchingProfile = useIsFetching({ queryKey: ["profile-flags"] });
  const refetchingSubscription = useIsFetching({ queryKey: ["subscription"] });

  if (access.loading) return false;
  // An unresolved entitlement (offline / API error) is not a settled answer:
  // never render trial or upgrade messaging off a failed lookup.
  if (access.unresolved) return false;
  return refetchingProfile === 0 && refetchingSubscription === 0;
}
