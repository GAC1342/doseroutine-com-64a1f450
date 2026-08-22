import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  SkipForward,
  Loader2,
  Undo2,
  Clock,
  Flame,
  Sparkles,
  BookOpen,
  Activity,
  Calculator,
  Timer,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ScanLine,
  UtensilsCrossed,
  CalendarOff,
} from "lucide-react";
import { QuickAddMealSheet } from "@/components/quick-add-meal-sheet";
import { hapticTap, hapticSuccess, hapticWarning } from "@/lib/haptics";
import { trackEvent } from "@/lib/analytics";
import { trackFunnelStep } from "@/lib/funnel";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { generateScheduleForCurrentUser } from "@/lib/schedule";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { historyWindow, localDayWindow } from "@/lib/today-window";
import { StatsTrendCard } from "@/components/stats-trend-card";
import { AvatarMenu } from "@/components/avatar-menu";
import { TimezoneCard } from "@/components/timezone-card";
import { MacroProgress } from "@/components/macro-progress";
import { TodayMealsCard } from "@/components/today-meals-card";
import { MealPhotoExpiryBanner } from "@/components/meal-photo-storage-card";

import { dayKeyOf } from "@/lib/macro-progress";
import { TodayRoutineStrip } from "@/components/today-routine-strip";
import { ReorderPanel } from "@/components/reorder-panel";
import { enqueueDoseMutation, flushQueue } from "@/lib/offline-queue";
import { AppCapabilityShowcase } from "@/components/app-capability-showcase";
import { TrialExpiredBanner } from "@/components/trial-expired-banner";
import { TrialEndingBanner } from "@/components/trial-ending-banner";

import { useEntitlementReturnRefresh } from "@/lib/entitlement-refresh";
import { getEffectiveDoseStatus } from "@/lib/dose-status";
import { TodayFooterBlock } from "@/components/today-footer-block";
import { Card, cardClassName } from "@/components/ui/card";
import { AdherenceRing } from "@/components/adherence-ring";
import {
  computeAdherence,
  computeAdherenceScore,
  fetchAdherenceEvents,
  type AdhEvent,
} from "@/lib/adherence";

import { formatPauseRange, normalizePause } from "@/lib/pause";
import { VacationModeCard, pauseQueryOptions } from "@/components/vacation-mode-card";
import { StandingRulesCard } from "@/components/standing-rules-card";
import { LoadingStatus } from "@/components/skeletons";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/today")({
  errorComponent: routeErrorComponent("today"),
  // Auth-gated: never prerender (the parent sets this too — explicit here so a
  // future per-leaf prerender pass can't 401 the build).
  ssr: false,
  head: () => ({
    meta: [
      { title: "Today — DoseRoutine" },
      { name: "description", content: "Your dose ribbon and adherence snapshot for today." },
    ],
  }),
  component: TodayPage,
});

type Compound = Database["public"]["Tables"]["compounds"]["Row"];
type UC = Database["public"]["Tables"]["user_compounds"]["Row"];
type Event = Database["public"]["Tables"]["schedule_events"]["Row"] & {
  user_compound: (UC & { compound: Compound | null }) | null;
};
type Status = Database["public"]["Enums"]["event_status"];

const UNDO_MS = 5000;

/** Named parts of the day, in the user's timezone. `to` is exclusive. */
const TIME_BLOCKS = [
  { key: "morning", label: "Morning", from: 0, to: 12 },
  { key: "afternoon", label: "Afternoon", from: 12, to: 17 },
  { key: "evening", label: "Evening", from: 17, to: 21 },
  { key: "night", label: "Night", from: 21, to: 24 },
] as const;

type TodayData = {
  tz: string;
  events: Event[];
  adherence7: { onTime: number; total: number; streak: number };
};

const TODAY_KEY = ["today-page"] as const;

