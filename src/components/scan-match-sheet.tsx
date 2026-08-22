/**
 * "Is this the right product?" sheet.
 *
 * A barcode nearly always resolves to *something*, but pack sizes, regional
 * variants and crowdsourced duplicates mean the first hit isn't always the
 * one in the user's hand. When our confidence in the top match is anything
 * less than strong we show it with its score, the reasons behind the score,
 * and the runners-up — one tap to confirm, one tap to switch.
 */
import { Check, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  CONFIDENCE_LABELS,
  MATCH_SOURCE_LABELS,
  type ConfidenceLevel,
  type MatchConfidence,
  type MatchSource,
} from "@/lib/barcode-confidence";
import type { MealItem } from "@/lib/meal-nutrition";

/** The panel shape returned by the barcode lookup (client-safe mirror). */
export type ScanPanel = {
  found: boolean;
  name: string;
  brand: string | null;
  servingSize: string | null;
  perServing: MealItem | null;
  basis: "serving" | "100g" | null;
  sourceUrl: string;
};

export type ScanMatchCandidate = {
  panel: ScanPanel;
  source: MatchSource;
  matched: string;
  confidence: MatchConfidence;
};

const LEVEL_CLASS: Record<ConfidenceLevel, string> = {
  exact: "bg-primary/10 text-primary",
  high: "bg-primary/10 text-primary",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  low: "bg-destructive/10 text-destructive",
};

function ConfidenceBadge({ confidence }: { confidence: MatchConfidence }) {
  const Icon =
    confidence.level === "exact" || confidence.level === "high" ? ShieldCheck : TriangleAlert;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${LEVEL_CLASS[confidence.level]}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {CONFIDENCE_LABELS[confidence.level]} · {confidence.score}%
    </span>
  );
}

function kcalOf(panel: ScanPanel): string {
  const item = panel.perServing;
  if (!item) return "No panel";
  const portion = item.portion || panel.servingSize || "1 serving";
  return `${Math.round(Number(item.calories) || 0)} kcal · ${portion}`;
}

export function ScanMatchSheet({
  open,
  onOpenChange,
  scanned,
  best,
  alternates,
  onConfirm,
  onSearchInstead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanned: string;
  best: ScanMatchCandidate | null;
  alternates: ScanMatchCandidate[];
  onConfirm: (candidate: ScanMatchCandidate) => void;
  onSearchInstead: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Confirm the product</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs text-muted-foreground">
          Barcode {scanned} matched more than one entry. Pick the one on your pack — we&apos;ll
          remember it for next time.
        </p>

        {best && (
          <div className="mt-4 rounded-2xl border border-primary/40 bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{best.panel.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {best.panel.brand ? `${best.panel.brand} · ` : ""}
                  {kcalOf(best.panel)}
                </div>
              </div>
              <ConfidenceBadge confidence={best.confidence} />
            </div>
            <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              {best.confidence.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
              <li>• Source: {MATCH_SOURCE_LABELS[best.source]}</li>
            </ul>
            {best.confidence.advice && (
              <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                {best.confidence.advice}
              </p>
            )}
            <Button type="button" className="mt-3 w-full" onClick={() => onConfirm(best)}>
              <Check className="mr-2 h-4 w-4" />
              Use this one
            </Button>
          </div>
        )}

        {alternates.length > 0 && (
          <>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Other possible matches
            </h3>
            <ul className="mt-2 space-y-2">
              {alternates.map((candidate, index) => (
                <li key={`${candidate.matched}-${candidate.panel.name}-${index}`}>
                  <button
                    type="button"
                    onClick={() => onConfirm(candidate)}
                    className="flex w-full items-start gap-2 rounded-xl border border-border bg-card p-3 text-left hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{candidate.panel.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {candidate.panel.brand ? `${candidate.panel.brand} · ` : ""}
                        {kcalOf(candidate.panel)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {MATCH_SOURCE_LABELS[candidate.source]}
                      </div>
                    </div>
                    <ConfidenceBadge confidence={candidate.confidence} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <Button type="button" variant="outline" className="mt-4 w-full" onClick={onSearchInstead}>
          None of these — search by name
        </Button>
      </SheetContent>
    </Sheet>
  );
}
