import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./use-subscription";
import { hasFullAccess, isCompAccessActive } from "@/lib/access";
import {
  newEntitlementCorrelationId,
  reportEntitlementFailure,
  traceEntitlementResolution,
} from "@/lib/entitlement-telemetry";
import { useEffect, useRef } from "react";

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
    retry: 2,
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
  // Entitlement could not be resolved (offline, API error). Callers must NOT
  // treat this as "no access" — that locks paying users out on a blip.
  const unresolved = !loading && (flags.isError || sub.isError);
  const grandfathered = !!flags.data?.grandfathered;
  const subscriptionActive = !!sub.data?.active;
  const isTrialing = sub.data?.status === "trialing";
  const compAccessUntil = flags.data?.compAccessUntil ?? null;
  const compAccess = isCompAccessActive(compAccessUntil);
  const fullAccess = hasFullAccess({ grandfathered, subscriptionActive, compAccessUntil });

  // Report once per state transition — not on every render — so Sentry shows a
  // readable timeline instead of hundreds of duplicate frames.
  const lastReported = useRef<string>("");
  useEffect(() => {
    if (loading) return;
    const outcome = unresolved ? "unresolved" : fullAccess ? "granted" : "denied";
    const key = `${outcome}:${flags.isError ? 1 : 0}${sub.isError ? 1 : 0}`;
    if (lastReported.current === key) return;
    lastReported.current = key;

    // One id per resolution transition, shared by the failure event, the
    // breadcrumb and (via the request header) the server resolver, so a single
    // lockout can be traced end-to-end from one search string.
    const correlationId = newEntitlementCorrelationId();

    if (unresolved) {
      reportEntitlementFailure(
        {
          resolver: "client:useAccess",
          source:
            flags.isError && sub.isError ? "both" : flags.isError ? "profile" : "subscription",
          correlationId,
          outcome: "unresolved-retry-offered",
          detail: {
            profileQueryStatus: flags.status,
            subscriptionQueryStatus: sub.status,
            profileFetchFailureCount: flags.failureCount,
            subscriptionFetchFailureCount: sub.failureCount,
            online: typeof navigator === "undefined" ? null : navigator.onLine,
          },
        },
        flags.error ?? sub.error,
      );
      return;
    }
    traceEntitlementResolution({
      resolver: "client:useAccess",
      outcome,
      correlationId,
      detail: {
        grandfathered,
        subscriptionActive,
        isTrialing,
        compAccess,
        subscriptionStatus: sub.data?.status ?? null,
      },
    });
  }, [
    loading,
    unresolved,
    fullAccess,
    grandfathered,
    subscriptionActive,
    isTrialing,
    compAccess,
    flags.isError,
    flags.status,
    flags.failureCount,
    flags.error,
    sub.isError,
    sub.status,
    sub.failureCount,
    sub.error,
    sub.data?.status,
  ]);

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
    /** True when the access check itself failed and should be retried. */
    unresolved,
    error: (flags.error ?? sub.error) as Error | null,
    refetch: () => {
      void flags.refetch();
      void sub.refetch();
    },
    /** True when they should be pushed to the trial paywall. */
    needsTrial: !loading && !unresolved && !fullAccess,
  };
}
