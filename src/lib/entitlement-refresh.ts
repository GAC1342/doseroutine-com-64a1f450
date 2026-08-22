/**
 * Entitlement freshness after account/billing changes.
 *
 * `useSubscription` and `useProfileFlags` are cached (2 min / 1 min stale
 * times). That is right for normal browsing and wrong at exactly two moments:
 * straight after signup, and straight after coming back from checkout. Without
 * an explicit refresh the UI keeps advertising the 7-day trial to a user who
 * just started it — or to a brand-new account whose cache still holds the
 * previous (signed-out) answer.
 */
import { useEffect } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";

export const ENTITLEMENT_QUERY_KEYS = [["subscription"], ["profile-flags"]] as const;

/** Drop and refetch every cached entitlement answer. */
export async function refreshEntitlement(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    ENTITLEMENT_QUERY_KEYS.map((queryKey) =>
      queryClient
        .invalidateQueries({ queryKey: [...queryKey], exact: false, refetchType: "all" })
        .catch(() => undefined),
    ),
  );
}

/**
 * Query params Stripe / the trial flow send us back with. Any of them means
 * billing state just changed server-side and the cache is stale by definition.
 */
const RETURN_PARAMS = ["trial", "checkout", "upgrade", "session_id", "billing"];

export function hasEntitlementReturnSignal(search: string): boolean {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return false;
  }
  return RETURN_PARAMS.some((key) => {
    const value = params.get(key);
    if (value == null) return false;
    if (key === "session_id") return value.length > 0;
    return /^(started|success|complete|completed|active|done|1|true)$/i.test(value);
  });
}

/**
 * Refetches entitlement once when the page was opened as a checkout/trial
 * return. Mount it on the landing screen (Today).
 */
export function useEntitlementReturnRefresh(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasEntitlementReturnSignal(window.location.search)) return;
    void refreshEntitlement(queryClient);
  }, [queryClient]);
}
