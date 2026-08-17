import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getSearchInsights, type SearchWindow } from "@/lib/search-insights.functions";

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

/**
 * Admin report: which typed terms and filter chips lead to a suggestion being
 * opened (the "useful search" signal), plus dead-end terms worth new content.
 */
export function SearchInsightsCard({ enabled }: { enabled: boolean }) {
  const [win, setWin] = useState<SearchWindow>("30d");
  const fetchInsights = useServerFn(getSearchInsights);

  const { data, isLoading, error } = useQuery({
    queryKey: ["search-insights", win],
    queryFn: () => fetchInsights({ data: { window: win } }),
    staleTime: 60_000,
    enabled,
  });

  return (
    <Card className="mt-6 rounded-2xl border-border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <SearchIcon className="h-4 w-4 text-primary" /> Search insights
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Autocomplete usage, selected suggestions and filter chips across the library and blog.
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
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Metric label="Searches" value={data.totalSearches} />
            <Metric label="Suggestion CTR" value={pct(data.suggestCtr)} />
            <Metric
              label="Avg. picked position"
              value={
                data.avgSelectedPosition === null ? "—" : (data.avgSelectedPosition + 1).toFixed(1)
              }
            />
            <Metric label="Picked by alias" value={pct(data.aliasSelectionShare)} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Top terms</h3>
              {data.topTerms.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No searches recorded yet.</p>
              ) : (
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Term</th>
                      <th className="pb-2 text-right font-medium">Searches</th>
                      <th className="pb-2 text-right font-medium">Opened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topTerms.map((t) => (
                      <tr key={t.term} className="border-t border-border">
                        <td className="py-2 text-foreground">{t.term}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {t.searches}
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {pct(t.successRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold">Dead ends (no results)</h3>
              {data.zeroResultTerms.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No zero-result searches. Nice.</p>
              ) : (
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Term</th>
                      <th className="pb-2 text-right font-medium">Times</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.zeroResultTerms.map((t) => (
                      <tr key={t.term} className="border-t border-border">
                        <td className="py-2 text-foreground">{t.term}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {t.searches}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Most-used filter chips</h3>
            {data.topChips.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No filter usage recorded yet.</p>
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Filter</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 text-right font-medium">Uses</th>
                    <th className="pb-2 text-right font-medium">Turned on</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topChips.map((c) => (
                    <tr key={`${c.group}-${c.value}`} className="border-t border-border">
                      <td className="py-2 text-muted-foreground">{c.group}</td>
                      <td className="py-2 text-foreground">{c.value}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {c.uses}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {c.activations}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