async function fetchTodayData(): Promise<TodayData> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  // Do NOT resolve with an empty day here. A transient session read (token
  // refresh while the tab was backgrounded, brief network drop) would otherwise
  // overwrite the cached day with "Nothing scheduled" before the next refetch
  // repairs it. Throwing keeps React Query's previous data on screen.
  if (!user) throw new Error("Session not ready");
  const { data: prof } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const zone = prof?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  // Always regenerate — cheap (idempotent upsert) and guarantees new/edited
  // compounds show up immediately without needing a page reload.
  try {
    await generateScheduleForCurrentUser(7);
  } catch (e) {
    console.warn("schedule generation failed", e);
  }

  // Build the day window in the user's timezone so we don't miss doses that
  // fall outside the browser's local calendar day (e.g. late-night doses that
  // cross into the next UTC day, or users whose device tz != profile tz).
  // Shared helper — guarded by src/lib/today-window.test.ts across DST + tz.
  const { start, end } = localDayWindow(new Date(), zone);

  const { data: ev, error: evError } = await supabase
    .from("schedule_events")
    .select("*, user_compound:user_compounds(*, compound:compounds(*))")
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at");
  // Same reason: a failed read must not look like an empty schedule.
  if (evError) throw evError;

  // Pull 30 days of history (not 7) and run the SAME shared computation the
  // Timeline page uses, so on-time % and streak can never disagree between
  // the two screens. A 7-day window truncates the streak. The window itself
  // comes from the shared historyWindow helper for the same reason.
  const hist30 = historyWindow(new Date(), zone, 30);
  const { data: hist, error: histError } = await supabase
    .from("schedule_events")
    .select("id, status, scheduled_at, taken_at")
    .gte("scheduled_at", hist30.start.toISOString())
    .lte("scheduled_at", hist30.end.toISOString());
  if (histError) throw histError;

  const now = new Date();
  let adherence7 = { onTime: 0, total: 0, streak: 0 };
  if (hist) {
    const stats = computeAdherence(hist as AdhEvent[], 7, zone);
    adherence7 = { onTime: stats.onTimeCount, total: stats.totalScheduled, streak: stats.streak };
  }

  const events = ((ev as Event[] | null) ?? []).map((event) => ({
    ...event,
    status: getEffectiveDoseStatus(event.status, event.scheduled_at, now),
  }));

  return { tz: zone, events, adherence7 };
}

