import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAccess } from "@/hooks/use-access";
import { PaywallSheet } from "@/components/paywall-sheet";
import { trackEvent } from "@/lib/analytics";

/**
 * Wraps export / doctor-share actions. Pro (or trialing) users get the real
 * control; everyone else gets a locked twin that opens the export paywall.
 *
 * While access is still loading we render the children so the UI never
 * flickers a lock for a paying user.
 */
export function ExportGate({
  children,
  label = "Export",
  source,
}: {
  children: ReactNode;
  /** Text for the locked stand-in button. */
  label?: string;
  /** Analytics label so we can see which export surface converts. */
  source: string;
}) {
  const access = useAccess();
  const [paywall, setPaywall] = useState(false);

  if (access.loading || access.fullAccess) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          trackEvent("export_paywall_open", { source });
          setPaywall(true);
        }}
        className="tap-target inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
      >
        <Lock className="h-3.5 w-3.5" /> {label}
      </button>
      {paywall && <PaywallSheet feature="export" onClose={() => setPaywall(false)} />}
    </>
  );
}
