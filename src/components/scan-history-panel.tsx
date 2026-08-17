import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, History, Loader2 } from "lucide-react";
import { fetchScanHistory, type ScanHistoryRow } from "@/lib/scan-history";
import { ReportLabelButton } from "@/components/report-label-button";

const LEVEL_STYLE: Record<string, { chip: string; label: string }> = {
  high: {
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    label: "High confidence",
  },
  medium: {
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    label: "Medium confidence",
  },
  low: {
    chip: "border-destructive/40 bg-destructive/10 text-destructive",
    label: "Low confidence",
  },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Entry({ row }: { row: ScanHistoryRow }) {
  const style = LEVEL_STYLE[row.confidence_level ?? ""] ?? null;
  return (
    <li className="rounded-lg border border-border bg-card p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground">{formatWhen(row.created_at)}</span>
        {style && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.chip}`}>
            {style.label}
            {row.confidence_score != null ? ` · ${row.confidence_score}/100` : ""}
          </span>
        )}
      </div>

      {row.product_name && (
        <p className="mt-1 text-xs font-medium text-foreground">
          {[row.brand, row.product_name].filter(Boolean).join(" — ")}
        </p>
      )}

      <p className="mt-1 text-[11px] text-muted-foreground">
        Data source: {row.source_name || "Unknown"}
        {row.barcode ? ` · barcode ${row.barcode}` : ""}
      </p>

      {row.summary && <p className="mt-1 text-[11px] text-muted-foreground">{row.summary}</p>}

      {row.source_url && (
        <a
          href={row.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline"
        >
          View the original label
          <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <ReportLabelButton
        compact
        className="mt-1"
        context={{
          scanHistoryId: row.id,
          barcode: row.barcode,
          productName: row.product_name,
          brand: row.brand,
          sourceName: row.source_name,
          sourceUrl: row.source_url,
          confidenceScore: row.confidence_score,
        }}
      />
    </li>
  );
}

/**
 * Collapsible log of every barcode scan that has been used to set this item's
 * directions, so the user can always see where a dose came from.
 */
export function ScanHistoryPanel({ userCompoundId }: { userCompoundId: string }) {
  const [open, setOpen] = useState(false);
  const { data: rows, isLoading } = useQuery({
    queryKey: ["scan-history", userCompoundId],
    enabled: open,
    staleTime: 60_000,
    queryFn: () => fetchScanHistory(userCompoundId),
  });

  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-lg py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <History className="h-3.5 w-3.5" />
        Scan history
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="pb-1">
          {isLoading && (
            <p className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </p>
          )}
          {!isLoading && (rows?.length ?? 0) === 0 && (
            <p className="py-2 text-xs text-muted-foreground">
              No scans yet. Scan this product's barcode to fill in the label directions and we'll
              log the source and confidence score here.
            </p>
          )}
          {!!rows?.length && (
            <ul className="mt-1 space-y-2">
              {rows.map((r) => (
                <Entry key={r.id} row={r} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
