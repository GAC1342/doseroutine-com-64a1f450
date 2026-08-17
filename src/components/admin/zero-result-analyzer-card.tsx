import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SearchXIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getZeroResultReport } from "@/lib/zero-result-analyzer.functions";
import type { SearchWindow } from "@/lib/search-insights.functions";
import type { ProposalKind } from "@/lib/zero-result-clusters";

const KIND_LABEL: Record<ProposalKind, string> = {
  alias: "Add alias",
  goal_tag: "Add goal tag",
  category_filter: "Add filter",
  new_entry: "New library entry",
};

const KIND_CLASS: Record<ProposalKind, string> = {
  alias: "bg-primary/10 text-primary",
  goal_tag: "bg-secondary/15 text-secondary-foreground",
  category_filter: "bg-muted text-muted-foreground",
  new_entry: "bg-accent/15 text-accent-foreground",
};

/**
 * Admin report: dead-end searches grouped into clusters, each with concrete
 * catalog changes (alias, goal tag, filter, or a missing entry) to fix them.
 */
export function ZeroResultAnalyzerCard({ enabled }: { enabled: boolean }) {
  const [win, setWin] = useState<SearchWindow>("30d");
  const fetchReport = useServerFn(getZeroResultReport);

  const { data, isLoading, error } = useQuery({
    queryKey: ["zero-result-report", win],
    queryFn: () => fetchReport({ data: { window: win } }),
    staleTime: 60_000,
    enabled,
  });

  return (
    <Card className="mt-6 rounded-2xl border-border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <SearchXIcon className="h-4 w-4 text-primary" /> Zero-result analyzer
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Searches that returned nothing, clustered by what people meant, with suggested tags or
            filters to add to the catalog.
          </p>
        </div>
        <div
          role="tablist"
          className="inline-flex rounded-full border border-border bg-muted/40 p-0.5 text-xs"
        >
          {(["7d", "30d", "90d"] as const).map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={win === w}
              onClick={() => setWin(w)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                win === w ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {w.replace("d", " days")}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          {(error as Error).message}
        </p>
      )}
      {isLoading && <p className="mt-4 text-xs text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Dead-end searches" value={data.totalZeroSearches} />
            <Metric label="Distinct terms" value={data.distinctTerms} />
            <Metric label="Zero-result rate" value={`${Math.round(data.zeroRate * 100)}%`} />
          </div>

          {data.clusters.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              No dead-end searches in this window. Nothing to fix.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {data.clusters.map((c) => (
                <li key={c.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{c.label}</h3>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {c.searches} search{c.searches === 1 ? "" : "es"} · {c.terms.length} phrasing
                      {c.terms.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {c.terms.length > 1 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.terms.map((t) => `${t.term} (${t.searches})`).join(" · ")}
                    </p>
                  )}

                  {c.proposals.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      No confident suggestion yet.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {c.proposals.map((p) => (
                        <li
                          key={`${p.kind}-${p.value}`}
                          className="flex flex-wrap items-start gap-2"
                        >
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND_CLASS[p.kind]}`}
                          >
                            {KIND_LABEL[p.kind]}
                          </span>
                          <span className="text-sm font-medium text-foreground">{p.value}</span>
                          {p.targetName && (
                            <span className="text-xs text-muted-foreground">→ {p.targetName}</span>
                          )}
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {Math.round(p.confidence * 100)}% confidence
                          </span>
                          <p className="w-full text-xs text-muted-foreground">{p.reason}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
