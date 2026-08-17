import { useEffect, useMemo, useState } from "react";
import { Globe, Check, Pencil, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  timezone: string;
  /** Called after a successful save so callers can refetch schedule data. */
  onSaved?: (tz: string) => void;
  compact?: boolean;
};

function listTimezones(): string[] {
  const supported = (
    Intl as unknown as {
      supportedValuesOf?: (k: string) => string[];
    }
  ).supportedValuesOf?.("timeZone");
  if (supported && supported.length) return supported;
  return [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Australia/Sydney",
  ];
}

export function TimezoneCard({ timezone, onSaved, compact }: Props) {
  const qc = useQueryClient();
  const detected = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(timezone);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => setValue(timezone), [timezone]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const options = useMemo(listTimezones, []);
  const localTime = now.toLocaleTimeString([], {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  const mismatch = detected && detected !== timezone;

  async function save(next: string) {
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("profiles").update({ timezone: next }).eq("id", user.id);
    setSaving(false);
    if (error) {
      console.error("Failed to save timezone", error);
      return;
    }
    setEditing(false);
    onSaved?.(next);
    qc.invalidateQueries();
  }

  return (
    <div
      className={`rounded-2xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}
      aria-label="Reminder timezone"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Globe className="h-3.5 w-3.5" /> Reminder timezone
          </div>
          <div className="mt-1 truncate font-display text-sm font-semibold">{timezone}</div>
          <p className="text-xs text-muted-foreground">
            Local time now: <span className="tabular-nums">{localTime}</span>
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="tap-target inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Pencil className="h-3.5 w-3.5" /> Change
          </button>
        )}
      </div>

      {mismatch && !editing && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Your device says <strong className="text-foreground">{detected}</strong>.
          </span>
          <button
            onClick={() => save(detected)}
            disabled={saving}
            className="tap-target rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            Use device
          </button>
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="tap-target w-full rounded-xl border border-border bg-background px-3 py-3 text-sm focus:border-primary focus:outline-none"
          >
            {options.includes(value) ? null : <option value={value}>{value}</option>}
            {options.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={() => save(value)}
              disabled={saving || value === timezone}
              className="tap-target inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setValue(timezone);
              }}
              className="tap-target inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-card"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Changing your timezone re-plans upcoming reminders at their local times.
          </p>
        </div>
      )}
    </div>
  );
}
