import { Loader2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { NetworkRecoveryScreen } from "@/components/network-recovery";
import { useEffect } from "react";
import { useBootStall, isOffline } from "@/lib/offline-boot";
import { recordBootStep } from "@/lib/boot-diagnostics";

/**
 * Default pending UI for every route.
 *
 * A spinner is the right answer for a slow load, but not for a load that will
 * never finish (airplane mode on cold start). Once the wait crosses the stall
 * threshold — short when the device reports offline — we swap in the recovery
 * screen so the user gets an explanation and a working retry.
 */
export function RoutePending({ label = "Loading…" }: { label?: string }) {
  const stalled = useBootStall();
  const router = useRouter();

  useEffect(() => {
    if (!stalled) return;
    recordBootStep(
      "route-loader",
      "stalled",
      isOffline()
        ? "This screen never finished loading while offline"
        : "This screen took too long to load",
    );
  }, [stalled]);

  if (stalled) {
    return (
      <NetworkRecoveryScreen
        onRetry={() => {
          if (isOffline()) return;
          void router.invalidate();
        }}
        detail={
          isOffline()
            ? "Your device isn't connected, so this screen couldn't load. Reconnect and tap Try again — anything you logged offline is saved."
            : "This is taking longer than expected. Your data is safe — tap Try again to reload the screen."
        }
      />
    );
  }

  return (
    <div
      data-testid="route-pending"
      className="flex min-h-[60vh] items-center justify-center"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p className="text-sm" role="status" aria-live="polite">
          {label}
        </p>
      </div>
    </div>
  );
}
