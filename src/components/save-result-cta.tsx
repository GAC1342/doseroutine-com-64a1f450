import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bookmark } from "lucide-react";
import { useSessionState } from "@/hooks/use-session";
import { trackEvent } from "@/lib/analytics";
import { trackFunnelStep } from "@/lib/funnel";

/**
 * Contextual "save this result" prompt for the free tools.
 *
 * Deliberately only rendered AFTER the visitor has a real result in front of
 * them (checker has 2+ compounds, calculator produced numbers). The tools stay
 * fully usable signed-out — the account ask is attached to keeping the answer,
 * not to getting it.
 */
export function SaveResultCta({
  tool,
  title,
  body,
  action,
  hasResult,
}: {
  /** Analytics label, e.g. "interaction_checker" | "reconstitution_calculator". */
  tool: string;
  title: string;
  body: string;
  action: string;
  hasResult: boolean;
}) {
  const signedIn = useSessionState() === "signed-in";
  const fired = useRef(false);

  useEffect(() => {
    if (!hasResult || signedIn || fired.current) return;
    fired.current = true;
    trackFunnelStep("funnel_save_gate_shown", { tool });
    trackEvent("save_gate_shown", { tool });
  }, [hasResult, signedIn, tool]);

  if (!hasResult || signedIn) return null;

  return (
    <div
      data-testid={`save-result-cta-${tool}`}
      className="mt-4 rounded-2xl border border-cta/40 bg-cta/5 p-5"
    >
      <div className="flex items-start gap-3">
        <Bookmark className="mt-0.5 h-5 w-5 shrink-0 text-cta" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
          <Link
            to="/auth"
            onClick={() => {
              trackFunnelStep("funnel_save_gate_click", { tool });
              trackEvent("save_gate_click", { tool });
            }}
            className="tap-target mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-cta px-5 text-sm font-semibold text-cta-foreground shadow-sm transition-colors hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {action}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Free — the tool above stays free with or without an account.
          </p>
        </div>
      </div>
    </div>
  );
}
