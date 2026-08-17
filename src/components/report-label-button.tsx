import { useState } from "react";
import { toast } from "sonner";
import { Flag, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type LabelReportContext = {
  scanHistoryId?: string | null;
  barcode?: string | null;
  productName?: string | null;
  brand?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  confidenceScore?: number | null;
};

const REASONS = [
  { value: "wrong_dose", label: "Dose amount is wrong" },
  { value: "wrong_directions", label: "Directions don't match my bottle" },
  { value: "wrong_product", label: "Wrong product entirely" },
  { value: "outdated", label: "Label is out of date" },
  { value: "other", label: "Something else" },
] as const;

function trim(value: string | null | undefined, max: number): string | null {
  const s = (value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

/**
 * One-tap way to flag scanned directions that are wrong or out of date. The
 * data source, barcode, and confidence score ride along with the report so the
 * lookup can be improved without the user typing anything.
 */
export function ReportLabelButton({
  context,
  className = "",
  compact = false,
}: {
  context: LabelReportContext;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send(reason: string) {
    if (sending) return;
    setSending(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Please sign in first.");

      const { error } = await supabase.from("label_reports").insert({
        user_id: userId,
        scan_history_id: context.scanHistoryId ?? null,
        barcode: trim(context.barcode, 64),
        product_name: trim(context.productName, 200),
        brand: trim(context.brand, 120),
        source_name: trim(context.sourceName, 120),
        source_url: trim(context.sourceUrl, 500),
        confidence_score:
          typeof context.confidenceScore === "number" && Number.isFinite(context.confidenceScore)
            ? Math.round(context.confidenceScore)
            : null,
        reason,
      });
      if (error) throw error;

      setSent(true);
      setOpen(false);
      toast.success("Thanks — we've logged this label as incorrect", {
        description: "Your report includes the data source so we can check it.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send that report");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p className={`text-[11px] text-muted-foreground ${className}`}>
        Reported — thanks for helping improve the lookup.
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground ${
          compact ? "py-1 text-[11px]" : "py-1.5 text-xs"
        }`}
      >
        <Flag className="h-3.5 w-3.5" />
        Report wrong directions
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-border bg-card p-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Tap what's wrong — we'll attach the data source
              {context.sourceName ? ` (${context.sourceName})` : ""} and barcode automatically.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close report options"
              className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={sending}
                onClick={() => void send(r.value)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {sending && <Loader2 className="h-3 w-3 animate-spin" />}
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
