import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Crown, X, ArrowRight } from "lucide-react";
import { useAccess } from "@/hooks/use-access";
import { useEntitlementSettled } from "@/hooks/use-entitlement-settled";
import { trackEvent } from "@/lib/analytics";

/**
 * A non-blocking banner shown on the Today page when a user's 7-day trial
 * has ended and they have not subscribed. It explains what happened and
 * gives them a clear path to pick a plan.
 */
export function TrialExpiredBanner() {
  const navigate = useNavigate();
  const access = useAccess();
  // Hold the render until entitlement is final — otherwise this banner flashes
  // during the post-login / post-checkout entitlement refresh.
  const settled = useEntitlementSettled();
  const [dismissed, setDismissed] = useState(false);

  if (!settled) return null;
  // Only show when the user has consumed their trial but currently has no
  // active subscription and is not grandfathered.
  if (access.fullAccess) return null;
  if (!access.hasUsedTrial) return null;
  if (dismissed) return null;

  return (
    <div className="mt-4 rounded-2xl border border-cta/30 bg-cta-tint p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-cta/15 p-2">
          <Crown className="h-5 w-5 text-cta" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold">Your 7-day free trial has ended</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thanks for trying DoseRoutine Pro. To keep unlimited compounds, interaction checks,
            reminders, and all Pro features, choose a plan.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                trackEvent("trial_expired_upgrade_click", { source: "today_banner" });
                navigate({
                  to: "/upgrade",
                  search: { checkout: "1" as const, plan: "monthly" as const },
                });
              }}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-cta px-4 py-2 text-sm font-semibold text-cta-foreground hover:bg-cta-hover"
            >
              Choose a plan <ArrowRight className="h-4 w-4" />
            </button>

            <Link
              to="/help"
              className="text-sm text-primary underline underline-offset-2 hover:text-[color:var(--primary-hover)]"
            >
              Learn more about Pro features
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            trackEvent("trial_expired_banner_dismiss", {});
            setDismissed(true);
          }}
          className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
