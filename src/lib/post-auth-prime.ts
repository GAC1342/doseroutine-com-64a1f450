/**
 * Post-auth priming.
 *
 * Without this, a successful sign-in navigates to /today, the protected layout
 * then awaits the session *and* the onboarding profile row, and a brand-new
 * user gets bounced a second time to /onboarding. That is three navigations and
 * two blocking round trips for one sign-in.
 *
 * `primePostAuth` does that work once, while the sign-in button is still in its
 * loading state: it seeds the session into the query cache, resolves the
 * onboarding gate (persisting it for the next cold start) and returns the one
 * destination the user should actually land on. Callers then perform a single
 * `navigate({ replace: true })`.
 *
 * Everything is best-effort: any failure falls back to the requested
 * destination and lets the protected layout re-check as it always did.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_SESSION_QUERY_KEY } from "@/lib/auth-session";
import { refreshEntitlement } from "@/lib/entitlement-refresh";
import {
  profileGatePasses,
  profileGateQueryKey,
  writeStoredProfileGate,
  type ProfileGate,
} from "@/lib/profile-gate-cache";

export async function fetchProfileGate(userId: string): Promise<ProfileGate | null> {
  const { data } = await supabase
    .from("profiles")
    .select("is_adult, consented_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as ProfileGate | null) ?? null;
}

/**
 * Seed caches from a fresh session and return the final destination.
 * `dest` is the caller's preferred landing path (usually /today).
 */
export async function primePostAuth(
  queryClient: QueryClient,
  session: Session | null,
  dest: string,
): Promise<string> {
  if (!session?.user) return dest;

  queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, session);

  // A brand-new (or newly switched) account must never inherit the previous
  // session's entitlement answer — that is how a paying user gets pitched the
  // 7-day trial, and how a fresh signup briefly looks Pro.
  void refreshEntitlement(queryClient);

  const userId = session.user.id;
  try {
    const gate = await queryClient.fetchQuery({
      queryKey: profileGateQueryKey(userId),
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: false,
      queryFn: () => fetchProfileGate(userId),
    });
    writeStoredProfileGate(userId, gate);
    // Skip the /today -> /onboarding bounce for users who haven't consented.
    if (!profileGatePasses(gate)) return "/onboarding";
  } catch {
    // Network hiccup: let the layout decide, exactly as before.
  }

  return dest;
}
