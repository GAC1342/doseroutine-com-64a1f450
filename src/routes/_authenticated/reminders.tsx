import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallSheet } from "@/components/paywall-sheet";
import { ArrowLeft, Bell, Loader2, Mail, Smartphone } from "lucide-react";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
} from "@/lib/push";
import { savePushSubscription, removePushSubscription, sendTestPush } from "@/lib/push.functions";
import {
  isNativeNotifications,
  checkNativePermission,
  cancelAllDoseAlarms,
  canScheduleExactAlarms,
  requestExactAlarms,
} from "@/lib/local-notifications";
import {
  syncAllAlarms,
  nativeAlarmsPreferred,
  requestAlarmSync,
  NATIVE_ALARMS_PREF_KEY,
} from "@/lib/alarm-sync";

import { WorkoutReminderSettings } from "@/components/workout-reminder-settings";
import { TimezoneCard } from "@/components/timezone-card";
import { LoggingReminderSettings } from "@/components/logging-reminder-settings";
import { MealTimingRulesPanel } from "@/components/meal-timing-rules";
import { RefillRemindersCard } from "@/components/refill-reminders-card";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/reminders")({
  errorComponent: routeErrorComponent("reminders"),
  head: () => ({
    meta: [
      { title: "Reminders — DoseRoutine" },
      { name: "description", content: "Set per-compound reminders, lead times, and quiet hours." },
    ],
  }),
  component: RemindersPage,
});

type UC = Database["public"]["Tables"]["user_compounds"]["Row"] & {
  compound: Database["public"]["Tables"]["compounds"]["Row"] | null;
};
type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const LEAD_OPTIONS = [0, 5, 10, 15, 30, 60];

function RemindersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ucs, setUcs] = useState<UC[]>([]);
  const [reminders, setReminders] = useState<Record<string, Reminder | null>>({});
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [paywall, setPaywall] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [nativeEnabled, setNativeEnabled] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [nativeCount, setNativeCount] = useState(0);
  const [exactOk, setExactOk] = useState(true);
  const savePush = useServerFn(savePushSubscription);
  const removePush = useServerFn(removePushSubscription);
  const testPush = useServerFn(sendTestPush);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const { data: subscription, isLoading: subLoading } = useSubscription();

  async function refreshPushState() {
    if (!isPushSupported()) return;
    const sub = await getExistingSubscription();
    setPushEnabled(!!sub && Notification.permission === "granted");
  }

  async function togglePush(next: boolean) {
    setPushError(null);
    setPushBusy(true);
    try {
      if (next) {
        const sub = await subscribeToPush();
        if (!sub) {
          setPushError(
            Notification.permission === "denied"
              ? "Notifications are blocked in your browser settings."
              : "Couldn't enable push on this device.",
          );
          setPushEnabled(false);
          return;
        }
        await savePush({
          data: { ...sub, userAgent: navigator.userAgent },
        });
        setPushEnabled(true);
      } else {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await removePush({ data: { endpoint } });
        setPushEnabled(false);
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPushBusy(false);
    }
  }

  async function load() {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    const [{ data: ucData }, { data: remData }, { data: profData }] = await Promise.all([
      supabase
        .from("user_compounds")
        .select("*, compound:compounds(*)")
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabase.from("reminders").select("*").eq("channel", "email"),
      supabase
        .from("profiles")
        .select("quiet_hours_start, quiet_hours_end, notify_email, timezone, daily_alert_limit")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    setUcs((ucData as UC[] | null) ?? []);
    const map: Record<string, Reminder | null> = {};
    (remData ?? []).forEach((r) => {
      if (r.user_compound_id) map[r.user_compound_id] = r;
    });
    setReminders(map);
    setProfile(profData ?? {});
    setLoading(false);
  }

  async function refreshNativeState() {
    // Never let a native bridge rejection become an unhandled rejection: the
    // screen still works with notifications simply reported as unavailable.
    try {
      const avail = isNativeNotifications();
      setNativeAvailable(avail);
      if (!avail) return;
      const granted = await checkNativePermission();
      setNativeEnabled(granted && nativeAlarmsPreferred());
      setExactOk(await canScheduleExactAlarms());
    } catch {
      setNativeEnabled(false);
      setExactOk(false);
    }
  }

  const doSyncNativeAlarms = useCallback(async () => {
    if (!nativeAvailable || !nativeEnabled) return;
    setNativeBusy(true);
    try {
      const n = await syncAllAlarms();
      setNativeCount(n < 0 ? 0 : n);
    } finally {
      setNativeBusy(false);
    }
  }, [nativeAvailable, nativeEnabled]);

  async function toggleNative(next: boolean) {
    setNativeBusy(true);
    try {
      if (next) {
        const { requestNativePermission } = await import("@/lib/local-notifications");
        const granted = await requestNativePermission();
        if (!granted) {
          setNativeEnabled(false);
          return;
        }
        localStorage.setItem(NATIVE_ALARMS_PREF_KEY, "on");
        setNativeEnabled(true);
        setExactOk(await canScheduleExactAlarms());
      } else {
        localStorage.setItem(NATIVE_ALARMS_PREF_KEY, "off");
        await cancelAllDoseAlarms();
        setNativeEnabled(false);
        setNativeCount(0);
      }
    } finally {
      setNativeBusy(false);
    }
  }

  useEffect(() => {
    if (subLoading) return;
    if (!subscription?.isPaid) {
      setPaywall(true);
      setLoading(false);
      return;
    }
    load();
    refreshPushState();
    void refreshNativeState();
  }, [subLoading, subscription?.isPaid]);

  useEffect(() => {
    if (loading) return;
    void doSyncNativeAlarms();
  }, [loading, doSyncNativeAlarms]);

  async function upsertReminder(uc: UC, patch: { enabled?: boolean; lead_time_minutes?: number }) {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    const existing = reminders[uc.id];
    const nextEnabled = patch.enabled ?? existing?.enabled ?? true;
    const nextLead = patch.lead_time_minutes ?? existing?.lead_time_minutes ?? 0;
    const optimistic = {
      id: existing?.id ?? `optimistic-${uc.id}`,
      user_id: user.id,
      user_compound_id: uc.id,
      channel: "email" as const,
      enabled: nextEnabled,
      lead_time_minutes: nextLead,
    } as Reminder;
    // Optimistic update
    const prev = existing;
    setReminders((p) => ({ ...p, [uc.id]: optimistic }));
    setSaving(true);
    const payload = {
      ...(existing?.id ? { id: existing.id } : {}),
      user_id: user.id,
      user_compound_id: uc.id,
      channel: "email" as const,
      enabled: nextEnabled,
      lead_time_minutes: nextLead,
    };
    const { data, error } = await supabase
      .from("reminders")
      .upsert(payload, { onConflict: "id" })
      .select()
      .maybeSingle();

    setSaving(false);
    if (error) {
      // Rollback
      setReminders((p) => ({ ...p, [uc.id]: prev ?? null }));
      return;
    }
    if (data) {
      const row = data as Reminder;
      // Guard: only attach the server row to this compound's slot if its
      // identity fields match. A mismatched row would silently overwrite
      // the wrong compound's reminder in the map.
      if (row.user_compound_id === uc.id && row.channel === "email") {
        setReminders((p) => ({ ...p, [uc.id]: row }));
      } else {
        // Identity mismatch — roll back to the pre-mutation value and
        // let the next full refetch resolve state.
        setReminders((p) => ({ ...p, [uc.id]: prev ?? null }));
      }
    }
    // Re-arm device alarms right away so the change is felt tonight, not
    // after the next app restart.
    requestAlarmSync();
  }

  async function saveProfile(patch: Partial<Profile>) {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    setProfile((p) => ({ ...p, ...patch }));
    await supabase.from("profiles").update(patch).eq("id", user.id);
  }

  if (paywall) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link
          to="/more"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Reminders</h1>
        <PaywallSheet feature="reminders" onClose={() => setPaywall(false)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-10">
        <p role="status" className="text-sm text-muted-foreground">
          Loading your reminders…
        </p>
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        to="/more"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Reminders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Get an email nudge for each scheduled dose. Quiet hours pause all reminders.
      </p>

      <section className="mt-8 rounded-2xl bg-card p-5">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Global settings
          </h2>
        </div>
        <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl py-1.5">
          <span className="text-base font-medium">Email reminders</span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-primary"
            checked={profile.notify_email ?? true}
            onChange={(e) => saveProfile({ notify_email: e.target.checked })}
          />
        </label>
        <label className="mt-2 flex cursor-pointer items-center justify-between rounded-xl py-1.5">
          <span className="flex items-center gap-2 text-base font-medium">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            Push on this device
            {pushBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-primary disabled:opacity-40"
            disabled={!isPushSupported() || pushBusy}
            checked={pushEnabled}
            onChange={(e) => togglePush(e.target.checked)}
          />
        </label>
        {!isPushSupported() && (
          <p className="mt-1 text-xs text-muted-foreground">
            Your browser doesn't support push. On iPhone, add DoseRoutine to the Home Screen first.
          </p>
        )}
        {pushError && (
          <p className="mt-1 text-xs text-[color:var(--severity-avoid)]">{pushError}</p>
        )}
        {pushEnabled && (
          <div className="mt-2">
            <button
              type="button"
              disabled={testBusy}
              onClick={async () => {
                setTestBusy(true);
                setTestMsg(null);
                try {
                  const r = await testPush({ data: undefined as never });
                  setTestMsg(r.message);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
                } catch (e: any) {
                  setTestMsg(e?.message || "Test failed.");
                } finally {
                  setTestBusy(false);
                }
              }}
              className="tap-target rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
            >
              {testBusy ? "Sending…" : "Send test notification"}
            </button>
            {testMsg && <p className="mt-1 text-xs text-muted-foreground">{testMsg}</p>}
          </div>
        )}
        {nativeAvailable && (
          <>
            <label className="mt-2 flex cursor-pointer items-center justify-between rounded-xl py-1.5">
              <span className="flex items-center gap-2 text-base font-medium">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Native alarms (installed app)
                {nativeBusy && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </span>
              <input
                type="checkbox"
                className="h-6 w-6 accent-primary disabled:opacity-40"
                disabled={nativeBusy}
                checked={nativeEnabled}
                onChange={(e) => toggleNative(e.target.checked)}
              />
            </label>
            {nativeEnabled && (
              <p className="mt-1 text-xs text-muted-foreground">
                {nativeCount} on-device alarm{nativeCount === 1 ? "" : "s"} scheduled. Fires even
                offline.
              </p>
            )}
            {nativeEnabled && !exactOk && (
              <div className="mt-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs">
                <p className="font-medium">Alarms may arrive late on this phone</p>
                <p className="mt-1 text-muted-foreground">
                  Android is holding your reminders for battery saving. Allow exact alarms so doses
                  fire on the minute.
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground"
                  onClick={async () => {
                    await requestExactAlarms();
                    setExactOk(await canScheduleExactAlarms());
                    void doSyncNativeAlarms();
                  }}
                >
                  Allow exact alarms
                </button>
              </div>
            )}
          </>
        )}
        <div className="mt-4">
          <TimezoneCard
            timezone={profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}
            onSaved={(tz) => setProfile((p) => ({ ...p, timezone: tz }))}
            compact
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Lead times, quiet hours, and workout nudges are all evaluated in this timezone.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Quiet hours start
            <input
              type="time"
              value={profile.quiet_hours_start ?? ""}
              onChange={(e) => saveProfile({ quiet_hours_start: e.target.value || null })}
              className="tap-target rounded-xl border border-border bg-background px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            Quiet hours end
            <input
              type="time"
              value={profile.quiet_hours_end ?? ""}
              onChange={(e) => saveProfile({ quiet_hours_end: e.target.value || null })}
              className="tap-target rounded-xl border border-border bg-background px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-1.5 text-sm text-muted-foreground">
          Daily alert limit
          <select
            value={String(profile.daily_alert_limit ?? 3)}
            onChange={(e) => saveProfile({ daily_alert_limit: Number(e.target.value) })}
            className="tap-target rounded-xl border border-border bg-background px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none"
          >
            <option value="3">3 alerts a day (recommended)</option>
            <option value="5">5 alerts a day</option>
            <option value="10">10 alerts a day</option>
            <option value="0">No limit</option>
          </select>
          <span className="text-xs text-muted-foreground">
            Caps how many times a day your phone actually buzzes across doses, workouts, and meals.
            Doses come first, then workouts, then meals. Anything over the limit still shows up in
            your notification inbox — it just stays quiet.
          </span>
        </label>
      </section>

      <div className="mt-6">
        <LoggingReminderSettings className="mb-4" />
        <MealTimingRulesPanel className="mb-4" />

        <WorkoutReminderSettings />

        <RefillRemindersCard className="mt-6" />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Per compound
          </h2>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        {ucs.length === 0 ? (
          <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
            Add compounds to your stack to configure reminders.
          </p>
        ) : (
          <ul className="space-y-2">
            {ucs.map((uc) => {
              const rem = reminders[uc.id];
              const enabled = rem?.enabled ?? false;
              const lead = rem?.lead_time_minutes ?? 0;
              return (
                <li key={uc.id} className="rounded-2xl bg-card p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-medium">
                        {uc.compound?.name ?? "Compound"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(uc.times_of_day as string[] | null)?.join(", ") || "No times set"}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="h-6 w-6 accent-primary"
                      checked={enabled}
                      onChange={(e) => upsertReminder(uc, { enabled: e.target.checked })}
                    />
                  </label>
                  {enabled && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {LEAD_OPTIONS.map((m) => (
                        <button
                          key={m}
                          onClick={() => upsertReminder(uc, { lead_time_minutes: m })}
                          className={`tap-target rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                            lead === m
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          {m === 0 ? "On time" : `${m} min before`}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