function TodayPage() {
  const qc = useQueryClient();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Landing back from /trial or checkout: billing changed server-side, so the
  // cached entitlement is stale and would keep advertising the free trial.
  useEntitlementReturnRefresh();

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: TODAY_KEY,
    queryFn: fetchTodayData,
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
    // Pause the 60s poll while the tab/app is backgrounded — the visibility
    // handler below refetches immediately when we come back, so we don't
    // burn battery/network polling in the background WebView.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Keep the last good day rendered while a background refetch runs so
    // navigating between tabs never flashes an empty schedule.
    placeholderData: (prev: TodayData | undefined) => prev,
    retry: 2,
  });
  const validData =
    data && Array.isArray(data.events) && typeof data.tz === "string" ? data : undefined;
  const tz = validData?.tz ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const events = useMemo(() => validData?.events ?? [], [validData]);
  const adherence7 = validData?.adherence7 ?? { onTime: 0, total: 0, streak: 0 };
  const loading = isLoading && !validData;

  // Rolling 30-day adherence score. Separate query so a slow/failed history
  // read never blocks or blanks today's doses — the ring just shows "—".
  const { data: score30 } = useQuery({
    queryKey: ["adherence-score-30", tz],
    queryFn: async () => computeAdherenceScore(await fetchAdherenceEvents(30, tz), 30),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  // Vacation mode. A paused day generates no doses at all, so the banner is
  // what tells the user the empty day is deliberate rather than broken.
  const { data: pauseProfile } = useQuery(pauseQueryOptions());
  const pauseRange = normalizePause(pauseProfile ?? null);
  const isPaused =
    !!pauseRange &&
    formatInTimeZone(new Date(), tz, "yyyy-MM-dd") <= pauseRange.end &&
    formatInTimeZone(new Date(), tz, "yyyy-MM-dd") >= pauseRange.start;

  async function resumeStack() {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    const { error: err } = await supabase
      .from("profiles")
      .update({ pause_start: null, pause_end: null, pause_reason: null })
      .eq("id", user.id);
    if (err) {
      console.error("Failed to resume stack", err);
      return;
    }
    await qc.invalidateQueries();
  }

  const [showFeatures, setShowFeatures] = useState(false);
  const [pending, setPending] = useState<Record<string, { prev: Event; timer: number }>>({});
  const undoTimers = useRef<Map<string, number>>(new Map());

  // Older tab prefetch code could cache `null` under the real Today key. If a
  // user navigates back before that stale entry expires, do not render it as an
  // empty day — clear it and fetch the real schedule immediately.
  useEffect(() => {
    if (data && !validData) {
      qc.removeQueries({ queryKey: TODAY_KEY, exact: true });
      void refetch();
    }
  }, [data, validData, qc, refetch]);

  function patchEvent(id: string, patch: Partial<Event>) {
    qc.setQueryData<TodayData>(TODAY_KEY, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        events: prev.events.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      };
    });
    qc.setQueriesData<Array<{ id: string; status: Status | null; taken_at?: string | null }>>(
      { queryKey: ["timeline-month"] },
      (prev) => (prev ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  // "Mark as taken" deep link from reminder emails: /today?taken=<eventId>
  const takenHandled = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (takenHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const takenId = params.get("taken");
    if (!takenId) return;
    takenHandled.current = true;
    (async () => {
      // Cancel any in-flight fetch so it can't clobber the invalidated result.
      await qc.cancelQueries({ queryKey: TODAY_KEY });
      await supabase
        .from("schedule_events")
        .update({ status: "taken", taken_at: new Date().toISOString() })
        .eq("id", takenId)
        .eq("status", "pending");
      const url = new URL(window.location.href);
      url.searchParams.delete("taken");
      window.history.replaceState({}, "", url.toString());
      qc.invalidateQueries({ queryKey: TODAY_KEY });
      qc.invalidateQueries({ queryKey: ["timeline-month"] });
      void qc.invalidateQueries({ queryKey: ["adherence-score-30"] });
    })();
  }, [qc]);

  // Refetch when app returns to foreground (Capacitor iOS/Android + web).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const nextUp = useMemo(() => {
    const now = Date.now();
    return (
      events.find((e) => e.status === "pending" && new Date(e.scheduled_at).getTime() >= now) ??
      events.find((e) => e.status === "pending")
    );
  }, [events]);

  // Group the day into named blocks so the list reads like a routine rather
  // than a flat feed. Blocks with nothing in them are dropped.
  const blocks = useMemo(() => {
    const groups = TIME_BLOCKS.map((b) => ({ ...b, events: [] as Event[] }));
    for (const ev of events) {
      const hour = Number(formatInTimeZone(ev.scheduled_at, tz, "H"));
      const group = groups.find((g) => hour >= g.from && hour < g.to) ?? groups[groups.length - 1];
      group.events.push(ev);
    }
    for (const g of groups) {
      g.events.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    }
    return groups.filter((g) => g.events.length > 0);
  }, [events, tz]);

  async function markStatus(ev: Event, status: Status) {
    const prev = ev;
    const now = new Date().toISOString();
    // Native haptic — fires only on iOS/Android, no-op on web.
    void (status === "taken" ? hapticSuccess() : hapticTap("light"));
    if (status === "taken") trackFunnelStep("funnel_first_activation", { source: "dose_taken" });
    // Optimistic UI + immediate DB write. If the user refreshes or navigates
    // away, the write has already been sent — no silent drop.
    patchEvent(ev.id, { status, taken_at: status === "taken" ? now : null });

    // Show the Undo affordance for UNDO_MS, then auto-hide.
    const existing = undoTimers.current.get(ev.id);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      undoTimers.current.delete(ev.id);
      setPending((p) => {
        const { [ev.id]: _, ...rest } = p;
        return rest;
      });
    }, UNDO_MS);
    undoTimers.current.set(ev.id, timer);
    setPending((p) => ({ ...p, [ev.id]: { prev, timer } }));

    // Offline-first: if the network is down, queue the mutation and keep
    // the optimistic UI. It'll replay automatically when we're back online.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueDoseMutation({ id: ev.id, status, taken_at: status === "taken" ? now : null });
      return;
    }

    const { error } = await supabase
      .from("schedule_events")
      .update({ status, taken_at: status === "taken" ? now : null })
      .eq("id", ev.id);
    if (error) {
      // Network-ish errors → queue and keep the optimistic UI; permission
      // errors (RLS/validation) start with a digit → roll back.
      const permissionLike = typeof error.code === "string" && /^\d/.test(error.code);
      if (!permissionLike) {
        enqueueDoseMutation({ id: ev.id, status, taken_at: status === "taken" ? now : null });
        void flushQueue();
        return;
      }
      patchEvent(ev.id, { status: prev.status, taken_at: prev.taken_at });
      window.clearTimeout(timer);
      undoTimers.current.delete(ev.id);
      setPending((p) => {
        const { [ev.id]: _, ...rest } = p;
        return rest;
      });
      void hapticWarning();
      console.error("Failed to save dose status", error);
    } else {
      void qc.invalidateQueries({ queryKey: ["timeline-month"] });
      void qc.invalidateQueries({ queryKey: ["adherence-score-30"] });
    }
  }

  async function undo(ev: Event) {
    const t = undoTimers.current.get(ev.id);
    if (t) window.clearTimeout(t);
    undoTimers.current.delete(ev.id);
    const prev = pending[ev.id]?.prev;
    setPending((p) => {
      const { [ev.id]: _, ...rest } = p;
      return rest;
    });
    if (!prev) return;
    // Restore UI, then write the reversal to the DB so refresh/nav preserves it.
    patchEvent(ev.id, { status: prev.status, taken_at: prev.taken_at });
    const { error } = await supabase
      .from("schedule_events")
      .update({ status: prev.status, taken_at: prev.taken_at })
      .eq("id", ev.id);
    if (error) {
      // Undo write failed — reflect the persisted state back in the UI.
      patchEvent(ev.id, { status: ev.status, taken_at: ev.taken_at });
      console.error("Failed to undo dose status", error);
    } else {
      void qc.invalidateQueries({ queryKey: ["timeline-month"] });
      void qc.invalidateQueries({ queryKey: ["adherence-score-30"] });
    }
  }

  async function resetToPending(ev: Event) {
    const prev = ev;
    patchEvent(ev.id, { status: "pending", taken_at: null });
    const { error } = await supabase
      .from("schedule_events")
      .update({ status: "pending", taken_at: null })
      .eq("id", ev.id);
    if (error) {
      patchEvent(ev.id, { status: prev.status, taken_at: prev.taken_at });
    } else {
      void qc.invalidateQueries({ queryKey: ["timeline-month"] });
      void qc.invalidateQueries({ queryKey: ["adherence-score-30"] });
    }
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <Card className="mt-8 rounded-2xl border-dashed border-border p-8 text-center">
          <p className="font-display text-lg font-semibold">Couldn't load today's schedule</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your connection and try again — nothing has been lost.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="tap-target mt-4 inline-flex items-center justify-center self-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--primary-hover)]"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6" aria-busy="true">
        <LoadingStatus label="Loading today's doses…" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-2 h-4 w-48" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const onTimePct = adherence7.total
    ? Math.round((adherence7.onTime / adherence7.total) * 100)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">Today</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString([], {
              timeZone: tz,
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void hapticTap("light");
              trackEvent("today_manual_refresh");
              void refetch();
            }}
            disabled={isFetching}
            aria-label="Refresh doses"
            title="Refresh doses"
            className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground transition hover:bg-[color:var(--card-hover,rgba(255,255,255,0.04))] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <AvatarMenu />
        </div>
      </div>

      <TodayMealsCard className="mt-4" />

      <MacroProgress
        day={dayKeyOf(new Date())}
        className="mt-4"
        onLogMeal={() => setQuickAddOpen(true)}
      />

      <MealPhotoExpiryBanner className="mt-4" />

      <nav aria-label="Quick actions" className="mt-4 grid grid-cols-3 gap-2">
        {[
          { to: "/chat", label: "Ask AI", Icon: Sparkles },
          { to: "/scan", label: "Scan", Icon: ScanLine },
          { to: "/food", label: "Log food", Icon: UtensilsCrossed },
          { to: "/library", label: "Library", Icon: BookOpen },
          { to: "/plan", label: "Plan", Icon: Sparkles },
          {
            to: "/fitness",
            search: { view: "workouts" as const },
            label: "Fitness",
            Icon: Activity,
          },
          { to: "/peptide-calculator", label: "Peptide calc", Icon: Calculator },
          { to: "/timer", label: "Timer", Icon: Timer },
        ].map(
          ({
            to,
            label,
            Icon,
            search,
          }: {
            to: string;
            label: string;
            Icon: typeof Sparkles;
            search?: Record<string, string>;
          }) => (
            <Link
              key={label}
              to={to as never}
              search={search as never}
              onClick={() =>
                trackEvent("today_quick_action_clicked", { destination: label.toLowerCase() })
              }
              className="tap-target flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl bg-card p-2 text-[11px] font-medium text-foreground transition hover:bg-[color:var(--card-hover,rgba(255,255,255,0.04))]"
            >
              <Icon className="h-5 w-5 text-primary" />
              {label}
            </Link>
          ),
        )}
      </nav>

      {/* Expandable feature overview — same content as the landing page */}
      <section className={cn(cardClassName, "mt-4 rounded-2xl")}>
        <button
          type="button"
          onClick={() => {
            setShowFeatures((prev) => {
              const next = !prev;
              trackEvent("today_features_toggle", { open: next });
              return next;
            });
          }}
          className="tap-target flex w-full items-center justify-between p-4 text-left"
          aria-expanded={showFeatures}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Built for the full protocol
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold">What DoseRoutine can do</h2>
          </div>
          {showFeatures ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </button>
        {showFeatures && (
          <div className="border-t border-border px-4 pb-2 sm:px-6">
            <AppCapabilityShowcase section="today" compact />
          </div>
        )}
      </section>

      <TrialEndingBanner />
      <TrialExpiredBanner />

      {isPaused ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-muted/60 p-4">
          <CalendarOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Stack paused</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatPauseRange(pauseProfile, tz)} · doses are on hold and won't count as missed.
              Resumes automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void resumeStack()}
            className="tap-target shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            Resume
          </button>
        </div>
      ) : null}

      {events.length === 0 && !isPaused ? (
        <Card className="mt-8 rounded-2xl border-dashed border-border p-8 text-center">
          <p className="font-display text-lg font-semibold">Nothing scheduled today</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add compounds with times to see them appear here.
          </p>
          <Link
            to="/stack"
            className="tap-target mt-4 inline-flex items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--primary-hover)]"
          >
            Go to Stack
          </Link>
        </Card>
      ) : (
        <>
          {/* Next-dose hero — the single most important thing on the screen. */}
          {nextUp ? (
            <section className="mt-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider opacity-80">
                <Clock className="h-3.5 w-3.5" /> Next dose
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-display text-2xl font-bold">
                    {nextUp.user_compound?.compound?.name ??
                      nextUp.user_compound?.custom_name ??
                      "Dose"}
                  </div>
                  {nextUp.dose_amount != null && (
                    <p className="mt-0.5 text-sm opacity-90">
                      {nextUp.dose_amount} {nextUp.dose_unit ?? ""}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-2xl font-bold tabular-nums">
                    {fmtTime(nextUp.scheduled_at)}
                  </div>
                </div>
              </div>
              {pending[nextUp.id] ? (
                <button
                  type="button"
                  onClick={() => void undo(nextUp)}
                  className="tap-target mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-background/20 px-4 py-3 text-sm font-semibold text-current backdrop-blur hover:bg-background/30"
                >
                  <Undo2 className="h-4 w-4" /> Undo
                </button>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void markStatus(nextUp, "taken")}
                    className="tap-target flex-1 rounded-xl bg-background px-4 py-3 text-sm font-semibold text-primary shadow-sm hover:opacity-90 active:scale-[0.99]"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Check className="h-4 w-4" /> Take now
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void markStatus(nextUp, "skipped")}
                    className="tap-target rounded-xl bg-background/20 px-4 py-3 text-sm font-medium text-current backdrop-blur hover:bg-background/30"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <SkipForward className="h-4 w-4" /> Skip
                    </span>
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="mt-4 rounded-2xl border border-border bg-card p-5 text-center">
              <p className="font-display text-lg font-semibold">All doses handled today</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing left pending — see you tomorrow.
              </p>
            </section>
          )}

          {/* Adherence snapshot */}
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/adherence"
              className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="flex h-full items-center gap-4 rounded-2xl border-border p-4 transition hover:bg-[color:var(--card-hover,rgba(255,255,255,0.04))]">
                <AdherenceRing score={score30?.score ?? null} label="30d" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Adherence score
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {score30 && score30.scored > 0
                      ? `${score30.taken} of ${score30.scored} doses taken in the last 30 days.`
                      : "Log a few doses and your score appears here."}
                  </p>
                  {score30 && score30.skipped > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {score30.skipped} intentional skip{score30.skipped === 1 ? "" : "s"} not
                      counted against you.
                    </p>
                  )}
                  <span className="mt-1 inline-block text-xs font-semibold text-primary">
                    View monthly report →
                  </span>
                </div>
              </Card>
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-2xl border-border p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> On-time (7d)
                </div>
                <div className="mt-1 font-display text-2xl font-bold">
                  {onTimePct == null ? "—" : `${onTimePct}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {adherence7.onTime}/{adherence7.total} on-time
                </p>
              </Card>
              <Card className="rounded-2xl border-border p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-warm">
                  <Flame className="h-3.5 w-3.5" /> Streak
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-accent-warm">
                  {adherence7.streak}{" "}
                  <span className="text-sm font-normal text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground">No missed doses.</p>
              </Card>
            </div>
          </section>

          {/* Workout + meal anchors (never scored) */}
          <TodayRoutineStrip tz={tz} />

          {/* Day, grouped into blocks */}
          {blocks.map((block) => {
            const done = block.events.filter(
              (e) => getEffectiveDoseStatus(e.status, e.scheduled_at) !== "pending",
            ).length;
            return (
              <section key={block.key} className="mt-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {block.label}
                  </h2>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {done}/{block.events.length}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {block.events.map((ev) => (
                    <DoseRow
                      key={ev.id}
                      ev={ev}
                      time={fmtTime(ev.scheduled_at)}
                      onTake={() => markStatus(ev, "taken")}
                      onSkip={() => markStatus(ev, "skipped")}
                      onUndo={() => undo(ev)}
                      onReset={() => resetToPending(ev)}
                      canUndo={!!pending[ev.id]}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      <div className="mt-6 space-y-3">
        <TimezoneCard
          timezone={tz}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: TODAY_KEY });
          }}
        />
        <VacationModeCard />
        <StandingRulesCard />

        <StatsTrendCard />

        <ReorderPanel />
      </div>

      <TodayFooterBlock />

      <button
        type="button"
        aria-label="Scan a meal"
        onClick={() => {
          hapticTap();
          setQuickAddOpen(true);
        }}
        className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg transition-transform active:scale-95 hover:bg-[color:var(--primary-hover)] sm:bottom-8 sm:right-8"
      >
        <ScanLine className="h-6 w-6" aria-hidden="true" />
        <span className="text-sm font-semibold">Scan</span>
      </button>

      <QuickAddMealSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: TODAY_KEY })}
      />
    </div>
  );
}

/**
 * Full-width dose row inside a time block. Actions are inline so taking a
 * dose is always one tap from the list — no drill-in, no horizontal scrolling.
 */
function DoseRow({
  ev,
  time,
  onTake,
  onSkip,
  onUndo,
  onReset,
  canUndo,
}: {
  ev: Event;
  time: string;
  onTake: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
}) {
  const name = ev.user_compound?.compound?.name ?? ev.user_compound?.custom_name ?? "Dose";
  const status = getEffectiveDoseStatus(ev.status, ev.scheduled_at);
  const isTaken = status === "taken";
  const isSkipped = status === "skipped";
  const isMissed = status === "missed";
  // A missed dose is still actionable — you can log it late or skip it.
  // (Resetting it to "pending" would immediately re-derive as missed, so we
  // offer Taken/Skip directly instead of a no-op Reset button.)
  const isCompleted = isTaken || isSkipped;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
        isTaken
          ? "border-transparent bg-[color:var(--dose-taken-bg,rgba(30,122,79,0.10))]"
          : isMissed
            ? "border-transparent bg-[color:var(--severity-avoid-bg)]"
            : isSkipped
              ? "border-border bg-muted"
              : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isTaken
            ? "bg-[#1E7A4F] text-white"
            : isMissed
              ? "bg-[color:var(--severity-avoid)] text-white"
              : "bg-background text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {isTaken ? (
          <Check className="h-5 w-5" />
        ) : isSkipped ? (
          <SkipForward className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-sm font-semibold text-foreground">{name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{time}</span>
          {ev.dose_amount != null && (
            <span>
              · {ev.dose_amount} {ev.dose_unit ?? ""}
            </span>
          )}
          {isSkipped && <span>· Skipped</span>}
          {isMissed && <span className="text-[color:var(--severity-avoid)]">· Missed</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canUndo ? (
          <button
            onClick={onUndo}
            className="tap-target rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-card"
          >
            <span className="inline-flex items-center gap-1">
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </span>
          </button>
        ) : status === "pending" || isMissed ? (
          <>
            <button
              onClick={onTake}
              className="tap-target rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-[color:var(--primary-hover)] active:scale-[0.98]"
            >
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> {isMissed ? "Log late" : "Taken"}
              </span>
            </button>
            <button
              onClick={onSkip}
              className="tap-target rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card"
              aria-label={`Skip ${name}`}
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </>
        ) : isCompleted ? (
          <button
            onClick={onReset}
            className="tap-target rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-card"
            aria-label={`Reset ${name}`}
          >
            <span className="inline-flex items-center gap-1">
              <Undo2 className="h-3.5 w-3.5" /> Reset
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
