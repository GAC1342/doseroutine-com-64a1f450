import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Clock, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_NUDGE_SETTINGS,
  computeLoggingStreak,
  dayKeyLocal,
  pickLoggingNudge,
  streakMessage,
  SNOOZE_OPTIONS,
  nudgeTimeField,
  snoozeFor,
  snoozeUntilTomorrow,
  type LoggingNudgeSettings,
} from "@/lib/logging-streak";

/**
 * Streak + one smart nudge for meal/dose logging.
 *
 * Everything is derived client-side from meals and scheduled doses the user
 * already has, so nothing new needs to be written just to show the streak.
 */
export function LoggingStreakCard({ className = "" }: { className?: string }) {
  const queryClient = useQueryClient();
  const [rescheduling, setRescheduling] = useState(false);
  const { data } = useQuery({
    queryKey: ["logging-streak"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const sinceIso = since.toISOString();

      const [mealsRes, eventsRes, settingsRes] = await Promise.all([
        supabase
          .from("meals")
          .select("logged_at,meal_slot")
          .gte("logged_at", sinceIso)
          .order("logged_at", { ascending: false }),
        supabase
          .from("schedule_events")
          .select("scheduled_at,status")
          .gte("scheduled_at", sinceIso),
        supabase
          .from("logging_reminder_settings")
          .select(
            "meals_enabled,doses_enabled,breakfast_by,lunch_by,dinner_by,quiet_after,snoozed_until",
          )
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      const days = new Set<string>();
      const todayKey = dayKeyLocal(new Date());
      const loggedSlots = new Set<string>();
      for (const row of mealsRes.data ?? []) {
        if (!row.logged_at) continue;
        const at = new Date(row.logged_at);
        const key = dayKeyLocal(at);
        days.add(key);
        if (key === todayKey && row.meal_slot) loggedSlots.add(row.meal_slot);
      }
      let overdueDoses = 0;
      const now = new Date();
      for (const row of eventsRes.data ?? []) {
        if (!row.scheduled_at) continue;
        const at = new Date(row.scheduled_at);
        if (row.status === "taken") days.add(dayKeyLocal(at));
        if (
          dayKeyLocal(at) === todayKey &&
          at.getTime() < now.getTime() &&
          (row.status === "pending" || row.status == null)
        ) {
          overdueDoses += 1;
        }
      }

      const settings = (settingsRes.data as LoggingNudgeSettings | null) ?? DEFAULT_NUDGE_SETTINGS;
      return { days: [...days], loggedSlots: [...loggedSlots], overdueDoses, settings };
    },
    staleTime: 60_000,
  });

  const streak = useMemo(() => computeLoggingStreak(data?.days ?? []), [data?.days]);
  const nudge = useMemo(() => {
    if (!data) return null;
    return pickLoggingNudge({
      now: new Date(),
      settings: data.settings,
      loggedSlots: new Set(data.loggedSlots),
      overdueDoses: data.overdueDoses,
    });
  }, [data]);

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<LoggingNudgeSettings>) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const base = data?.settings ?? DEFAULT_NUDGE_SETTINGS;
      const { error } = await supabase
        .from("logging_reminder_settings")
        .upsert({ user_id: uid, ...base, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      setRescheduling(false);
      void queryClient.invalidateQueries({ queryKey: ["logging-streak"] });
      void queryClient.invalidateQueries({ queryKey: ["logging-reminder-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update reminder"),
  });

  const snooze = (iso: string, label: string) => {
    updateSettings.mutate({ snoozed_until: iso });
    toast.success(`Reminders snoozed ${label}`);
  };

  const timeField = nudge ? nudgeTimeField(nudge) : null;
  const snoozedRaw = data?.settings?.snoozed_until ?? null;
  const snoozedDate = snoozedRaw ? new Date(snoozedRaw) : null;
  const snoozedUntil =
    snoozedDate && !Number.isNaN(snoozedDate.getTime()) && snoozedDate.getTime() > Date.now()
      ? snoozedDate
      : null;

  if (!data) return null;

  return (
    <section className={`rounded-2xl bg-card p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-primary/10 p-2 text-primary">
            <Flame className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">
              {streak.current > 0 ? `${streak.current}-day logging streak` : "No streak yet"}
            </p>
            <p className="text-xs text-muted-foreground">{streakMessage(streak)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {streak.last7} of the last 7 days logged
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to="/reminders" aria-label="Logging reminder settings">
            <Bell className="size-4" />
          </Link>
        </Button>
      </div>

      {!nudge && snoozedUntil ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Reminders snoozed until{" "}
            {snoozedUntil.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => updateSettings.mutate({ snoozed_until: null })}
          >
            Resume
          </Button>
        </div>
      ) : null}

      {nudge ? (
        <div className="mt-3 space-y-2 rounded-xl bg-muted/60 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-foreground">{nudge.text}</p>
            <Button asChild size="sm" variant="outline" className="h-7 shrink-0 text-xs">
              <Link to={nudge.kind === "dose" ? "/today" : "/food"}>
                {nudge.kind === "dose" ? "Mark doses" : "Log it"}
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  disabled={updateSettings.isPending}
                >
                  <Clock className="mr-1 size-3.5" /> Snooze
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SNOOZE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onSelect={() => snooze(snoozeFor(option.minutes), `for ${option.label}`)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => snooze(snoozeUntilTomorrow(), "until tomorrow")}>
                  Until tomorrow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {timeField ? (
              rescheduling ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="time"
                    aria-label={`New reminder time for ${nudge.slot}`}
                    defaultValue={String(data.settings[timeField] ?? "12:00").slice(0, 5)}
                    className="h-7 w-28 text-xs"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) updateSettings.mutate({ [timeField]: value, snoozed_until: null });
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setRescheduling(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setRescheduling(true)}
                >
                  Reschedule
                </Button>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
