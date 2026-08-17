import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionSafe } from "@/lib/auth-session";
import { AppShell } from "@/components/app-shell";
import { QueryDebugPanel } from "@/components/query-debug-panel";
import { MedicalDisclaimerGate } from "@/components/medical-disclaimer-gate";
import { NotificationPrimingCard } from "@/components/notification-priming-card";
import { NativeAlarmSync } from "@/components/native-alarm-sync";
import { useRevenueCatIdentity } from "@/hooks/use-revenuecat";
import { ProRouteGate } from "@/components/pro-route-gate";

type ProfileGate = { is_adult: boolean | null; consented_at: string | null };

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    // Cached so tab-to-tab navigation doesn't re-await the auth SDK every time.
    const session = await context.queryClient.fetchQuery({
      queryKey: ["auth-session"],
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: false,
      queryFn: () => getSessionSafe(),
    });
    const user = session?.user;
    if (!user) throw redirect({ to: "/auth" });

    let profile: ProfileGate | null = null;
    try {
      profile = await context.queryClient.fetchQuery({
        queryKey: ["profile-gate", user.id],
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        queryFn: async () => {
          const { data } = await supabase
            .from("profiles")
            .select("is_adult, consented_at")
            .eq("id", user.id)
            .maybeSingle();
          return (data as ProfileGate | null) ?? null;
        },
      });
    } catch {
      // Network/API hiccup: let the app render instead of blanking out.
      return { user };
    }

    if (!profile || !profile.is_adult || !profile.consented_at) {
      throw redirect({ to: "/onboarding" });
    }
    return { user };
  },
  pendingMs: 300,
  pendingComponent: AuthenticatedPending,
  errorComponent: AuthenticatedError,
  component: AuthenticatedLayout,
});

function AuthenticatedError({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-base font-medium text-foreground">
        We couldn&apos;t finish loading your routine.
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error?.message || "Something went wrong while signing you in."}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Reload
      </button>
    </div>
  );
}

function AuthenticatedPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p className="text-sm">Loading your routine…</p>
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
