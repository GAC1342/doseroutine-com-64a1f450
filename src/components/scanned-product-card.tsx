import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  PackageSearch,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportLabelButton } from "@/components/report-label-button";
import type { ProductLabel } from "@/lib/product-lookup.server";
import type { FieldSource, LabelPrefill, PrefillConfidence } from "@/lib/label-directions";

const LEVEL_STYLE = {
  high: {
    ring: "border-emerald-500/40 bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    label: "High confidence",
    Icon: CheckCircle2,
  },
  medium: {
    ring: "border-amber-500/40 bg-amber-500/10",
    text: "text-amber-800 dark:text-amber-200",
    bar: "bg-amber-500",
    label: "Medium confidence",
    Icon: CircleHelp,
  },
  low: {
    ring: "border-destructive/40 bg-destructive/10",
    text: "text-destructive",
    bar: "bg-destructive",
    label: "Low confidence",
    Icon: AlertTriangle,
  },
} as const;

const SOURCE_MARK: Record<FieldSource, string> = {
  label: "✓",
  inferred: "~",
  missing: "—",
};

/**
 * Shows what the manufacturer's own label says for a scanned barcode, how much
 * of it we could actually read, and a one-tap way to carry those numbers into
 * the add-to-stack form.
 */
export function ScannedProductCard({
  label,
  prefill,
  summary,
  confidence,
  onUse,
  busy,
}: {
  label: ProductLabel;
  prefill: LabelPrefill;
  summary: string;
  confidence: PrefillConfidence;
  onUse: () => void;
  busy?: boolean;
}) {
  const style = LEVEL_STYLE[confidence.level];
  const { Icon } = style;

  return (
    <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
        <PackageSearch className="h-3.5 w-3.5" />
        Product found
      </p>

      <p className="mt-1.5 text-sm font-semibold leading-snug">{label.name}</p>
      {label.brand && <p className="text-xs text-muted-foreground">{label.brand}</p>}

      {summary && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{summary}</span>
        </p>
      )}

      {/* Confidence — shown before anything can be applied. */}
      <div
        className={`mt-3 rounded-lg border p-2.5 ${style.ring}`}
        role="group"
        aria-label={`Confidence in the scanned directions: ${style.label}, ${confidence.score} out of 100`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${style.text}`} />
          <p className={`text-xs font-semibold ${style.text}`}>
            {style.label} · {confidence.score}/100
          </p>
        </div>

        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background"
          role="progressbar"
          aria-valuenow={confidence.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Scanned directions confidence score"
        >
          <div
            className={`h-full rounded-full ${style.bar}`}
            style={{ width: `${confidence.score}%` }}
          />
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground">{confidence.headline}</p>

        <ul className="mt-2 space-y-1">
          {confidence.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 text-[11px] leading-tight">
              <span
                aria-hidden
                className={`w-3 shrink-0 text-center font-semibold ${
                  check.source === "label"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : check.source === "inferred"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                }`}
              >
                {SOURCE_MARK[check.source]}
              </span>
              <span className="text-foreground">{check.label}</span>
              <span className="text-muted-foreground">— {check.detail}</span>
            </li>
          ))}
        </ul>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Data source: <span className="font-medium text-foreground">{label.sourceName}</span>
          {label.sourceUrl && (
            <>
              {" · "}
              <a
                href={label.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 underline"
              >
                View original label <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </>
          )}
        </p>
      </div>

      {label.directions && (
        <div className="mt-2 rounded-lg border border-border bg-background p-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Manufacturer's directions
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">{label.directions}</p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button className="flex-1" onClick={onUse} disabled={busy}>
          Use these details
        </Button>
      </div>

      <ReportLabelButton
        className="mt-2"
        context={{
          barcode: label.barcode ?? null,
          productName: label.name,
          brand: label.brand,
          sourceName: label.sourceName,
          sourceUrl: label.sourceUrl,
          confidenceScore: confidence.score,
        }}
      />

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Everything stays editable — check it against your own bottle before saving.
      </p>

      {prefill.dosePerTake == null && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          We couldn't read a dose amount from this label — you'll enter it yourself.
        </p>
      )}
    </div>
  );
}
