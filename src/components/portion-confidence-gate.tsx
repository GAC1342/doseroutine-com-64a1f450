import { AlertTriangle, Camera, Info, ScanBarcode, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortionAssessment } from "@/lib/portion-confidence";

type Props = {
  assessment: PortionAssessment;
  busy?: boolean;
  onRetake: () => void;
  onSearchInstead?: () => void;
  onScanBarcode?: () => void;
};

/**
 * Shown above a photo-based estimate whose portions we don't trust. It states
 * the problem, why we think so, and exactly what to do next — a retake with a
 * scale object, or a more exact route entirely.
 */
export function PortionConfidenceGate({
  assessment,
  busy,
  onRetake,
  onSearchInstead,
  onScanBarcode,
}: Props) {
  if (assessment.verdict === "trusted") return null;
  const urgent = assessment.verdict === "retake";

  return (
    <div
      role="status"
      className={
        urgent
          ? "mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3"
          : "mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3"
      }
    >
      <div className="flex items-start gap-2">
        {urgent ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        ) : (
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{assessment.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{assessment.summary}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium tabular-nums">
          {assessment.score}% sure
        </span>
      </div>

      {assessment.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-8 text-xs text-muted-foreground">
          {assessment.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {assessment.steps.length > 0 && (
        <div className="mt-3 pl-6">
          <p className="text-xs font-medium">What to do next</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            {assessment.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 pl-6">
        <Button type="button" size="sm" disabled={busy} onClick={onRetake}>
          <Camera className="mr-2 h-4 w-4" />
          Retake photo
        </Button>
        {onSearchInstead && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onSearchInstead}
          >
            <Search className="mr-2 h-4 w-4" />
            Search by name
          </Button>
        )}
        {onScanBarcode && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onScanBarcode}>
            <ScanBarcode className="mr-2 h-4 w-4" />
            Scan barcode
          </Button>
        )}
      </div>
    </div>
  );
}
