import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { slotForHour, type MealItem, type MealSlot } from "@/lib/meal-nutrition";
import {
  listFavoriteMeals,
  mealFavoriteKey,
  onFavoritesChange,
  toggleFavoriteMeal,
} from "@/lib/food-favorites";

type RecentMeal = {
  id: string;
  label: string | null;
  meal_slot: string | null;
  source: string | null;
  barcode: string | null;
  ai_items: unknown;
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

function macro(row: RecentMeal, key: "calories" | "protein_g" | "carbs_g" | "fat_g") {
  return Number(row[`adj_${key}` as const] ?? row[`est_${key}` as const] ?? 0);
}

/**
 * One-tap re-log of meals the user eats often.
 *
 * Two shortcuts sit side by side: "Recent" is simply what was logged last,
 * and "Favourites" is what the user explicitly starred — so the usual
 * breakfast never falls off the list just because it wasn't eaten yesterday.
 */
export function RepeatMealCard({
  day,
  className = "",
  onLogged,
}: {
  day: string;
  className?: string;
  onLogged?: () => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"recent" | "favorites">("recent");
  const [starred, setStarred] = useState<string[]>([]);

  const refreshStars = useCallback(() => setStarred(listFavoriteMeals()), []);

  useEffect(() => {
    refreshStars();
    const unsubscribe = onFavoritesChange(refreshStars);
    return () => {
      unsubscribe();
    };
  }, [refreshStars]);

  const recent = useQuery({
    queryKey: ["repeat-meals"],
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("meals")
        .select(
          "id,label,meal_slot,source,barcode,ai_items,logged_at,adj_calories,adj_protein_g,adj_carbs_g,adj_fat_g,est_calories,est_protein_g,est_carbs_g,est_fat_g",
        )
        .gte("logged_at", since)
        .order("logged_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RecentMeal[];
    },
    staleTime: 60_000,
  });

  /** Latest row per label, newest first. */
  const uniqueByLabel = useMemo(() => {
    const byLabel = new Map<string, RecentMeal>();
    for (const row of recent.data ?? []) {
      const key = mealFavoriteKey(row.label);
      if (!byLabel.has(key)) byLabel.set(key, row);
    }
    return [...byLabel.entries()];
  }, [recent.data]);

  const starredSet = useMemo(() => new Set(starred), [starred]);

  const shown = useMemo(() => {
    const rows =
      tab === "favorites" ? uniqueByLabel.filter(([key]) => starredSet.has(key)) : uniqueByLabel;
    return rows.slice(0, 8);
  }, [tab, uniqueByLabel, starredSet]);

  const relog = useMutation({
    mutationFn: async (row: RecentMeal) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("You need to be signed in.");
      const now = new Date();
      const loggedAt = new Date(
        `${day}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`,
      );
      const items = Array.isArray(row.ai_items) ? (row.ai_items as MealItem[]) : [];
      const slot = (row.meal_slot as MealSlot | null) ?? slotForHour(now.getHours());
      const { error } = await supabase.from("meals").insert({
        user_id: uid,
        label: row.label ?? "Meal",
        meal_slot: slot,
        source: row.source ?? "manual",
        barcode: row.barcode,
        ai_items: items as unknown as never,
        est_calories: macro(row, "calories"),
        est_protein_g: macro(row, "protein_g"),
        est_carbs_g: macro(row, "carbs_g"),
        est_fat_g: macro(row, "fat_g"),
        adj_calories: macro(row, "calories"),
        adj_protein_g: macro(row, "protein_g"),
        adj_carbs_g: macro(row, "carbs_g"),
        adj_fat_g: macro(row, "fat_g"),
        was_adjusted: false,
        logged_at: loggedAt.toISOString(),
      });
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      toast.success(`Logged ${row.label ?? "meal"} again`, {
        description: `${Math.round(macro(row, "calories"))} kcal · ${Math.round(macro(row, "protein_g"))}g protein`,
      });
      void queryClient.invalidateQueries({ queryKey: ["meals"] });
      void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
      void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
      onLogged?.();
    },
    onError: (err: Error) => toast.error(err.message || "Could not log that meal"),
  });

  if (recent.isPending || uniqueByLabel.length === 0) return null;

  return (
    <section className={`rounded-2xl bg-card p-4 ${className}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <RotateCcw className="h-4 w-4 text-primary" /> Log it again
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        One tap adds the same food and numbers to this day. Star a meal to keep it in Favourites.
      </p>

      <div
        role="tablist"
        aria-label="Meal shortcuts"
        className="mt-3 inline-flex rounded-lg border border-border bg-surface-track p-1"
      >
        {(["recent", "favorites"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`tap-target rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === key
                ? "border-border bg-card font-semibold text-primary shadow-sm"
                : "border-transparent text-foreground/75 hover:border-border hover:bg-card/70 hover:text-foreground"
            }`}
          >
            {key === "recent"
              ? "Recent"
              : `Favourites${starred.length ? ` (${starred.length})` : ""}`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No favourites yet — tap the star on any recent meal to pin it here.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {shown.map(([key, row]) => {
            const isStar = starredSet.has(key);
            return (
              <li key={row.id} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={relog.isPending}
                  onClick={() => relog.mutate(row)}
                  className="tap-target min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-left hover:bg-muted"
                >
                  <span className="block truncate text-sm font-medium">{row.label ?? "Meal"}</span>
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    {Math.round(macro(row, "calories"))} kcal ·{" "}
                    {Math.round(macro(row, "protein_g"))}g protein
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={isStar}
                  aria-label={
                    isStar
                      ? `Remove ${row.label ?? "meal"} from favourites`
                      : `Add ${row.label ?? "meal"} to favourites`
                  }
                  onClick={() => toggleFavoriteMeal(row.label)}
                  className="tap-target rounded-lg p-2 text-muted-foreground hover:bg-muted"
                >
                  <Star
                    className={`h-4 w-4 ${isStar ? "fill-primary text-primary" : ""}`}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
