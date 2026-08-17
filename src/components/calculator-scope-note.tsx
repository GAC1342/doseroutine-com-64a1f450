import { Info } from "lucide-react";

/**
 * Above-the-fold framing note for the public calculator pages.
 *
 * These tools are unit converters: they turn an amount the user already has
 * into volume / syringe units. They never suggest what amount to take.
 */
export function CalculatorScopeNote({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mx-auto flex max-w-2xl items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-left text-sm text-muted-foreground ${className}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p>
        <span className="font-medium text-foreground">This is a unit converter.</span> It converts
        an amount you already have into volume and syringe units. It does not tell you what to take,
        and it is educational only — not medical advice. Confirm every amount with your clinician
        and your product label.
      </p>
    </div>
  );
}
