import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Dumbbell, Filter, ListChecks, Pencil, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MEAL_SLOT_LABELS, roundTotals, totalsFor, type MealSlot } from "@/lib/meal-nutrition";
import { routineForDay, type WorkoutSessionRow } from "@/lib/routine-schedule";
import { trackCalendarDayAction } from "@/lib/calendar-usage";

type MealRow = {
  id: string;
  label: string | null;
  meal_slot: string | null;
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

type WorkoutRow = {
  id: string;
  title: string | null;
  workout_type: string;
  status: string;
  duration_min: number | null;
  scheduled_time: string | null;
};

type PlannedWorkout = ReturnType<typeof routineForDay>[number];

function value(row: MealRow, key: "calories" | "protein_g" | "carbs_g" | "fat_g") {
  return Number(row[`adj_${key}` as const] ?? row[`est_${key}` as const] ?? 0);
}

type Draft = { calories: string; protein_g: string; carbs_g: string; fat_g: string };

function draftFrom(row: MealRow): Draft {
  return {
    calories: String(Math.round(value(row, "calories"))),
    protein_g: String(Math.round(value(row, "protein_g"))),
    carbs_g: String(Math.round(value(row, "carbs_g"))),
    fat_g: String(Math.round(value(row, "fat_g"))),
  };
}

/** Blank or invalid input counts as 0; negatives clamp to 0. */
function num(input: string) {
  const parsed = Number.parseFloat(input);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 10) / 10;
}

/** Local clock minutes for a logged meal, used by the bulk time-range filter. */
function minutesOfDay(iso: string) {
  const at = new Date(iso);
  return at.getHours() * 60 + at.getMinutes();
}

