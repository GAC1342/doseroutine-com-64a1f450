import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Flame, Loader2, X } from "lucide-react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallSheet } from "@/components/paywall-sheet";
import { DayFoodWorkouts, useDayActivityCounts } from "@/components/day-food-workouts";
import {
  chipClass,
  segmentedTrackClass,
  segmentedTabClass,
  SegmentedCount,
} from "@/components/ui/segmented-tabs";
import { MacroProgress } from "@/components/macro-progress";
import { computeAdherence, fetchAdherenceEvents, type AdherenceStats } from "@/lib/adherence";
import { setTabViewState, getTabViewState } from "@/lib/tab-view-state";
import { trackCalendarTab, trackCalendarDayAction } from "@/lib/calendar-usage";
import { getEffectiveDoseStatus } from "@/lib/dose-status";
import {
  addMonthsToMonthKey,
  daysInMonthKey,
  firstWeekdayOfMonthKey,
  formatDayKeyLabel,
  formatMonthLabel,
  monthKeyInZone,
  monthRangeInZone,
  addDaysToDayKey,
  weekStartDayKey,
  weekDayKeys,
  dayRangeInZone,
  formatWeekLabel,
  parseMonthKey,
  relativeDayLabel,
  todayKeyInZone,
} from "@/lib/local-calendar";
import { Card } from "@/components/ui/card";
import { historyWindow } from "@/lib/today-window";
import { LoadingStatus } from "@/components/skeletons";
import { routeErrorComponent } from "@/components/route-error-panel";

type DayTab = "stack" | "workouts" | "food";

const DAY_TABS: Array<{ id: DayTab; label: string }> = [
  { id: "stack", label: "Stack" },
  { id: "workouts", label: "Training" },
  { id: "food", label: "Meals" },
];

type TimelineView = {
  monthKey: string;
  calFilter: "all" | "taken" | "missed" | "skipped";
  calMode?: "month" | "week";
  weekStart?: string;
  dayTab?: DayTab;
};

export const Route = createFileRoute("/_authenticated/timeline")({
  errorComponent: routeErrorComponent("timeline"),
  head: () => ({
    meta: [
      { title: "Timeline — DoseRoutine" },
      { name: "description", content: "Every taken, skipped, and missed dose — grouped by day." },
    ],
  }),
  component: TimelinePage,
});

type Compound = Database["public"]["Tables"]["compounds"]["Row"];
type UC = Database["public"]["Tables"]["user_compounds"]["Row"];
type Status = Database["public"]["Enums"]["event_status"];
type Event = Database["public"]["Tables"]["schedule_events"]["Row"] & {
  user_compound: (UC & { compound: Compound | null }) | null;
};

const STATUS_LABELS: Record<Status, string> = {
  pending: "Pending",
  taken: "Taken",
  skipped: "Skipped",
  missed: "Missed",
};

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-muted text-muted-foreground",
  taken: "bg-[color:var(--severity-synergy-bg)] text-[color:var(--severity-synergy)]",
  skipped: "bg-[color:var(--severity-note-bg)] text-[color:var(--severity-note)]",
  missed: "bg-[color:var(--severity-avoid-bg)] text-[color:var(--severity-avoid)]",
};

