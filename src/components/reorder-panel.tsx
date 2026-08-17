import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PackageX, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type LowRow = {
  id: string;
  doses_remaining: number;
  low_threshold: number;
  user_compound_id: string;
  user_compound: {
    custom_name: string | null;
    times_of_day: string[] | null;
    frequency: string | null;
    days_of_week: number[] | null;
    compound: { name: string } | null;
  } | null;
};

type Forecast = {
  row: LowRow;
  name: string;
  dosesPerDay: number;
  daysLeft: number | null;
};

// Estimate how many doses this compound uses per day based on schedule.
function dosesPerDay(uc: LowRow["user_compound"]): number {
  if (!uc) return 1;
  const perDay = Math.max(1, (uc.times_of_day ?? [null]).length);
  const freq = (uc.frequency ?? "daily").toLowerCase();
  if (freq.includes("weekly") || freq === "once_weekly") {
    // weekly: on 1 of 7 days
    const days = Math.max(1, (uc.days_of_week ?? [1]).length);
    return (perDay * days) / 7;
  }
  if (freq.includes("weekdays")) return (perDay * 5) / 7;
  if (freq === "custom" && uc.days_of_week && uc.days_of_week.length > 0) {
    return (perDay * uc.days_of_week.length) / 7;
  }
  return perDay;
}

export function ReorderPanel() {
  const { data } = useQuery({
    queryKey: ["vial-inventory-low"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vial_inventory")
        .select(
          "id, doses_remaining, low_threshold, user_compound_id, user_compound:user_compounds(custom_name, times_of_day, frequency, days_of_week, compound:compounds(name))",
        )
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as unknown as LowRow[];

      const forecasts: Forecast[] = rows.map((r) => {
        const rate = dosesPerDay(r.user_compound);
        const daysLeft = rate > 0 ? r.doses_remaining / rate : null;
        const name = r.user_compound?.compound?.name ?? r.user_compound?.custom_name ?? "Compound";
        return { row: r, name, dosesPerDay: rate, daysLeft };
      });

      // Show if under threshold OR forecast <= 10 days
      return forecasts
        .filter(
          (f) =>
            f.row.doses_remaining <= f.row.low_threshold ||
            (f.daysLeft != null && f.daysLeft <= 10),
        )
        .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
    },
    staleTime: 60_000,
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <PackageX className="h-4 w-4 text-amber-600" />
        Reorder soon
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Based on how often you take each one.</p>
      <ul className="space-y-1.5">
        {data.slice(0, 5).map((f) => {
          const empty = f.row.doses_remaining <= 0;
          const critical = f.daysLeft != null && f.daysLeft <= 3;
          return (
            <li key={f.row.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-foreground">{f.name}</span>
              <span
                className={`shrink-0 text-xs font-medium ${
                  empty || critical ? "text-red-600" : "text-amber-600"
                }`}
              >
                {empty
                  ? "Out now"
                  : f.daysLeft != null
                    ? `~${Math.max(1, Math.round(f.daysLeft))} days left`
                    : `${Math.round(f.row.doses_remaining)} left`}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        to="/stack"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Update in Stack <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
