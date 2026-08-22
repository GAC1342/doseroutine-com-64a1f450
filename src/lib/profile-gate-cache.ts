/**
 * L6 — the profile gate cache contract, in one place.
 *
 * `/_authenticated` caches the onboarding gate (`is_adult`, `consented_at`)
 * for 5 minutes. If onboarding finishes without refreshing that cache, the
 * layout still sees the pre-onboarding profile, bounces back to /onboarding,
 * which bounces to /today — a redirect loop that renders a blank screen.
 *
 * That fix used to live as a hand-rolled block inside `handleFinish`, so any
 * edit there could silently reintroduce the loop. It now lives here, is used
 * by both sides, and is unit tested.
 */
import type { QueryClient } from "@tanstack/react-query";

export type ProfileGate = { is_adult: boolean | null; consented_at: string | null };

export function profileGateQueryKey(userId: string): [string, string] {
  return ["profile-gate", userId];
}

/** True when the layout will let this profile through to the app. */
export function profileGatePasses(gate: ProfileGate | null | undefined): boolean {
  return Boolean(gate && gate.is_adult && gate.consented_at);
}

/**
 * Mark onboarding complete for `userId`: seed the gate cache optimistically so
 * the very next navigation passes, then invalidate so the real row is refetched.
 * Never throws — a failed refresh must not block the redirect to /today.
 */
export async function markProfileGateComplete(
  queryClient: QueryClient,
  userId: string,
  consentedAt: string = new Date().toISOString(),
): Promise<boolean> {
  try {
    const key = profileGateQueryKey(userId);
    queryClient.setQueryData<ProfileGate>(key, { is_adult: true, consented_at: consentedAt });
    writeStoredProfileGate(userId, { is_adult: true, consented_at: consentedAt });
    await queryClient.invalidateQueries({ queryKey: key });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cold-start cache for the gate.
 *
 * On a hard refresh the in-memory query cache is empty, so `/_authenticated`
 * would block its first render on a profiles round trip. Persisting the gate
 * lets the layout render immediately and revalidate in the background.
 */
const GATE_STORAGE_PREFIX = "doseroutine:profile-gate:";

export function writeStoredProfileGate(userId: string, gate: ProfileGate | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!gate) window.localStorage.removeItem(GATE_STORAGE_PREFIX + userId);
    else window.localStorage.setItem(GATE_STORAGE_PREFIX + userId, JSON.stringify(gate));
  } catch {
    // Storage blocked (private mode): fall back to fetching every time.
  }
}

export function readStoredProfileGate(userId: string): ProfileGate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GATE_STORAGE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileGate | null;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStoredProfileGate(userId: string): void {
  writeStoredProfileGate(userId, null);
}
