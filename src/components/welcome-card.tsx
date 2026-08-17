import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { useAccess } from "@/hooks/use-access";
import { Card } from "@/components/ui/card";

const DISMISS_KEY = "doseroutine_welcome_dismissed_v1";

/**
 * First-run welcome card on Today.
 *
 * Two states:
 *  - Free account (no trial started yet): confirm the account is live, no card
 *    taken, and offer the optional 7-day Pro trial.
 *  - Trial just started (?trial=started, or an active trial): the "welcome to
 *    your 7-day free trial" moment with what Pro unlocks.
 */
export function WelcomeCard() {
  const access = useAccess();
  const [dismissed, setDismissed] = useState(true);
  const [fromTrial, setFromTrial] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const started = params.get("trial") === "started";
      setFromTrial(started);
      const stored = localStorage.getItem(DISMISS_KEY);
      // A fresh trial start always re-opens the card, even if the free-account
      // version was dismissed earlier.
      setDismissed(started ? stored === "trial" : stored !== null);
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss(kind: "free" | "trial") {
    try {
      localStorage.setItem(DISMISS_KEY, kind);
    } catch {
      /* private mode — just hide for this session */
    }
    setDismissed(true);
  }

  if (dismissed || access.loading) return null;

  const trialing = fromTrial || access.isTrialing;

  if (trialing) {
    return (
      <Card className="relative border-primary/30 bg-primary/5 p-4">
        <DismissButton onClick={() => dismiss("trial")} />
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-foreground">
              Welcome to your 7-day Pro free trial
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything is unlocked. We hope you get real use out of it — cancel anytime before day
              7 and you won't be charged.
            </p>
            <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
              {[
                "Unlimited compounds with full interaction checks",
                "AI plan generator and 24/7 AI coach",
                "Timeline, adherence heatmap and reminders",
                "Doctor-share export and progress tracking",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    );
  }

  // Pro already paid for / comp access — nothing to pitch.
  if (access.fullAccess) return null;

  return (
    <Card className="relative border-border p-4">
      <DismissButton onClick={() => dismiss("free")} />
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
          <Check className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-foreground">
            Your free account is ready
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No card was taken. Start adding what you take and DoseRoutine will schedule it and check
            it for combinations.
          </p>
          <Link
            to="/trial"
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cta px-5 text-sm font-semibold text-cta-foreground shadow-sm transition-colors hover:bg-cta-hover"
          >
            Try Pro free for 7 days
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Optional — cancel anytime before day 7, no charge.
          </p>
        </div>
      </div>
    </Card>
  );
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Dismiss welcome message"
      className="tap-target absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