/** "07:30" -> 450; blank or malformed input means "no bound". */
function parseClock(input: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const MACRO_FIELDS: Array<{ key: keyof Draft; label: string }> = [
  { key: "calories", label: "kcal" },
  { key: "protein_g", label: "Protein g" },
  { key: "carbs_g", label: "Carbs g" },
  { key: "fat_g", label: "Fat g" },
];

/**
 * Food and training for one calendar day, shown under the dose list so a
 * single day view answers "what did I take, eat, and train?".
 */
export function DayFoodWorkouts({
  day,
  tab = "all",
}: {
  day: string;
  /** Which half to render; the calendar shows one tab at a time. */
  tab?: "all" | "food" | "workouts";
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkDrafts, setBulkDrafts] = useState<Record<string, Draft>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [scalePct, setScalePct] = useState("100");
  const [slotFilter, setSlotFilter] = useState<string[]>([]);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
    void queryClient.invalidateQueries({ queryKey: ["meals"] });
    void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
  };

  const saveBulk = useMutation({
    mutationFn: async (rows: Array<{ id: string; values: Draft }>) => {
      const results = await Promise.all(
        rows.map(({ id, values }) =>
          supabase
            .from("meals")
            .update({
              adj_calories: num(values.calories),
              adj_protein_g: num(values.protein_g),
              adj_carbs_g: num(values.carbs_g),
              adj_fat_g: num(values.fat_g),
            })
            .eq("id", id),
        ),
      );
      const failed = results.find((res) => res.error);
      if (failed?.error) throw failed.error;
      return rows.length;
    },
    onSuccess: (count) => {
      setBulkMode(false);
      setBulkDrafts({});
      setSelected([]);
      setScalePct("100");
      setSlotFilter([]);
      setTimeFrom("");
      setTimeTo("");
      invalidate();
      toast.success(`Updated ${count} ${count === 1 ? "meal" : "meals"}`);
    },
    onError: (error: unknown) => {
      toast.error("Could not save those meals", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const saveMacros = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Draft }) => {
      const { error } = await supabase
        .from("meals")
        .update({
          adj_calories: num(values.calories),
          adj_protein_g: num(values.protein_g),
          adj_carbs_g: num(values.carbs_g),
          adj_fat_g: num(values.fat_g),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["day-food-workouts"] });
      void queryClient.invalidateQueries({ queryKey: ["meals"] });
      void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
      toast.success("Macros updated");
    },
    onError: (error: unknown) => {
      toast.error("Could not save those macros", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const { data, isPending } = useQuery({
    queryKey: ["day-food-workouts", day],
    queryFn: async () => {
      const start = new Date(`${day}T00:00:00`).toISOString();
      const end = new Date(`${day}T23:59:59.999`).toISOString();
      const [mealsRes, workoutsRes, routinesRes] = await Promise.all([
        supabase
          .from("meals")
          .select(
            "id,label,meal_slot,logged_at,adj_calories,adj_protein_g,adj_carbs_g,adj_fat_g,est_calories,est_protein_g,est_carbs_g,est_fat_g",
          )
          .gte("logged_at", start)
          .lte("logged_at", end)
          .order("logged_at", { ascending: true }),
        supabase
          .from("workout_logs")
          .select("id,title,workout_type,status,duration_min,scheduled_time")
          .eq("performed_on", day)
          .order("scheduled_time", { ascending: true, nullsFirst: true }),
        supabase.from("workout_sessions").select("*").not("planned_time", "is", null),
      ]);
      if (mealsRes.error) throw mealsRes.error;
      if (workoutsRes.error) throw workoutsRes.error;
      if (routinesRes.error) throw routinesRes.error;
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const planned = routineForDay(
        (routinesRes.data ?? []) as WorkoutSessionRow[],
        [],
        day,
        zone,
      ).filter((row) => row.kind === "workout");
      return {
        meals: (mealsRes.data ?? []) as MealRow[],
        workouts: (workoutsRes.data ?? []) as WorkoutRow[],
        planned,
      };
    },
  });

  const meals = data?.meals ?? [];
  const workouts = data?.workouts ?? [];
  const planned = data?.planned ?? [];

  // Bulk edit filters: narrow the day's meals by meal type and/or clock range,
  // then keep the selection in sync so "Save" only touches matching meals.
  const daySlots = Array.from(new Set(meals.map((m) => (m.meal_slot ?? "other") as string)));
  const filterMatches = (row: MealRow, slots: string[], from: string, to: string) => {
    if (slots.length > 0 && !slots.includes((row.meal_slot ?? "other") as string)) return false;
    const minutes = minutesOfDay(row.logged_at);
    const start = parseClock(from);
    const end = parseClock(to);
    if (start !== null && minutes < start) return false;
    if (end !== null && minutes > end) return false;
    return true;
  };
  const applyFilters = (slots: string[], from: string, to: string) => {
    setSlotFilter(slots);
    setTimeFrom(from);
    setTimeTo(to);
    setSelected(meals.filter((m) => filterMatches(m, slots, from, to)).map((m) => m.id));
  };
  const filtersActive = slotFilter.length > 0 || timeFrom !== "" || timeTo !== "";
  const matchCount = meals.filter((m) => filterMatches(m, slotFilter, timeFrom, timeTo)).length;

  const totals = roundTotals(
    totalsFor(
      meals.map((row) => ({
        name: row.label ?? "Meal",
        portion: "",
        calories: value(row, "calories"),
        protein_g: value(row, "protein_g"),
        carbs_g: value(row, "carbs_g"),
        fat_g: value(row, "fat_g"),
      })),
    ),
  );

  return (
    <div className={`mt-3 grid gap-3 ${tab === "all" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
      {tab !== "workouts" && (
        <section className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
              <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
              Food
            </h3>
            <div className="flex items-center gap-2">
              {meals.length > 1 ? (
                <button
                  type="button"
                  aria-pressed={bulkMode}
                  onClick={() => {
                    if (bulkMode) {
                      setBulkMode(false);
                      setBulkDrafts({});
                      setSelected([]);
                      setScalePct("100");
                      setSlotFilter([]);
                      setTimeFrom("");
                      setTimeTo("");
                      return;
                    }
                    setEditingId(null);
                    setDraft(null);
                    setBulkMode(true);
                    setBulkDrafts(Object.fromEntries(meals.map((m) => [m.id, draftFrom(m)])));
                    setSelected(meals.map((m) => m.id));
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  {bulkMode ? "Done" : "Bulk edit"}
                </button>
              ) : null}
              <Link
                to="/food"
                className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
              >
                Log a meal
              </Link>
            </div>
          </div>

          {isPending ? (
            <p className="mt-2 text-[11px] text-muted-foreground">Loading…</p>
          ) : meals.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">No meals logged for this day.</p>
          ) : (
            <>
              <ul className="mt-2 space-y-1">
                {meals.map((row) => {
                  const isEditing = editingId === row.id && draft !== null;
                  const bulk = bulkDrafts[row.id];
                  if (bulkMode && bulk) {
                    const checked = selected.includes(row.id);
                    const name =
                      row.label ?? MEAL_SLOT_LABELS[(row.meal_slot ?? "other") as MealSlot];
                    return (
                      <li
                        key={row.id}
                        className={`rounded-lg border p-2 text-xs transition-colors ${
                          checked ? "border-primary/40 bg-muted/30" : "border-border opacity-60"
                        }`}
                      >
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            aria-label={`Include ${name} in bulk edit`}
                            onCheckedChange={(next) =>
                              setSelected((prev) =>
                                next === true
                                  ? [...new Set([...prev, row.id])]
                                  : prev.filter((id) => id !== row.id),
                              )
                            }
                          />
                          <span className="min-w-0 truncate font-medium">{name}</span>
                        </label>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {MACRO_FIELDS.map((field) => (
                            <label key={field.key} className="block">
                              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                                {field.label}
                              </span>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                disabled={!checked}
                                value={bulk[field.key]}
                                onChange={(event) =>
                                  setBulkDrafts((prev) => ({
                                    ...prev,
                                    [row.id]: { ...prev[row.id], [field.key]: event.target.value },
                                  }))
                                }
                                className="mt-0.5 h-8 text-xs tabular-nums"
                              />
                            </label>
                          ))}
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={row.id} className="text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {row.label ?? MEAL_SLOT_LABELS[(row.meal_slot ?? "other") as MealSlot]}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="tabular-nums text-muted-foreground">
                            {Math.round(value(row, "calories"))} kcal
                          </span>
                          <button
                            type="button"
                            aria-label={isEditing ? "Close macro editor" : "Edit macros"}
                            aria-expanded={isEditing}
                            onClick={() => {
                              if (isEditing) {
                                setEditingId(null);
                                setDraft(null);
                                return;
                              }
                              setEditingId(row.id);
                              setDraft(draftFrom(row));
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                      {isEditing ? (
                        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {MACRO_FIELDS.map((field) => (
                              <label key={field.key} className="block">
                                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {field.label}
                                </span>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  value={draft[field.key]}
                                  onChange={(event) =>
                                    setDraft((prev) =>
                                      prev ? { ...prev, [field.key]: event.target.value } : prev,
                                    )
                                  }
                                  className="mt-0.5 h-8 text-xs tabular-nums"
                                />
                              </label>
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={saveMacros.isPending}
                              onClick={() => saveMacros.mutate({ id: row.id, values: draft })}
                            >
                              {saveMacros.isPending ? "Saving…" : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              disabled={saveMacros.isPending}
                              onClick={() => {
                                setEditingId(null);
                                setDraft(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Link
                              to="/food"
                              className="ml-auto text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                            >
                              Open full editor
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {bulkMode ? (
                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2">
                  <div className="mb-2 space-y-1.5 border-b border-border pb-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="flex items-center gap-1 font-medium text-muted-foreground">
                        <Filter className="h-3 w-3" />
                        Meal type
                      </span>
                      {daySlots.map((slot) => {
                        const on = slotFilter.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              applyFilters(
                                on ? slotFilter.filter((s) => s !== slot) : [...slotFilter, slot],
                                timeFrom,
                                timeTo,
                              )
                            }
                            className="rounded-full border border-border px-2 py-0.5 text-[11px] transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
                          >
                            {MEAL_SLOT_LABELS[slot as MealSlot] ?? slot}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="font-medium text-muted-foreground">Logged between</span>
                      <Input
                        type="time"
                        aria-label="Filter meals logged from"
                        value={timeFrom}
                        onChange={(event) => applyFilters(slotFilter, event.target.value, timeTo)}
                        className="h-8 w-[7.5rem] text-xs"
                      />
                      <span className="text-muted-foreground">and</span>
                      <Input
                        type="time"
                        aria-label="Filter meals logged until"
                        value={timeTo}
                        onChange={(event) => applyFilters(slotFilter, timeFrom, event.target.value)}
                        className="h-8 w-[7.5rem] text-xs"
                      />
                      {filtersActive ? (
                        <>
                          <span className="text-muted-foreground">
                            {matchCount} {matchCount === 1 ? "match" : "matches"}
                          </span>
                          <button
                            type="button"
                            className="font-medium text-primary underline-offset-2 hover:underline"
                            onClick={() => applyFilters([], "", "")}
                          >
                            Clear filters
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() =>
                        setSelected(selected.length === meals.length ? [] : meals.map((m) => m.id))
                      }
                    >
                      {selected.length === meals.length ? "Select none" : "Select all"}
                    </button>
                    <span className="text-muted-foreground">
                      {selected.length} of {meals.length} selected
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        aria-label="Scale selected macros by percent"
                        value={scalePct}
                        onChange={(event) => setScalePct(event.target.value)}
                        className="h-8 w-16 text-xs tabular-nums"
                      />
                      <span className="text-muted-foreground">%</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={selected.length === 0}
                        onClick={() => {
                          const factor = num(scalePct) / 100;
                          setBulkDrafts((prev) => {
                            const next = { ...prev };
                            for (const id of selected) {
                              const current = next[id];
                              if (!current) continue;
                              next[id] = {
                                calories: String(Math.round(num(current.calories) * factor)),
                                protein_g: String(Math.round(num(current.protein_g) * factor)),
                                carbs_g: String(Math.round(num(current.carbs_g) * factor)),
                                fat_g: String(Math.round(num(current.fat_g) * factor)),
                              };
                            }
                            return next;
                          });
                          setScalePct("100");
                          setSlotFilter([]);
                          setTimeFrom("");
                          setTimeTo("");
                        }}
                      >
                        Scale
                      </Button>
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={saveBulk.isPending || selected.length === 0}
                      onClick={() =>
                        saveBulk.mutate(
                          selected
                            .filter((id) => bulkDrafts[id])
                            .map((id) => ({ id, values: bulkDrafts[id] })),
                        )
                      }
                    >
                      {saveBulk.isPending ? "Saving…" : `Save ${selected.length} meals`}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      disabled={saveBulk.isPending}
                      onClick={() => {
                        setBulkMode(false);
                        setBulkDrafts({});
                        setSelected([]);
                        setScalePct("100");
                        setSlotFilter([]);
                        setTimeFrom("");
                        setTimeTo("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-2 border-t border-border pt-2 text-[11px] tabular-nums text-muted-foreground">
                {totals.calories} kcal · {totals.protein_g}g P · {totals.carbs_g}g C ·{" "}
                {totals.fat_g}g F
              </div>
            </>
          )}
        </section>
      )}

      {tab !== "food" && (
        <section className="rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
              <Dumbbell className="h-3.5 w-3.5 text-primary" />
              Training
            </h3>
            <Link
              to="/fitness"
              search={{ view: "workouts" } as never}
              className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
            >
              Log a workout
            </Link>
          </div>
          {isPending ? (
            <p className="mt-2 text-[11px] text-muted-foreground">Loading…</p>
          ) : workouts.length === 0 && planned.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Nothing scheduled or completed for this day.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {planned.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">
                    {row.label} · {row.time}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      planned
                    </span>
                    <Link
                      to="/fitness"
                      search={{ view: "routine", day, routine: row.id } as never}
                      onClick={() => trackCalendarDayAction("edit_workout_occurrence", "workouts")}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium text-primary hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3" /> Edit plan
                    </Link>
                  </span>
                </li>
              ))}
              {workouts.map((row) => (
                <li key={row.id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">
                    {row.title ?? row.workout_type}
                    {row.duration_min ? ` · ${row.duration_min} min` : ""}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Counts for the calendar day tabs. Shares the query key with
 * {@link DayFoodWorkouts}, so selecting a day fetches once.
 */
export function useDayActivityCounts(day: string) {
  const { data } = useQuery<{
    meals: MealRow[];
    workouts: WorkoutRow[];
    planned: PlannedWorkout[];
  }>({
    queryKey: ["day-food-workouts", day],
    enabled: false,
  });
  return {
    meals: data?.meals.length ?? 0,
    workouts: (data?.workouts.length ?? 0) + (data?.planned.length ?? 0),
  };
}
