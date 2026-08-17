import { useEffect, useState } from "react";
import { Dumbbell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Settings = {
  enabled: boolean;
  lead_minutes: number;
  missed_enabled: boolean;
  missed_check_hour: number;
};

const DEFAULTS: Settings = {
  enabled: true,
  lead_minutes: 30,
  missed_enabled: true,
  missed_check_hour: 20,
};

const LEAD_OPTIONS = [0, 10, 15, 30, 60, 120];

function hourLabel(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${suffix}`;
}

/**
 * Workout reminder preferences. Nudges fire from the server (email + web push)
 * for planned sessions with a start time, and for planned sessions that were
 * never logged.
 */
export function WorkoutReminderSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("workout_reminder_settings")
        .select("enabled, lead_minutes, missed_enabled, missed_check_hour")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) setSettings({ ...DEFAULTS, ...data });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return;
      await supabase
        .from("workout_reminder_settings")
        .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Dumbbell className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Workout reminders</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Get nudged before a planned session, and again if you never logged it.
            </p>
          </div>
        </div>
        {saving && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground">Remind me about planned workouts</span>
            <input
              type="checkbox"
              className="tap-target h-5 w-5 accent-[var(--color-primary)]"
              checked={settings.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
          </label>

          <div className={settings.enabled ? "space-y-4" : "space-y-4 opacity-50"}>
            <div>
              <label htmlFor="workout-lead" className="text-xs font-medium text-muted-foreground">
                Remind me ahead of time
              </label>
              <select
                id="workout-lead"
                disabled={!settings.enabled}
                value={settings.lead_minutes}
                onChange={(e) => update({ lead_minutes: Number(e.target.value) })}
                className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {LEAD_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? "At start time" : `${m} min before`}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">Nudge me about missed sessions</span>
              <input
                type="checkbox"
                disabled={!settings.enabled}
                className="tap-target h-5 w-5 accent-[var(--color-primary)]"
                checked={settings.missed_enabled}
                onChange={(e) => update({ missed_enabled: e.target.checked })}
              />
            </label>

            <div>
              <label
                htmlFor="workout-missed-hour"
                className="text-xs font-medium text-muted-foreground"
              >
                Missed-session check-in time
              </label>
              <select
                id="workout-missed-hour"
                disabled={!settings.enabled || !settings.missed_enabled}
                value={settings.missed_check_hour}
                onChange={(e) => update({ missed_check_hour: Number(e.target.value) })}
                className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Planned workouts need a start time to get an upcoming reminder — set one when you plan
            the session. Quiet hours above apply to workout nudges too.
          </p>
        </div>
      )}
    </section>
  );
}
