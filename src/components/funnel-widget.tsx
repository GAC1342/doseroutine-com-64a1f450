import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getFunnelSummary, type FunnelWindow } from "@/lib/funnel.functions";

function pct(n: number): string {
  if (!isFinite(n) || n <= 0) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function FunnelWidget() {
  const [win, setWin] = useState<FunnelWindow>("7d");
  const fetchFn = useServerFn(getFunnelSummary);
  const { data, isLoading, error } = useQuery({
    queryKey: ["funnel-summary", win],
    queryFn: () => fetchFn({ data: { window: win } }),
    staleTime: 60_000,
  });

  return (
    <Card className="mt-6 rounded-2xl border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          Signup funnel (admin)
        </div>
        <div
          role="tablist"
          className="inline-flex rounded-full border border-border bg-muted/40 p-0.5 text-xs"
        >
          {(["7d", "30d"] as const).map((w) => {
            const active = win === w;
            return (
              <button
                key={w}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setWin(w)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {w === "7d" ? "7 days" : "30 days"}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-xs text-destructive">
          Could not load funnel: {(error as Error).message}
        </p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Visited /auth", value: data.authViews },
              { label: "Signed up", value: data.signups },
              { label: "First dose", value: data.activations },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/40 p-3 text-center">
                <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Visit → signup: <b className="text-foreground">{pct(data.signupRate)}</b>
            </span>
            <span>
              Signup → activation: <b className="text-foreground">{pct(data.activationRate)}</b>
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
