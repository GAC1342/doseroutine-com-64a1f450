/**
 * First-run permission onboarding for refill-reminder alerts.
 *
 * Explains what the alerts do and what the OS prompt will look like *before*
 * asking, then handles all three outcomes: granted (confirmation), denied
 * (step-by-step Settings instructions, because iOS won't re-prompt), and
 * "not now" (dismissed, never nags again).
 */
import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  checkNativePermission,
  isNativeNotifications,
  requestNativePermission,
} from "@/lib/local-notifications";
import {
  loadOnboarding,
  saveOnboarding,
  shouldShowOnboarding,
  type OnboardingState,
} from "@/lib/notification-onboarding";

export function RefillAlertsOnboarding({
  className,
  onGranted,
}: {
  className?: string;
  onGranted?: () => void;
}) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(loadOnboarding());
    void checkNativePermission()
      .then(setGranted)
      .catch(() => setGranted(false));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await requestNativePermission();
      setGranted(ok);
      setState(saveOnboarding(ok ? "granted" : "blocked"));
      if (ok) onGranted?.();
    } finally {
      setBusy(false);
    }
  }, [onGranted]);

  if (!state) return null;
  if (!isNativeNotifications()) return null;
  if (!shouldShowOnboarding(state, granted)) return null;

  const blocked = state.stage === "blocked";

  return (
    <section
      data-testid="refill-alerts-onboarding"
      aria-labelledby="refill-alerts-onboarding-title"
      className={`rounded-2xl border border-border bg-card p-4 ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        {blocked ? (
          <Settings className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <h3 id="refill-alerts-onboarding-title" className="text-sm font-semibold">
            {blocked ? "Alerts are turned off" : "Turn on refill alerts"}
          </h3>

          {blocked ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Your phone blocked notifications for DoseRoutine, so we can&apos;t send refill
                alerts. You can switch them back on in two taps:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Open your phone&apos;s Settings app.</li>
                <li>
                  Tap <strong>Notifications</strong> → <strong>DoseRoutine</strong>.
                </li>
                <li>
                  Turn on <strong>Allow Notifications</strong>, then come back here.
                </li>
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void enable()}>
                  I&apos;ve enabled them — check again
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setState(saveOnboarding("dismissed"))}
                >
                  Not now
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ll send one alert per medication, only when your supply is about to run out
                — no daily noise. Your phone will ask for permission next; choose{" "}
                <strong>Allow</strong> to enable them.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void enable()}>
                  {busy ? "Asking…" : "Enable refill alerts"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setState(saveOnboarding("dismissed"))}
                >
                  Not now
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {granted && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Refill alerts are on.
        </p>
      )}
    </section>
  );
}
