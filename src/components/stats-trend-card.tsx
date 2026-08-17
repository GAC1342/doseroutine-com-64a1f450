import { cn } from "@/lib/utils";
import { cardClassName } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Minus, Plus, ChevronRight } from "lucide-react";
import { getRecentCheckins, type Checkin } from "@/lib/checkins.functions";
import { supabase } from "@/integrations/supabase/client";
import { CheckinSheet } from "@/components/checkin-sheet";
import { trackEvent } from "@/lib/analytics";

const KG_PER_LB = 0.45359237;

export const CHECKINS_KEY = ["body-checkins"] as const;

export function StatsTrendCard() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unitPref = "metric" as "metric" | "imperial" } = useQuery({
    queryKey: ["profile-unit-pref"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return "metric";
      const { data } = await supabase
        .from("profiles")
        .select("unit_pref")
        .eq("id", uid)
        .maybeSingle();
      return (data?.unit_pref === "imperial" ? "imperial" : "metric") as "metric" | "imperial";
    },
    staleTime: 5 * 60_000,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: CHECKINS_KEY,
    queryFn: () => getRecentCheckins(),
    staleTime: 60_000,
  });

  const showPrompt = useMemo(() => {
    // Nudge on Sunday, or any day if it's been > 7 days since last check-in.
    if (!checkins.length) return true;
    const last = new Date(checkins[0].checked_at + "T12:00:00");
    const daysSince = (Date.now() - last.getTime()) / 86_400_000;
    const isSunday = new Date().getDay() === 0;
    return daysSince >= 7 || (daysSince >= 6 && isSunday);
  }, [checkins]);

  const latest = checkins[0];
  const prev = checkins[1];
  const first = checkins[checkins.length - 1];

  const sparkPoints = useMemo(() => {
    const withWeight = [...checkins].filter((c) => c.weight_kg != null).reverse();
    if (withWeight.length < 2) return null;
    const values = withWeight.map((c) => Number(c.weight_kg));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 120;
    const h = 32;
    return withWeight
      .map((c, i) => {
        const x = (i / (withWeight.length - 1)) * w;
        const y = h - ((Number(c.weight_kg) - min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [checkins]);

  function fmtWeight(kg: number | null | undefined): string {
    if (kg == null) return "—";
    const v = unitPref === "imperial" ? kg / KG_PER_LB : kg;
    return `${Math.round(v * 10) / 10} ${unitPref === "imperial" ? "lb" : "kg"}`;
  }

  function delta(a: number | null | undefined, b: number | null | undefined): number | null {
    if (a == null || b == null) return null;
    const diff = a - b;
    return unitPref === "imperial" ? diff / KG_PER_LB : diff;
  }

  const deltaSincePrev = delta(latest?.weight_kg, prev?.weight_kg);
  const deltaSinceStart = delta(latest?.weight_kg, first?.weight_kg);

  if (!latest) {
    return (
      <>
        <section className={cn(cardClassName, "rounded-2xl border-dashed p-4")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-base font-semibold">Track your progress</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Log your weight, body fat, or waist to see if your stack is working.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                trackEvent("checkin_prompted", { source: "empty_card" });
                setOpen(true);
              }}
              className="tap-target shrink-0 inline-flex items-center gap-1 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Log
            </button>
          </div>
        </section>
        <CheckinSheet
          open={open}
          onClose={() => setOpen(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: CHECKINS_KEY })}
          unitPref={unitPref}
        />
      </>
    );
  }

  return (
    <>
      {showPrompt && (
        <button
          type="button"
          onClick={() => {
            trackEvent("checkin_prompted", { source: "sunday_banner" });
            setOpen(true);
          }}
          className="tap-target flex w-full items-center justify-between rounded-xl bg-primary/10 px-4 text-left text-sm font-semibold text-primary hover:bg-primary/15"
        >
          <span>Time for your weekly check-in</span>
          <Plus className="h-4 w-4" />
        </button>
      )}
      <Link
        to="/checkins"
        className={cn(cardClassName, "block rounded-2xl p-4 transition hover:bg-card/70")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Progress
            </div>
            <div className="mt-1 font-display text-2xl font-semibold">
              {fmtWeight(latest.weight_kg)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
              {deltaSincePrev != null && (
                <DeltaChip
                  label="vs last"
                  value={deltaSincePrev}
                  unit={unitPref === "imperial" ? "lb" : "kg"}
                />
              )}
              {deltaSinceStart != null && checkins.length > 2 && (
                <DeltaChip
                  label="vs start"
                  value={deltaSinceStart}
                  unit={unitPref === "imperial" ? "lb" : "kg"}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {sparkPoints && (
              <svg
                width="120"
                height="32"
                viewBox="0 0 120 32"
                className="text-primary"
                aria-hidden="true"
              >
                <polyline
                  points={sparkPoints}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                trackEvent("checkin_prompted", { source: "card_button" });
                setOpen(true);
              }}
              className="tap-target inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Log
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Last:{" "}
            {new Date(latest.checked_at + "T12:00:00").toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="inline-flex items-center gap-1">
            History <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
      <CheckinSheet
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: CHECKINS_KEY })}
        unitPref={unitPref}
      />
    </>
  );
}

function DeltaChip({ label, value, unit }: { label: string; value: number; unit: string }) {
  const rounded = Math.round(value * 10) / 10;
  const Icon = rounded === 0 ? Minus : rounded < 0 ? TrendingDown : TrendingUp;
  const tone =
    rounded === 0 ? "text-muted-foreground" : rounded < 0 ? "text-emerald-500" : "text-amber-500";
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {rounded > 0 ? "+" : ""}
      {rounded} {unit} {label}
    </span>
  );
}