function TimelinePage() {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats7, setStats7] = useState<AdherenceStats | null>(null);
  const [stats30, setStats30] = useState<AdherenceStats | null>(null);
  const [zone, setZone] = useState("UTC");
  const [paywall, setPaywall] = useState(false);
  const { data: subscription, isLoading: subLoading } = useSubscription();

  const load = useCallback(async () => {
    setLoading(true);
    // Resolve the user's timezone FIRST so the history window, the event query
    // and the stats all use the same day boundaries as the Today page.
    const { data: userRes } = await supabase.auth.getUser();
    let zone = "UTC";
    if (userRes.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userRes.user.id)
        .maybeSingle();
      zone = prof?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }
    const all30 = await fetchAdherenceEvents(30, zone);
    // Same shared window helper Today uses — identical start/end instants.
    const win = historyWindow(new Date(), zone, 30);
    const { data: ev } = await supabase
      .from("schedule_events")
      .select("*, user_compound:user_compounds(*, compound:compounds(*))")
      .gte("scheduled_at", win.start.toISOString())
      .lte("scheduled_at", win.end.toISOString())
      .order("scheduled_at", { ascending: false })
      .limit(500);

    const now = new Date();
    setZone(zone);
    setEvents(
      ((ev as Event[] | null) ?? []).map((event) => ({
        ...event,
        status: getEffectiveDoseStatus(event.status, event.scheduled_at, now),
      })),
    );
    setStats7(computeAdherence(all30, 7, zone));
    setStats30(computeAdherence(all30, 30, zone));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (subscription?.isPaid) {
      void load();
    }
  }, [load, subscription?.isPaid]);

  const syncEventPatch = useCallback(
    (id: string, patch: Partial<Event>) => {
      setEvents((prev) =>
        prev.map((event) => {
          if (event.id !== id) return event;
          const next = { ...event, ...patch };
          return {
            ...next,
            status: getEffectiveDoseStatus(next.status, next.scheduled_at),
          };
        }),
      );
      qc.setQueriesData<DayEvent[]>({ queryKey: ["timeline-month"] }, (prev) =>
        (prev ?? []).map((event) => {
          if (event.id !== id) return event;
          const next = { ...event, ...patch };
          return {
            ...next,
            status: getEffectiveDoseStatus(next.status, next.scheduled_at),
          };
        }),
      );
    },
    [qc],
  );

  useEffect(() => {
    if (subLoading) return;
    if (subscription?.isPaid) {
      // If the user upgraded mid-session, clear any stale paywall state
      // so we don't flash the paywall on their next visit.
      if (paywall) setPaywall(false);
    } else {
      setPaywall(true);
    }
  }, [subLoading, subscription?.isPaid, paywall]);

  const isPro = subscription?.isPro ?? false;

  if (subLoading || (!subscription?.isPaid && !paywall)) {
    return (
      <div className="mx-auto flex max-w-3xl justify-center px-4 pt-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (paywall) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 md:pt-10 lg:max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
        </header>
        <PaywallSheet feature="timeline" onClose={() => setPaywall(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 md:pt-10 lg:max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Tap any day on the calendar to see what you took.
        </p>
      </header>

      {stats7 && stats30 && <AdherenceStat s7={stats7} s30={stats30} />}

      {stats30 && stats30.totalScheduled > 0 && (
        <Card className="mb-6 flex flex-col gap-3 rounded-2xl border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <div className="font-semibold text-foreground">Save or share your report</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Turn your adherence and stack into a one-page PDF.
            </div>
          </div>
          <Link
            to="/doctor-report"
            className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Generate report
          </Link>
        </Card>
      )}

      {!loading && <MissedDosesPanel events={events} zone={zone} onUpdate={syncEventPatch} />}

      {!isPro && (
        <div className="mb-6 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Pro:</span> unlock the 30-day adherence
          heatmap.
        </div>
      )}

      {isPro && !loading && <MonthCalendar onStatusChanged={syncEventPatch} />}
    </div>
  );
}

function AdherenceStat({ s7, s30 }: { s7: AdherenceStats; s30: AdherenceStats }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <StatCard
        label="On-time (7d)"
        value={`${Math.round(s7.onTimeRate * 100)}%`}
        sub={
          s7.totalScheduled === 0
            ? "No doses logged yet — mark today's to start tracking."
            : `${s7.onTimeCount} of ${s7.totalScheduled} logged doses on time`
        }
      />
      <StatCard
        label="Adherence (30d)"
        value={`${Math.round(s30.adherenceRate * 100)}%`}
        sub={
          s30.totalScheduled === 0
            ? "Nothing logged in the last 30 days."
            : `${s30.takenCount} taken · ${s30.missedCount} missed · ${s30.skippedCount} skipped`
        }
      />
      <StatCard
        label="Current streak"
        value={`${s7.streak}d`}
        sub={s7.encouragement}
        icon={<Flame className="h-4 w-4 text-[color:var(--severity-caution,#d97706)]" />}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

type DayAgg = { total: number; taken: number; missed: number; skipped: number; pending: number };
type DayEvent = {
  id: string;
  scheduled_at: string;
  status: Status | null;
  taken_at: string | null;
  name: string;
  dose: string;
  note: string | null;
};

function MonthCalendar({
  onStatusChanged,
}: {
  onStatusChanged: (id: string, patch: Partial<Event>) => void;
}) {
  const qc = useQueryClient();
  const [monthKey, setMonthKey] = useState(() => {
    // Restore the month the user was last viewing on this tab so returning
    // via nav / swipe puts them back exactly where they left off.
    const persisted = getTabViewState<TimelineView | null>("/timeline", null);
    if (persisted?.monthKey && parseMonthKey(persisted.monthKey)) return persisted.monthKey;
    const browserZone =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
    return monthKeyInZone(new Date(), browserZone || "UTC");
  });
  const [calMode, setCalMode] = useState<"month" | "week">(
    () => getTabViewState<TimelineView | null>("/timeline", null)?.calMode ?? "month",
  );
  const [weekStart, setWeekStart] = useState(() => {
    const persisted = getTabViewState<TimelineView | null>("/timeline", null);
    if (persisted?.weekStart && /^\d{4}-\d{2}-\d{2}$/.test(persisted.weekStart))
      return persisted.weekStart;
    const browserZone =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
    return weekStartDayKey(todayKeyInZone(browserZone || "UTC"));
  });
  const [selected, setSelected] = useState<string | null>(null);
  // Which day tab was last used is a preference, not a one-off: someone who
  // lives in Meals shouldn't land on Stack every time they open a day.
  const [dayTab, setDayTab] = useState<DayTab>(
    () => getTabViewState<TimelineView | null>("/timeline", null)?.dayTab ?? "stack",
  );
  const [calFilter, setCalFilter] = useState<TimelineView["calFilter"]>(
    () => getTabViewState<TimelineView | null>("/timeline", null)?.calFilter ?? "all",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Group calendar days by the user's profile timezone so late-night doses
  // don't spill into the next UTC day.
  const { data: zone = "UTC", isSuccess: zoneReady } = useQuery({
    queryKey: ["profile-tz-timeline"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return "UTC";
      const { data } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userRes.user.id)
        .maybeSingle();
      return data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    },
    staleTime: 5 * 60_000,
  });

  const syncedInitialZoneMonth = useRef(false);
  useEffect(() => {
    if (!zoneReady || syncedInitialZoneMonth.current) return;
    syncedInitialZoneMonth.current = true;
    const persisted = getTabViewState<TimelineView | null>("/timeline", null);
    if (!persisted?.monthKey || !parseMonthKey(persisted.monthKey)) {
      setMonthKey(monthKeyInZone(new Date(), zone));
    }
  }, [zone, zoneReady]);

  const todayKey = todayKeyInZone(zone);
  const monthRange = useMemo(
    () =>
      calMode === "week" ? dayRangeInZone(weekStart, 7, zone) : monthRangeInZone(monthKey, zone),
    [calMode, weekStart, monthKey, zone],
  );
  const periodLabel =
    calMode === "week" ? formatWeekLabel(weekStart, zone) : formatMonthLabel(monthKey, zone);
  const isCurrentPeriod =
    calMode === "week"
      ? weekStart === weekStartDayKey(todayKey)
      : monthKey === monthKeyInZone(new Date(), zone);
  const timelineMonthQueryKey = useMemo(
    () => ["timeline-month", calMode, calMode === "week" ? weekStart : monthKey, zone] as const,
    [calMode, weekStart, monthKey, zone],
  );

  // Persist the view whenever month or filter changes. The prefetcher reads
  // this on next tab entry to warm the exact variant.
  useEffect(() => {
    setTabViewState<TimelineView>("/timeline", {
      monthKey,
      calFilter,
      calMode,
      weekStart,
      dayTab,
    });
  }, [monthKey, calFilter, calMode, weekStart, dayTab]);

  const { data: rawEvents = [], isLoading: loading } = useQuery<DayEvent[]>({
    queryKey: timelineMonthQueryKey,
    queryFn: async () => {
      if (!monthRange) return [];
      const { data } = await supabase
        .from("schedule_events")
        .select(
          "id, scheduled_at, status, taken_at, note, user_compound:user_compounds(custom_name, dose_amount, dose_unit, compound:compounds(name))",
        )
        .gte("scheduled_at", monthRange.start.toISOString())
        .lt("scheduled_at", monthRange.end.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(2000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
      return ((data ?? []) as any[]).map((ev) => {
        const uc = ev.user_compound;
        const name = uc?.custom_name || uc?.compound?.name || "Compound";
        const dose = uc?.dose_amount
          ? `${uc.dose_amount}${uc.dose_unit ? " " + uc.dose_unit : ""}`
          : "";
        return {
          id: ev.id,
          scheduled_at: ev.scheduled_at,
          status: getEffectiveDoseStatus(ev.status, ev.scheduled_at),
          taken_at: ev.taken_at ?? null,
          name,
          dose,
          note: ev.note ?? null,
        } as DayEvent;
      });
    },
    // Prior month data doesn't change often — cache aggressively so month
    // pagination is instant, and rely on invalidation after inline edits.
    enabled: monthRange != null,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    gcTime: 5 * 60_000,
  });

  const { days, dayEvents } = useMemo(() => {
    const agg = new Map<string, DayAgg>();
    const perDay = new Map<string, DayEvent[]>();
    for (const ev of rawEvents) {
      const s = getEffectiveDoseStatus(ev.status, ev.scheduled_at);
      if (calFilter !== "all" && s !== calFilter) continue;
      const key = formatInTimeZone(ev.scheduled_at, zone, "yyyy-MM-dd");
      const a = agg.get(key) ?? { total: 0, taken: 0, missed: 0, skipped: 0, pending: 0 };
      a.total++;
      if (s === "taken") a.taken++;
      else if (s === "missed") a.missed++;
      else if (s === "skipped") a.skipped++;
      else a.pending++;
      agg.set(key, a);
      const list = perDay.get(key) ?? [];
      list.push(ev);
      perDay.set(key, list);
    }
    return { days: agg, dayEvents: perDay };
  }, [rawEvents, calFilter, zone]);

  const cells = useMemo(() => {
    if (calMode === "week") {
      return weekDayKeys(weekStart).map((key) => ({
        key,
        day: Number(key.slice(8, 10)),
        inMonth: true,
      }));
    }
    const parts = parseMonthKey(monthKey);
    if (!parts) return [];
    const startOffset = firstWeekdayOfMonthKey(monthKey);
    const totalDays = daysInMonthKey(monthKey);
    const arr: Array<{ key: string; day: number; inMonth: boolean } | null> = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= totalDays; d++) {
      // Format the calendar-cell key directly from year/month/day so it
      // always matches the event day-key (also formatted in user zone).
      arr.push({ key: `${monthKey}-${String(d).padStart(2, "0")}`, day: d, inMonth: true });
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [monthKey, calMode, weekStart]);

  function cellBg(a: DayAgg | undefined, isFuture: boolean): string {
    if (!a || a.total === 0) return "transparent";
    if (isFuture) return "transparent";
    if (a.missed > 0 && a.taken === 0) return "rgba(239,68,68,0.55)";
    if (a.missed > 0) return "rgba(245,158,11,0.45)";
    if (a.taken === a.total) return "rgba(16,185,129,0.85)";
    if (a.taken > 0) return "rgba(16,185,129,0.4)";
    return "transparent";
  }

  const dayCounts = useDayActivityCounts(selected ?? "");
  const selectedAgg = selected ? days.get(selected) : null;
  const selectedList = selected ? (dayEvents.get(selected) ?? []) : [];

  function startEdit(e: DayEvent) {
    setEditingId(e.id);
    setEditError(null);
    trackCalendarDayAction("edit_open", dayTab);
    const d = new Date(e.scheduled_at);
    const hh = formatInTimeZone(d, zone, "HH");
    const mm = formatInTimeZone(d, zone, "mm");
    setEditTime(`${hh}:${mm}`);
    setEditLabel(e.note ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
    trackCalendarDayAction("edit_cancel", dayTab);
  }

  async function saveEdit(e: DayEvent) {
    setSaving(true);
    setEditError(null);
    try {
      const match = /^(\d{2}):(\d{2})$/.exec(editTime.trim());
      if (!match) throw new Error("Time must be in HH:MM format.");
      const hours = Number(match[1]);
      const mins = Number(match[2]);
      if (hours > 23 || mins > 59) throw new Error("Invalid time.");
      const trimmedLabel = editLabel.trim().slice(0, 200);
      // Interpret the typed HH:MM in the user's profile timezone, not the
      // browser's local time — otherwise a device on UTC editing a NY-tz
      // profile silently offsets the dose by the tz difference.
      const dayInZone = formatInTimeZone(e.scheduled_at, zone, "yyyy-MM-dd");
      const hh = String(hours).padStart(2, "0");
      const mm = String(mins).padStart(2, "0");
      const next = fromZonedTime(`${dayInZone}T${hh}:${mm}:00`, zone);
      if (next.getTime() <= Date.now()) throw new Error("Pick a future time.");
      const { error } = await supabase
        .from("schedule_events")
        .update({
          scheduled_at: next.toISOString(),
          note: trimmedLabel ? trimmedLabel : null,
        })
        .eq("id", e.id);
      if (error) {
        if (error.code === "23505")
          throw new Error("Another dose is already scheduled at that time.");
        throw error;
      }
      setEditingId(null);
      trackCalendarDayAction("edit_save", dayTab);
      qc.invalidateQueries({ queryKey: ["timeline-month"] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    } catch (err: any) {
      setEditError(err?.message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  async function setEventStatus(e: DayEvent, next: Status) {
    const target = e.status === next ? null : next;
    const takenAt = target === "taken" ? new Date().toISOString() : null;
    const status = getEffectiveDoseStatus(target, e.scheduled_at);
    setStatusBusyId(e.id);
    // Optimistic update on every visible Timeline surface: the grouped list,
    // the selected-day controls, and the month cell counts all use this same
    // record now instead of waiting for a separate refetch/cache timer.
    onStatusChanged(e.id, { status, taken_at: takenAt } as Partial<Event>);
    qc.setQueryData<DayEvent[]>(timelineMonthQueryKey, (prev) =>
      (prev ?? []).map((r) => (r.id === e.id ? { ...r, status } : r)),
    );
    const { error } = await supabase
      .from("schedule_events")
      .update({ status: target, taken_at: takenAt })
      .eq("id", e.id);
    if (error) {
      onStatusChanged(e.id, { status: e.status, taken_at: e.taken_at } as Partial<Event>);
      qc.setQueryData<DayEvent[]>(timelineMonthQueryKey, (prev) =>
        (prev ?? []).map((r) => (r.id === e.id ? { ...r, status: e.status } : r)),
      );
    } else {
      void qc.invalidateQueries({ queryKey: ["timeline-month"] });
    }
    setStatusBusyId(null);
  }

  return (
    <Card className="mt-6 rounded-2xl border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">History calendar</h2>
          <p className="text-xs text-muted-foreground">
            Tap any day to see the doses you took, missed, or skipped.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Pro</span>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            calMode === "week"
              ? setWeekStart((prev) => addDaysToDayKey(prev, -7))
              : setMonthKey((prev) => addMonthsToMonthKey(prev, -1))
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-muted"
          aria-label={calMode === "week" ? "Previous week" : "Previous month"}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold">{periodLabel}</div>
        <button
          type="button"
          onClick={() =>
            calMode === "week"
              ? setWeekStart((prev) => addDaysToDayKey(prev, 7))
              : setMonthKey((prev) => addMonthsToMonthKey(prev, 1))
          }
          disabled={isCurrentPeriod}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-40"
          aria-label={calMode === "week" ? "Next week" : "Next month"}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div role="tablist" aria-label="Calendar range" className="mb-3 flex gap-1.5">
        {(
          [
            { k: "week", label: "Week" },
            { k: "month", label: "Month" },
          ] as const
        ).map((opt) => {
          const active = calMode === opt.k;
          return (
            <button
              key={opt.k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setCalMode(opt.k);
                if (opt.k === "week") {
                  setWeekStart(weekStartDayKey(selected ?? todayKey));
                } else if (selected) {
                  setMonthKey(selected.slice(0, 7));
                }
              }}
              className={chipClass(active)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div role="tablist" aria-label="Filter doses" className="mb-3 flex flex-wrap gap-1.5">
        {(
          [
            { k: "all", label: "All" },
            { k: "taken", label: "Taken" },
            { k: "missed", label: "Missed" },
            { k: "skipped", label: "Skipped" },
          ] as const
        ).map((opt) => {
          const active = calFilter === opt.k;
          return (
            <button
              key={opt.k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCalFilter(opt.k)}
              className={chipClass(active)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1" aria-busy="true">
          <LoadingStatus label="Loading calendar…" />
          {Array.from({ length: calMode === "week" ? 7 : 35 }).map((_, i) => (
            <Skeleton key={i} aria-hidden="true" className="aspect-square rounded-md" />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-7 gap-1"
          // Offscreen weeks skip layout and paint; the reserved height keeps
          // scrolling stable.
          style={{ contentVisibility: "auto", containIntrinsicSize: "auto 240px" }}
        >
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="aspect-square" />;
            const a = days.get(c.key);
            const isFuture = c.key > todayKey;
            const isToday = c.key === todayKey;
            const isSelected = selected === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setSelected(isSelected ? null : c.key);
                  setEditingId(null);
                }}
                disabled={isFuture && !a}
                className={`relative aspect-square rounded-md border text-xs transition ${
                  isSelected
                    ? "border-primary ring-2 ring-primary"
                    : isToday
                      ? "border-accent-warm ring-2 ring-accent-warm/60"
                      : "border-border/70"
                } ${isFuture ? "opacity-40" : "hover:border-primary/60"}`}
                style={{ backgroundColor: cellBg(a, isFuture) }}
                aria-label={`${c.key}${a ? `, ${a.taken} taken, ${a.missed} missed of ${a.total}` : ", no doses"}`}
              >
                <span
                  className={`absolute left-1 top-0.5 text-[10px] tabular-nums ${a && a.taken === a.total && a.total > 0 ? "text-white" : "text-foreground"} ${isToday ? "font-bold" : ""}`}
                >
                  {c.day}
                </span>
                {a && a.total > 0 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] font-semibold tabular-nums ${a.taken === a.total ? "text-white" : "text-foreground/80"}`}
                  >
                    {a.taken}/{a.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[3px] border border-border/70" />
          None
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: "rgba(16,185,129,0.4)" }}
          />
          Partial
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: "rgba(16,185,129,0.85)" }}
          />
          All taken
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: "rgba(245,158,11,0.45)" }}
          />
          Mixed
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: "rgba(239,68,68,0.55)" }}
          />
          Missed
        </span>
      </div>

      {selected && (
        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">{formatDayKeyLabel(selected, zone)}</div>
            {selectedAgg && (
              <div className="text-[11px] text-muted-foreground">
                {selectedAgg.taken} taken · {selectedAgg.missed} missed · {selectedAgg.skipped}{" "}
                skipped
              </div>
            )}
          </div>
          <div role="tablist" aria-label="Day details" className={`mb-3 ${segmentedTrackClass}`}>
            {DAY_TABS.map((t) => {
              const count =
                t.id === "stack"
                  ? selectedList.length
                  : t.id === "workouts"
                    ? dayCounts.workouts
                    : dayCounts.meals;
              const active = dayTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setDayTab(t.id);
                    trackCalendarTab(t.id);
                  }}
                  className={segmentedTabClass(active)}
                >
                  {t.label}
                  {count > 0 && <SegmentedCount active={active}>{count}</SegmentedCount>}
                </button>
              );
            })}
          </div>

          {dayTab === "stack" &&
            (selectedList.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No doses scheduled for this day.{" "}
                <a
                  href="/stack"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Add a compound
                </a>{" "}
                to start tracking.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {selectedList.map((e) => {
                  const s = (e.status ?? "pending") as Status;
                  const time = formatInTimeZone(e.scheduled_at, zone, "h:mm a");
                  const isFuturePending =
                    s === "pending" && new Date(e.scheduled_at).getTime() > Date.now();
                  const isEditing = editingId === e.id;
                  if (isEditing) {
                    return (
                      <li key={e.id} className="py-3">
                        <div className="mb-2 text-xs font-medium text-muted-foreground">
                          {e.name}
                          {e.dose ? ` · ${e.dose}` : ""}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Time</span>
                            <input
                              type="time"
                              value={editTime}
                              onChange={(ev) => setEditTime(ev.target.value)}
                              className="h-9 rounded-md border border-border bg-background px-2 text-sm tabular-nums"
                            />
                          </label>
                          <label className="flex flex-1 items-center gap-1.5 text-xs min-w-[160px]">
                            <span className="text-muted-foreground">Label</span>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(ev) => setEditLabel(ev.target.value)}
                              maxLength={200}
                              placeholder="Optional note"
                              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                            />
                          </label>
                        </div>
                        {editError && (
                          <div className="mt-2 text-xs text-[color:var(--severity-avoid)]">
                            {editError}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(e)}
                            disabled={saving}
                            className="inline-flex h-9 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="inline-flex h-9 items-center rounded-full border border-border px-3 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                      <div className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {time}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{e.name}</div>
                        {(e.note || e.dose) && (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {e.note ? e.note : e.dose}
                            {e.note && e.dose ? ` · ${e.dose}` : ""}
                          </div>
                        )}
                      </div>
                      {isFuturePending && (
                        <button
                          type="button"
                          onClick={() => startEdit(e)}
                          className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium hover:bg-muted"
                          aria-label={`Edit dose at ${time}`}
                        >
                          Edit
                        </button>
                      )}
                      <div
                        role="group"
                        aria-label={`Mark dose at ${time}`}
                        className="flex items-center gap-1"
                      >
                        {(["taken", "missed", "skipped"] as const).map((k) => {
                          const active = s === k;
                          const busy = statusBusyId === e.id;
                          const base =
                            "inline-flex h-7 items-center rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wider transition disabled:opacity-60";
                          const tone = active
                            ? STATUS_STYLES[k as Status] + " border-transparent"
                            : "border-border bg-background text-muted-foreground hover:bg-muted";
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setEventStatus(e, k as Status)}
                              disabled={busy}
                              aria-pressed={active}
                              aria-label={`${active ? "Clear" : "Mark"} ${STATUS_LABELS[k as Status]}`}
                              className={`${base} ${tone}`}
                            >
                              {STATUS_LABELS[k as Status]}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}
          {dayTab === "workouts" && <DayFoodWorkouts day={selected} tab="workouts" />}
          {dayTab === "food" && (
            <>
              <DayFoodWorkouts day={selected} tab="food" />
              <MacroProgress day={selected} className="mt-3" />
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function formatDayHeading(day: string, zone: string): string {
  return relativeDayLabel(day, zone);
}

function MissedDosesPanel({
  events,
  zone,
  onUpdate,
}: {
  events: Event[];
  zone: string;
  onUpdate: (id: string, patch: Partial<Event>) => void;
}) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  const missed = useMemo(
    () =>
      events
        .filter((e) => (e.status ?? "pending") === "missed")
        .sort((a, b) => (a.scheduled_at < b.scheduled_at ? 1 : -1)),
    [events],
  );

  const grouped = useMemo(() => {
    const g = new Map<string, Event[]>();
    for (const e of missed) {
      const key = formatInTimeZone(e.scheduled_at, zone, "yyyy-MM-dd");
      const arr = g.get(key) ?? [];
      arr.push(e);
      g.set(key, arr);
    }
    return Array.from(g.entries());
  }, [missed, zone]);

  const visible = showAll ? grouped : grouped.slice(0, 3);

  async function update(ev: Event, status: Status) {
    setBusy((b) => ({ ...b, [ev.id]: true }));
    const patch: { status: Status; taken_at: string | null } =
      status === "taken"
        ? { status, taken_at: new Date().toISOString() }
        : { status, taken_at: null };
    onUpdate(ev.id, patch);
    const { error } = await supabase.from("schedule_events").update(patch).eq("id", ev.id);
    setBusy((b) => {
      const { [ev.id]: _, ...rest } = b;
      return rest;
    });
    if (error) {
      // Roll back on failure.
      onUpdate(ev.id, { status: "missed", taken_at: null });
      console.error("Failed to update missed dose", error);
    }
  }

  if (missed.length === 0) {
    return (
      <Card className="mb-6 rounded-2xl border-border p-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">No missed doses</span> in the last 30 days.
        Nice work.
      </Card>
    );
  }

  return (
    <section
      aria-label="Missed doses"
      className="mb-6 rounded-2xl border border-[color:var(--severity-avoid)]/30 bg-[color:var(--severity-avoid-bg)] p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Missed doses</h2>
          <p className="text-xs text-muted-foreground">
            {missed.length} in the last 30 days. Mark them taken or ignore.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        {visible.map(([day, items]) => (
          <div key={day}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {formatDayHeading(day, zone)}
            </div>
            <ul className="space-y-2">
              {items.map((e) => {
                const uc = e.user_compound;
                const name = uc?.custom_name || uc?.compound?.name || "Compound";
                const dose = uc?.dose_amount
                  ? `${uc.dose_amount}${uc.dose_unit ? " " + uc.dose_unit : ""}`
                  : "";
                const time = formatInTimeZone(e.scheduled_at, zone, "h:mm a");
                const pending = !!busy[e.id];
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/70 p-2.5"
                  >
                    <div className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{name}</div>
                      {dose && <div className="text-xs text-muted-foreground">{dose}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => update(e, "taken")}
                        disabled={pending}
                        className="tap-target inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark taken
                      </button>
                      <button
                        type="button"
                        onClick={() => update(e, "skipped")}
                        disabled={pending}
                        className="tap-target inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" /> Ignore
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {grouped.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="tap-target mt-3 text-xs font-medium text-primary hover:underline"
        >
          {showAll ? "Show fewer days" : `Show all ${grouped.length} days`}
        </button>
      )}
    </section>
  );
}
