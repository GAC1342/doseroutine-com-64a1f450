import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { roundTotals, type MealTotals } from "@/lib/meal-nutrition";
import {
  MACRO_META,
  NO_TARGETS,
  addTotals,
  dayKeyOf,
  emptyTotals,
  goalPercent,
  hasAnyTarget,
  shortWeekdayLabel,
  weekDaysFor,
  type MacroTargets,
} from "@/lib/macro-progress";

type MealRow = {
  logged_at: string;
  adj_calories: number | null;
  adj_protein_g: number | null;
  adj_carbs_g: number | null;
  adj_fat_g: number | null;
  est_calories: number | null;
  est_protein_g: number | null;
  est_carbs_g: number | null;
  est_fat_g: number | null;
};

function macro(row: MealRow, key: "calories" | "protein_g" | "carbs_g" | "fat_g") {
  return Number(row[`adj_${key}` as const] ?? row[`est_${key}` as const] ?? 0);
}

const chartConfig = {
  calories: { label: "Calories", color: "var(--primary)" },
} satisfies ChartConfig;

/**
 * Daily macro totals against the user's goals, plus a seven-day calorie chart
 * for the week that contains `day`.
 */
export function MacroProgress({ day, className = "" }: { day: string; className?: string }) {
  const week = useMemo(() => weekDaysFor(day), [day]);

  const { data, isPending, isError } = useQuery({
    queryKey: ["macro-progress", week[0]],
    queryFn: async () => {
      const start = new Date(`${week[0]}T00:00:00`).toISOString();
      const end = new Date(`${week[6]}T23:59:59.999`).toISOString();
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? "";
      const [mealsRes, profileRes] = await Promise.all([
        supabase
          .from("meals")
          .select(
            "logged_at,adj_calories,adj_protein_g,adj_carbs_g,adj_fat_g,est_calories,est_protein_g,est_carbs_g,est_fat_g",
          )
          .gte("logged_at", start)
          .lte("logged_at", end),
        supabase
          .from("profiles")
          .select("target_calories,target_protein_g,target_carbs_g,target_fat_g")
          .eq("id", uid)
          .maybeSingle(),
      ]);
      if (mealsRes.error) throw mealsRes.error;


      const byDay = new Map<string, MealTotals>(week.map((key) => [key, emptyTotals()]));
      for (const row of (mealsRes.data ?? []) as MealRow[]) {
        const key = dayKeyOf(new Date(row.logged_at));
        const current = byDay.get(key);
        if (!current) continue;
        byDay.set(
          key,
          addTotals(current, {
            calories: macro(row, "calories"),
            protein_g: macro(row, "protein_g"),
            carbs_g: macro(row, "carbs_g"),
            fat_g: macro(row, "fat_g"),
          }),
        );
      }

      const p = profileRes.data;
      const targets: MacroTargets = p
        ? {
            calories: p.target_calories === null ? null : Number(p.target_calories),
            protein_g: p.target_protein_g === null ? null : Number(p.target_protein_g),
            carbs_g: p.target_carbs_g === null ? null : Number(p.target_carbs_g),
            fat_g: p.target_fat_g === null ? null : Number(p.target_fat_g),
          }
        : NO_TARGETS;

      return { byDay: Object.fromEntries(byDay), targets };
    },
  });

  const dayTotals = roundTotals(data?.byDay?.[day] ?? emptyTotals());
  const weekTotals = roundTotals(
    week.reduce<MealTotals>(
      (acc, key) => addTotals(acc, data?.byDay?.[key] ?? emptyTotals()),
      emptyTotals(),
    ),
  );
  const targets = data?.targets ?? NO_TARGETS;
  const goalsSet = hasAnyTarget(targets);

  const series = week.map((key) => ({
    day: shortWeekdayLabel(key),
    calories: Math.round(data?.byDay?.[key]?.calories ?? 0),
    isSelected: key === day,
  }));
  const loggedDays = series.filter((point) => point.calories > 0).length;

  if (isPending) {
    return (
      <section className={`rounded-2xl bg-card p-4 ${className}`}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-16 w-full" />
        <Skeleton className="mt-3 h-32 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className={`rounded-2xl bg-card p-4 text-sm text-muted-foreground ${className}`}>
        Could not load your macros right now.
      </section>
    );
  }

  return (
    <section className={`rounded-2xl bg-card p-4 ${className}`} aria-label="Macro progress">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          Macros
        </h2>
        <Link
          to="/food"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          {loggedDays === 0 ? "Log your first meal" : "Log a meal"}
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MACRO_META.map(({ key, label, unit }) => {
          const value = dayTotals[key];
          const target = targets[key];
          const pct = goalPercent(value, target);
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
                {pct !== null && (
                  <span className="text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
                )}
              </div>
              <div className="text-base font-semibold tabular-nums">
                {value}
                <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                  {unit}
                </span>
              </div>
              {target ? (
                <>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`${label} goal progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, pct ?? 0)}
                  >
                    <div
                      className={`h-full rounded-full ${
                        (pct ?? 0) > 110 ? "bg-[color:var(--accent-warm,#B45309)]" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, pct ?? 0)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                    of {Math.round(target)}
                    {unit}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[10px] text-muted-foreground">No goal set</div>
              )}
            </div>
          );
        })}
      </div>

      {!goalsSet && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Set daily calorie and macro goals on the{" "}
          <Link to="/food" className="text-primary underline-offset-2 hover:underline">
            Food page
          </Link>{" "}
          to see progress bars here.
        </p>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide">This week</h3>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {weekTotals.calories} kcal · {weekTotals.protein_g}g P · {weekTotals.carbs_g}g C ·{" "}
            {weekTotals.fat_g}g F
            {targets.calories
              ? ` · ${goalPercent(weekTotals.calories, targets.calories * 7)}% of weekly goal`
              : ""}
          </p>
        </div>

        {loggedDays === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            No meals logged this week yet — log one and your daily calories appear here.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="mt-2 h-36 w-full">
            <BarChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} width={40} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {targets.calories ? (
                <ReferenceLine
                  y={targets.calories}
                  stroke="var(--primary)"
                  strokeDasharray="4 4"
                  label={{ value: "Goal", position: "right", fontSize: 10 }}
                />
              ) : null}
              <Bar dataKey="calories" radius={[4, 4, 0, 0]} fill="var(--color-calories)" />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </section>
  );
}
