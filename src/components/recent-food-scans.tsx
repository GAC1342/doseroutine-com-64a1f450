/**
 * Recent barcode scans, with one tap to log the same product again.
 *
 * People eat the same things: the same yoghurt, the same protein bar, the
 * same bread. Re-scanning them every day is the friction that kills food
 * logging, so the last products this user scanned sit one tap away — and
 * because the panels live in the offline cache, a re-add works with no
 * network at all.
 */
import { useEffect, useState } from "react";
import { History, Loader2, RotateCcw, X } from "lucide-react";
import {
  forgetFoodScan,
  listFoodScans,
  panelForPastScan,
  type FoodScanRecord,
} from "@/lib/food-scan-history";
import type { CachedPanel } from "@/lib/nutrition-cache";

export function RecentFoodScans({
  onReAdd,
  limit = 6,
  className,
}: {
  /** Called with the cached panel when we have one, otherwise just the code. */
  onReAdd: (scan: FoodScanRecord, panel: CachedPanel | null) => void;
  limit?: number;
  className?: string;
}) {
  const [scans, setScans] = useState<FoodScanRecord[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listFoodScans(limit).then((rows) => {
      if (!cancelled) setScans(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (scans === null) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
        Loading recent scans…
      </p>
    );
  }
  if (scans.length === 0) return null;

  return (
    <section className={className}>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" aria-hidden />
        Recent scans
      </h3>
      <ul className="mt-2 space-y-1.5">
        {scans.map((scan) => (
          <li key={scan.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={busyId === scan.id}
              onClick={async () => {
                setBusyId(scan.id);
                const panel = await panelForPastScan(scan.barcode);
                setBusyId(null);
                onReAdd(scan, panel);
              }}
              className="tap-target flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left hover:bg-muted"
            >
              {busyId === scan.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{scan.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {scan.brand ? `${scan.brand} · ` : ""}
                  {scan.calories ? `${scan.calories} kcal · ` : ""}
                  {scan.barcode}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-label={`Remove ${scan.name} from recent scans`}
              onClick={async () => {
                await forgetFoodScan(scan.id);
                setScans((prev) => (prev ?? []).filter((row) => row.id !== scan.id));
              }}
              className="tap-target rounded-lg p-2 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
