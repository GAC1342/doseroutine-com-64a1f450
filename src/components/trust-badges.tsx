import { CreditCard, Lock, ShieldCheck, XCircle } from "lucide-react";
import type { ComponentType } from "react";

/**
 * Trust badges shown directly under primary call-to-action buttons.
 *
 * One shared component so the reassurance copy stays identical everywhere
 * (homepage hero, sitewide sign-up CTA, auth screen, checkout, paywall).
 *
 * Variants:
 *  - "trial"    → sign-up CTAs: free trial, no card, cancel anytime
 *  - "checkout" → payment surfaces: secure Stripe checkout, cancel anytime
 *  - "privacy"  → email capture / non-payment forms
 */
export type TrustBadgeVariant = "trial" | "checkout" | "privacy";

type Badge = { label: string; icon: ComponentType<{ className?: string }> };

const BADGES: Record<TrustBadgeVariant, Badge[]> = {
  trial: [
    { label: "Free to start — no card needed", icon: CreditCard },
    { label: "Cancel anytime", icon: XCircle },
    { label: "Privacy respected — no ads, no data selling", icon: ShieldCheck },
  ],
  checkout: [
    { label: "Secure checkout by Stripe", icon: Lock },
    { label: "Cancel anytime", icon: XCircle },
    { label: "We never see or store your card details", icon: ShieldCheck },
  ],
  privacy: [
    { label: "Privacy respected — no spam, no lists sold", icon: ShieldCheck },
    { label: "Unsubscribe anytime", icon: XCircle },
  ],
};

export function TrustBadges({
  variant = "trial",
  align = "start",
  className = "",
  compact = false,
}: {
  variant?: TrustBadgeVariant;
  align?: "start" | "center";
  className?: string;
  /** Drops to the two most important badges — for tight spots like sticky bars. */
  compact?: boolean;
}) {
  const items = compact ? BADGES[variant].slice(0, 2) : BADGES[variant];

  return (
    <ul
      data-testid={`trust-badges-${variant}`}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground ${
        align === "center" ? "justify-center" : "justify-start"
      } ${className}`}
    >
      {items.map(({ label, icon: Icon }) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
