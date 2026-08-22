import { useEffect, useMemo } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { reportBoundaryError } from "@/lib/boundary-report";
import { NetworkRecoveryScreen } from "@/components/network-recovery";
import { useBootStall, isOffline } from "@/lib/offline-boot";
import { SessionExpiryWatcher } from "@/components/session-expiry-watcher";

import { Loader2 } from "lucide-react";
import { resolveSessionFast } from "@/lib/auth-session";
import { AppShell } from "@/components/app-shell";
import { QueryDebugPanel } from "@/components/query-debug-panel";
import { MedicalDisclaimerGate } from "@/components/medical-disclaimer-gate";
import { NotificationPrimingCard } from "@/components/notification-priming-card";
import { NativeAlarmSync } from "@/components/native-alarm-sync";
import { useRevenueCatIdentity } from "@/hooks/use-revenuecat";
import { ProRouteGate } from "@/components/pro-route-gate";

import {
  profileGatePasses,
  profileGateQueryKey,
  readStoredProfileGate,
  writeStoredProfileGate,
  type ProfileGate,
} from "@/lib/profile-gate-cache";
import { fetchProfileGate } from "@/lib/post-auth-prime";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    // Restores silently from the persisted session on refresh (revalidating in
    // the background) and only awaits the auth SDK when nothing is stored.
    const session = await resolveSessionFast(context.queryClient);
    const user = session?.user;
    if (!user) throw redirect({ to: "/auth" });

    const gateKey = profileGateQueryKey(user.id);
    let profile: ProfileGate | null = null;

    // Fast path: the gate is already in memory (same session) or persisted from
    // a previous visit. Render immediately and revalidate in the background so
    // the first signed-in paint never waits on a profiles round trip.
    const memo = context.queryClient.getQueryData<ProfileGate | null>(gateKey);
    const stored = memo === undefined ? readStoredProfileGate(user.id) : undefined;
    const fast = memo !== undefined ? memo : stored;
    if (profileGatePasses(fast)) {
      if (memo === undefined) context.queryClient.setQueryData(gateKey, fast ?? null);
      void context.queryClient
        .fetchQuery({
          queryKey: gateKey,
          staleTime: 5 * 60_000,
          gcTime: 30 * 60_000,
          retry: false,
          queryFn: () => fetchProfileGate(user.id),
        })
        .then((fresh) => writeStoredProfileGate(user.id, (fresh as ProfileGate | null) ?? null))
        .catch(() => {});
      return { user };
    }

    try {
      profile = await context.queryClient.fetchQuery({
        queryKey: gateKey,
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        queryFn: () => fetchProfileGate(user.id),
      });
      writeStoredProfileGate(user.id, profile);
    } catch {
      // H1 — a network hiccup must not become an age/consent gate bypass.
      // If we have a persisted gate for this user and it did not pass, keep
      // sending them to onboarding. Only a genuinely unknown gate (no stored
      // record at all, e.g. brand-new device offline) renders the app.
      const cached = memo === undefined ? stored : memo;
      if (!profileGatePasses(cached ?? null)) {
        throw redirect({ to: "/onboarding" });
      }
      return { user };
    }

    if (!profileGatePasses(profile)) {
      throw redirect({ to: "/onboarding" });
    }
    return { user };
  },
  pendingMs: 300,
  pendingComponent: AuthenticatedPending,
  errorComponent: AuthenticatedError,
  component: AuthenticatedLayout,
});

function AuthenticatedError({ error, reset }: { error: Error; reset?: () => void }) {
  const kind = useMemo(
    () => reportBoundaryError(error, { boundary: "authenticated-layout" }),
    [error],
  );

  // A redirect (e.g. the native route guard) cancelled this load — keep the
  // loading state instead of flashing a crash screen.
  if (kind === "cancelled") return <CancelledLoadFallback onSettled={reset} />;

  if (kind === "offline") {
    return <NetworkRecoveryScreen onRetry={() => window.location.reload()} />;
  }

  return (
    <div
      data-testid="authenticated-layout-error"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center"
    >
      <p className="text-base font-medium text-foreground">
        We couldn&apos;t finish loading your routine.
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error?.message || "Something went wrong while signing you in."}
      </p>
      <button
        type="button"
        data-testid="route-error-retry"
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Reload
      </button>
    </div>
  );
}

/** A redirect cancelled the load: clear the boundary so the target renders. */
function CancelledLoadFallback({ onSettled }: { onSettled?: () => void }) {
  useEffect(() => {
    const id = setTimeout(() => onSettled?.(), 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <AuthenticatedPending />;
}

export function AuthenticatedPending() {
  const stalled = useBootStall();

  // Cold start with no connection: stop spinning and explain what's happening.
  if (stalled) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <NetworkRecoveryScreen
          onRetry={() => {
            if (!isOffline()) window.location.reload();
          }}
          detail={
            isOffline()
              ? "Your device isn't connected, so we couldn't finish loading your routine. Reconnect and tap Try again — nothing you logged offline is lost."
              : "Loading your routine is taking longer than expected. Tap Try again to retry."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p className="text-sm" role="status" aria-live="polite">
          Loading your routine…
        </p>
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  // Initialize RevenueCat on native platforms (no-op on web).
  useRevenueCatIdentity();

  return (
    <MedicalDisclaimerGate>
      <AppShell>
        <SessionExpiryWatcher />
        <NativeAlarmSync />
        <NotificationPrimingCard />
        <ProRouteGate>
          <Outlet />
        </ProRouteGate>
        <QueryDebugPanel />
      </AppShell>
    </MedicalDisclaimerGate>
  );
}
