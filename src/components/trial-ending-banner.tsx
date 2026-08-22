import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock, X, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useEntitlementSettled } from "@/hooks/use-entitlement-settled";
import { trackEvent } from "@/lib/analytics";

const DAY = 86_400_000;
/** Start nudging this many days before the trial's last day. */
export const TRIAL_WARNING_DAYS = 3;

export function daysLeftInTrial(
  currentPeriodEnd: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!currentPeriodEnd) return null;
  const end = Date.parse(currentPeriodEnd);
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / DAY);
}

function dismissKey(endIso: string) {
  return `doseroutine:trial-ending-dismissed:${endIso}`;
}

/**
 * Shown on Today during the final days of the 7-day Pro trial, so nobody is
 * surprised by the first charge or by losing Pro features.
 */
export function TrialEndingBanner() {
  const navigate = useNavigate();
  const sub = useSubscription();
  // Same anti-flicker gate as the expired banner: never paint trial messaging
  // off an in-flight or unresolved entitlement.
  const settled = useEntitlementSettled();
  const end = sub.data?.currentPeriodEnd ?? null;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined" || !end) return false;
    try {
      return window.localStorage.getItem(dismissKey(end)) === "1";
    } catch {
      return false;
    }
  });

  if (!settled) return null;
  if (sub.data?.status !== "trialing") return null;
  if (dismissed) return null;

  const days = daysLeftInTrial(end);
  if (days === null || days > TRIAL_WARNING_DAYS || days < 0) return null;

  const when = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  const willRenew = !sub.data?.cancelAtPeriodEnd;

  return (
    <div className="mt-4 rounded-2xl border border-cta/30 bg-cta-tint p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-cta/15 p-2">
          <Clock className="h-5 w-5 text-cta" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold">Your free trial ends {when}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {willRenew
              ? "Your plan starts automatically when the trial ends — nothing to do if you want to keep Pro. Your stack and history stay either way."
              : "Your trial is set to end without a plan. Pick one to keep unlimited compounds, Timeline, reminders and export. Your stack and history stay either way."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                trackEvent("trial_ending_manage_click", {
                  days_left: days,
                  one_click: !willRenew,
                });
                // When the plan won't auto-start, skip the plan picker and
                // open Stripe checkout for the billing period they trialled.
                navigate({
                  to: "/upgrade",
                  search: willRenew
                    ? {}
                    : { checkout: "1" as const, plan: sub.data?.plan ?? "monthly" },
                });
              }}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-cta px-4 py-2 text-sm font-semibold text-cta-foreground hover:bg-cta-hover"
            >
              {willRenew ? "Manage plan" : "Keep Pro — checkout"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            trackEvent("trial_ending_banner_dismiss", { days_left: days });
            if (end) {
              try {
                window.localStorage.setItem(dismissKey(end), "1");
              } catch {
                // Non-critical: safe to ignore.
              }
            }
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
