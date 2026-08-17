import { X, Crown, Zap, Check, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useProfileFlags } from "@/hooks/use-access";
import { Card } from "@/components/ui/card";

interface PaywallSheetProps {
  feature: "compound_limit" | "timeline" | "plan" | "heatmap" | "reminders" | "export";
  onClose: () => void;
}

function copyFor(
  feature: PaywallSheetProps["feature"],
  trialEnded: boolean,
): { title: string; body: string } {
  const base: Record<PaywallSheetProps["feature"], { title: string; body: string }> = {
    compound_limit: {
      title: "Unlock your full stack",
      body: "Track unlimited items — supplements, peptides, hormones and everything else you take — with educational combination notes.",
    },
    timeline: {
      title: "Unlock your Timeline",
      body: "See your 30-day adherence timeline and detailed dose history.",
    },
    plan: {
      title: "Unlock the AI Plan Generator",
      body: "Generate a personalized daily schedule tuned to your stack, goals, and timing.",
    },
    heatmap: {
      title: "Unlock the consistency heatmap",
      body: "See your 30-day consistency heatmap, injection-site rotation, and cycle planning.",
    },
    reminders: {
      title: "Unlock email & push reminders",
      body: "Get on-time dose reminders with quiet hours and per-compound controls.",
    },
    export: {
      title: "Unlock export & doctor-share",
      body: "Export your stack, schedule, and history — including shareable PDF summaries.",
    },
  };
  const c = base[feature];
  if (!trialEnded) return c;
  return {
    title: "Your free trial has ended",
    body: `${c.body} Subscribe to keep using this feature.`,
  };
}

import { TrustBadges } from "@/components/trust-badges";

export function PaywallSheet({ feature, onClose }: PaywallSheetProps) {
  const navigate = useNavigate();
  const flags = useProfileFlags();
  const hasUsedTrial = !!flags.data?.hasUsedTrial;
  const { title, body } = copyFor(feature, hasUsedTrial);
  const ctaLabel = hasUsedTrial ? "Reactivate Pro" : "Start 7-day free trial";
  const destination = hasUsedTrial ? "/upgrade" : "/trial";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-xl">
        <div className="relative bg-gradient-to-br from-primary to-[color:var(--primary-hover)] p-6 text-primary-foreground">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {hasUsedTrial ? <Crown className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
          <h2 className="mt-3 font-display text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm opacity-90">{body}</p>
        </div>

        <div className="space-y-3 p-6">
          <Card className="border-border p-4">
            <div className="flex items-center gap-2 font-display font-semibold">
              <Zap className="h-4 w-4 text-primary" /> Pro — everything unlocked
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-success" /> Unlimited compounds
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-success" /> Full interaction engine
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-success" /> Timeline, reminders & calendar export
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-success" /> AI plan generator + doctor-share PDF
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-success" /> Heatmap, injection-site rotation,
                cycles
              </li>
            </ul>
          </Card>

          <button
            onClick={() => navigate({ to: destination })}
            className="tap-target w-full rounded-xl bg-cta py-3 text-center text-sm font-semibold text-cta-foreground hover:bg-cta-hover"
          >
            {ctaLabel}
          </button>

          <TrustBadges variant="checkout" align="center" />

          <button
            onClick={onClose}
            className="tap-target w-full rounded-xl py-3 text-center text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
