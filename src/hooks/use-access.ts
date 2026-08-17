import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./use-subscription";
import { hasFullAccess, isCompAccessActive } from "@/lib/access";

type ProfileFlags = {
  grandfathered: boolean;
  hasUsedTrial: boolean;
  consented: boolean;
  compAccessUntil: string | null;
};

async function fetchProfileFlags(): Promise<ProfileFlags> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user)
    return { grandfathered: false, hasUsedTrial: false, consented: false, compAccessUntil: null };
  const { data } = await supabase
    .from("profiles")
    .select("grandfathered, has_used_trial, consented_at, comp_access_until")
    .eq("id", userRes.user.id)
    .maybeSingle();
  return {
    grandfathered: !!data?.grandfathered,
    hasUsedTrial: !!data?.has_used_trial,
    consented: !!data?.consented_at,
    compAccessUntil:
      (data as { comp_access_until?: string | null } | null)?.comp_access_until ?? null,
  };
}

export function useProfileFlags() {
  return useQuery({
    queryKey: ["profile-flags"],
    queryFn: fetchProfileFlags,
    staleTime: 60_000,
  });
}

/**
 * Aggregated access check: are they allowed into the full app?
 * Also returns intermediate flags so callers can decide what CTA to show.
 */
export function useAccess() {
  const flags = useProfileFlags();
  const sub = useSubscription();
  const loading = flags.isLoading || sub.isLoading;
  const grandfathered = !!flags.data?.grandfathered;
  const subscriptionActive = !!sub.data?.active;
  const isTrialing = sub.data?.status === "trialing";
  const compAccessUntil = flags.data?.compAccessUntil ?? null;
  const compAccess = isCompAccessActive(compAccessUntil);
  const fullAccess = hasFullAccess({ grandfathered, subscriptionActive, compAccessUntil });
  return {
    loading,
    grandfathered,
    hasUsedTrial: !!flags.data?.hasUsedTrial,
    subscriptionActive,
    isTrialing,
    /** True while a complimentary (tester reward) window is running. */
    compAccess,
    compAccessUntil,
    fullAccess,
    /** True when they should be pushed to the trial paywall. */
    needsTrial: !loading && !fullAccess,
  };
}
