import type { Database } from "@/integrations/supabase/types";

export type InteractionConfidence = Database["public"]["Enums"]["interaction_confidence"];

export const CONFIDENCE_LABEL: Record<InteractionConfidence, string> = {
  established: "Established",
  plausible: "Plausible",
  theoretical: "Theoretical",
  disputed: "Disputed",
};

export const CONFIDENCE_BLURB: Record<InteractionConfidence, string> = {
  established: "Documented in a source that describes this specific combination.",
  plausible: "Supported by related evidence, but not documented for this exact pair.",
  theoretical: "Inferred from mechanism. Not yet verified against a source for this pair.",
  disputed: "Sources disagree about whether this interaction is real or meaningful.",
};

const CONFIDENCE_CLASS: Record<InteractionConfidence, string> = {
  established: "border-primary/30 bg-primary/10 text-primary",
  plausible: "border-secondary/30 bg-secondary/10 text-secondary-foreground",
  theoretical: "border-muted-foreground/25 bg-muted text-muted-foreground",
  disputed: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Small, always-visible confidence chip shown next to every interaction verdict. */
export function ConfidenceBadge({
  confidence,
  className = "",
}: {
  confidence: InteractionConfidence | null | undefined;
  className?: string;
}) {
  const c: InteractionConfidence = confidence ?? "theoretical";
  return (
    <span
      title={CONFIDENCE_BLURB[c]}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${CONFIDENCE_CLASS[c]} ${className}`}
    >
      Confidence: {CONFIDENCE_LABEL[c]}
    </span>
  );
}

/**
 * Rendered when the warning text for this pair is a reused mechanism template
 * rather than something documented for the specific two compounds.
 */
export function SharedMechanismNote({
  sharedWith,
  className = "",
}: {
  sharedWith?: string | null;
  className?: string;
}) {
  if (!sharedWith) return null;
  return (
    <p className={`mt-2 text-xs leading-relaxed text-muted-foreground ${className}`}>
      Inferred from a shared mechanism, not documented for this specific pair. The same explanation
      is applied to other combinations that work the same way.
    </p>
  );
}

/**
 * Explicit "checked and nothing found" state. We say this out loud instead of
 * silently omitting the pair, and only when a real source is named.
 */
export function NoKnownInteractionLine({
  source,
  className = "",
}: {
  source?: string | null;
  className?: string;
}) {
  return (
    <p className={`text-sm leading-relaxed text-muted-foreground ${className}`}>
      {source
        ? `No documented interaction reported by ${source}.`
        : "No documented interaction found in the sources reviewed."}
    </p>
  );
}
