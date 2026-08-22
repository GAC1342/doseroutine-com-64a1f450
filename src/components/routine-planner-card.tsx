import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Plus, Trash2, UtensilsCrossed, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  describeDays,
  formatRoutineTime,
  normalizeTime,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
} from "@/lib/routine-schedule";

type RoutineTable = "workout_sessions" | "meal_times";

type EditableRow = {
  id: string;
  label: string | null;
  planned_time: string | null;
  days_of_week: number[] | null;
  active: boolean | null;
  kind?: string | null;
  /** Workout rows: alert at the scheduled minute. */
  at_time_alert_on?: boolean | null;
  /** Workout rows: alert `pre_lead_min` minutes early instead. */
  pre_alert_on?: boolean | null;
  pre_lead_min?: number | null;
  /** Meal rows: alert at the scheduled minute. */
  alerts_on?: boolean | null;
};

/** Are reminders on for this row? Workouts and meals store it differently. */
function alertsEnabled(row: EditableRow, isWorkout: boolean): boolean {
  if (isWorkout) return row.pre_alert_on === true || row.at_time_alert_on !== false;
  return row.alerts_on !== false;
}

const WORKOUT_KINDS = ["strength", "cardio", "mobility", "sport", "other"] as const;

export const ROUTINE_QUERY_KEYS: Record<RoutineTable, string[]> = {
  workout_sessions: ["routine", "workout_sessions"],
  meal_times: ["routine", "meal_times"],
};

/** Recurring, non-dose anchors: workout routines and meal times.
 *  These never affect adherence — they only give the day a shape. */
export function RoutinePlannerCard({ table }: { table: RoutineTable }) {
  const qc = useQueryClient();
  const isWorkout = table === "workout_sessions";
  const [label, setLabel] = useState("");
  const [time, setTime] = useState(isWorkout ? "17:30" : "08:00");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [kind, setKind] = useState<string>("strength");

  const rows = useQuery({
    queryKey: ROUTINE_QUERY_KEYS[table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .not("planned_time", "is", null)
        .order("planned_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EditableRow[];
    },
    staleTime: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ROUTINE_QUERY_KEYS[table] });
    qc.invalidateQueries({ queryKey: ["today-routine"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const normalized = normalizeTime(time);
      if (!normalized) throw new Error("Pick a valid time");
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("You need to be signed in");
      const base = {
        user_id: userRes.user.id,
        label: label.trim() || (isWorkout ? "Workout" : "Meal"),
        planned_time: `${normalized}:00`,
        days_of_week: days.length > 0 ? [...days].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6],
        active: true,
      };
      const payload = isWorkout ? { ...base, kind } : base;
      const { error } = await supabase.from(table).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      invalidate();
      toast.success(isWorkout ? "Workout routine added" : "Meal time added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from(table)
        .update({ active } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  // Reminders: workouts keep the at-time / pre-alert pair, meals a single flag.
  const setAlerts = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const patch = isWorkout ? { at_time_alert_on: on, pre_alert_on: false } : { alerts_on: on };
      const { error } = await supabase
        .from(table)
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const setLead = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      const patch =
        minutes > 0
          ? { pre_alert_on: true, pre_lead_min: minutes, at_time_alert_on: false }
          : { pre_alert_on: false, pre_lead_min: 0, at_time_alert_on: true };
      const { error } = await supabase
        .from(table)
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = useMemo(() => rows.data ?? [], [rows.data]);

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        {isWorkout ? (
          <Dumbbell className="h-4 w-4 text-primary" />
        ) : (
          <UtensilsCrossed className="h-4 w-4 text-primary" />
        )}
        <h2 className="text-sm font-semibold">{isWorkout ? "Workout routine" : "Meal times"}</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {isWorkout
          ? "Recurring training slots. They show on your Today timeline as anchors — they never count toward your adherence score."
          : "Set your usual meal slots so with-food items line up on Today. Anchors only, never scored."}
      </p>

      {rows.isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : list.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nothing scheduled yet.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {list.map((row) => {
            const t = normalizeTime(row.planned_time);
            const isActive = row.active !== false;
            const alertsOn = alertsEnabled(row, isWorkout);
            const lead = row.pre_alert_on ? (row.pre_lead_min ?? 0) : 0;
            const name = row.label || (isWorkout ? "Workout" : "Meal");
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-border p-3"
              >
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t ? formatRoutineTime(t) : "—"} · {describeDays(row.days_of_week)}
                    {isWorkout && row.kind ? ` · ${row.kind}` : ""}
                  </p>
                  {isActive && alertsOn ? (
                    <p className="mt-0.5 text-xs text-primary">
                      {lead > 0 ? `Reminder ${lead} min before` : "Reminder at start time"}
                    </p>
                  ) : null}
                </div>
                <div className="ml-auto flex min-w-0 shrink items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!isActive || !t}
                    aria-label={`${alertsOn ? "Turn off" : "Turn on"} reminder for ${name}`}
                    aria-pressed={alertsOn}
                    onClick={() => setAlerts.mutate({ id: row.id, on: !alertsOn })}
                    className={`tap-target shrink-0 rounded-lg p-1.5 disabled:opacity-40 ${
                      alertsOn && isActive
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {alertsOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  {isWorkout && isActive && alertsOn ? (
                    <select
                      aria-label={`Reminder lead time for ${name}`}
                      value={String(lead)}
                      onChange={(e) =>
                        setLead.mutate({ id: row.id, minutes: Number(e.target.value) })
                      }
                      className="h-9 min-w-0 max-w-[92px] shrink rounded-lg border border-border bg-background px-2 text-xs"
                    >
                      <option value="0">At time</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="60">1 hr</option>
                    </select>
                  ) : null}
                  <Switch
                    className="shrink-0"
                    checked={isActive}
                    aria-label={`${isActive ? "Turn off" : "Turn on"} ${row.label ?? "routine"}`}
                    onCheckedChange={(next) => toggle.mutate({ id: row.id, active: next })}
                  />
                  <button
                    aria-label={`Delete ${row.label ?? "routine"}`}
                    onClick={() => remove.mutate(row.id)}
                    className="tap-target shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={isWorkout ? "Push day" : "Breakfast"}
            aria-label={isWorkout ? "Workout name" : "Meal name"}
            className="flex-1"
          />
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Time"
            className="w-32"
          />
        </div>

        {isWorkout && (
          <div className="flex flex-wrap gap-1.5">
            {WORKOUT_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${
                  kind === k
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_SHORT.map((d, i) => (
            <button
              key={`${d}-${i}`}
              onClick={() => toggleDay(i)}
              aria-pressed={days.includes(i)}
              aria-label={WEEKDAY_NAMES[i]}
              className={`h-8 w-8 rounded-full border text-[11px] font-semibold ${
                days.includes(i)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {isWorkout ? "Add workout slot" : "Add meal time"}
        </button>
      </div>
    </Card>
  );
}
