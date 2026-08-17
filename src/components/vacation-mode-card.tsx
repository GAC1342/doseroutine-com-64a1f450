import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, Check, Loader2, Play, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  addDays,
  diffDays,
  formatPauseRange,
  localToday,
  nextWeekRange,
  normalizePause,
  pauseDaysRemaining,
} from "@/lib/pause";

export const PAUSE_KEY = ["stack-pause"] as const;

export type PauseProfile = {
  timezone: string;
  pause_start: string | null;
  pause_end: string | null;
  pause_reason: string | null;
};

export async function fetchPause(): Promise<PauseProfile | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("timezone, pause_start, pause_end, pause_reason")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return {
    timezone: data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    pause_start: data?.pause_start ?? null,
    pause_end: data?.pause_end ?? null,
    pause_reason: data?.pause_reason ?? null,
  };
}

/** Shared React Query options so Today and More stay in sync. */
export function pauseQueryOptions() {
  return {
    queryKey: PAUSE_KEY,
    queryFn: fetchPause,
    staleTime: 60_000,
    retry: 1,
  };
}

const PRESETS = [
  { label: "Weekend", days: 2 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  // Not "N days from today" — an explicit Mon–Sun range for the coming week.
  { label: "Next week", days: 0 },
] as const;

/**
 * Vacation mode. Puts the whole stack on hold for a date range: no doses are
 * generated on those days, so nothing can be marked missed and the adherence
 * score is left untouched. Everything resumes automatically on the end date.
 */
export function VacationModeCard() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery(pauseQueryOptions());
  const tz = profile?.timezone ?? "UTC";
  const today = localToday(tz);
  const range = normalizePause(profile ?? null);
  const paused = !!range && today <= range.end;

  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState(false);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 6));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStart(today);
    setEnd(addDays(today, 6));
  }, [today]);

  async function save(nextStart: string | null, nextEnd: string | null, nextReason: string | null) {
    setSaving(true);
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      setSaving(false);
      setError("You need to be signed in.");
      return;
    }
    const { error: err } = await supabase
      .from("profiles")
      .update({ pause_start: nextStart, pause_end: nextEnd, pause_reason: nextReason })
      .eq("id", user.id);
    setSaving(false);
    if (err) {
      console.error("Failed to save pause", err);
      setError("Couldn't save that. Try again.");
      return;
    }
    setCustom(false);
    // Today regenerates its schedule on load, so a broad invalidate is enough
    // to make the paused days disappear (or come back) everywhere at once.
    await qc.invalidateQueries();
  }

  function pausePreset(days: number) {
    if (days <= 0) {
      // "Next week" — Monday to Sunday of the coming week, starting later.
      const wk = nextWeekRange(today);
      void save(wk.start, wk.end, reason.trim() || null);
      return;
    }
    void save(today, addDays(today, days - 1), reason.trim() || null);
  }

  function saveCustom() {
    if (end < start) {
      setError("The end date can't be before the start date.");
      return;
    }
    if (diffDays(start, end) > 364) {
      setError("Pauses are limited to a year.");
      return;
    }
    void save(start, end, reason.trim() || null);
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Loading vacation mode…
      </div>
    );
  }

  const remaining = pauseDaysRemaining(profile ?? null, tz);
  // A pause can be booked ahead ("next week"), so distinguish scheduled from live.
  const scheduled = !!range && today < range.start;

  return (
    <div className="rounded-2xl border border-border bg-card p-4" aria-label="Vacation mode">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-muted p-2 text-muted-foreground">
          {paused ? <CalendarOff className="h-4 w-4" /> : <Plane className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Vacation mode</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {paused
              ? `${scheduled ? "Pause scheduled" : "Stack paused"} · ${formatPauseRange(profile, tz)}${
                  remaining ? ` · ${remaining} day${remaining === 1 ? "" : "s"}` : ""
                }`
              : "Pause every dose for a few days. Paused days don't count as missed and won't touch your adherence score."}
          </p>

          {paused && range?.reason ? (
            <p className="mt-1 text-xs italic text-muted-foreground">“{range.reason}”</p>
          ) : null}

          {paused ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(null, null, null)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {scheduled ? "Cancel pause" : "Resume now"}
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    disabled={saving}
                    onClick={() => pausePreset(p.days)}
                    className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setCustom((v) => !v)}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  Custom dates
                </button>
              </div>

              {custom ? (
                <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                  <div className="flex flex-wrap gap-2">
                    <label className="flex-1 text-xs text-muted-foreground">
                      From
                      <input
                        type="date"
                        value={start}
                        min={today}
                        onChange={(e) => setStart(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </label>
                    <label className="flex-1 text-xs text-muted-foreground">
                      To
                      <input
                        type="date"
                        value={end}
                        min={start}
                        onChange={(e) => setEnd(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={reason}
                    maxLength={60}
                    placeholder="Reason (optional) — e.g. Holiday"
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveCustom}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Pause stack
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
