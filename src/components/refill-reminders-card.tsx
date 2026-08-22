/**
 * Refill reminders for saved medications — including pills added through the
 * pill identifier, which write their bottle quantity into `vial_inventory`.
 *
 * Supply left is forecast from the saved prescription schedule (times per day
 * and which weekdays), so the reminder lands when the bottle actually runs
 * low rather than on a fixed interval. On the native app the reminder is also
 * scheduled as a local notification.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, PackageCheck, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  describeRefill,
  forecastRefill,
  refillReminderDate,
  sortByUrgency,
  type RefillForecast,
} from "@/lib/refill-reminders";
import { checkNativePermission, isNativeNotifications } from "@/lib/local-notifications";
import { RefillAlertsOnboarding } from "@/components/refill-alerts-onboarding";

type Row = {
  id: string;
  name: string;
  dosesRemaining: number | null;
  lowThreshold: number | null;
  forecast: RefillForecast;
  reminderAt: Date | null;
};

const STATUS_CLASS: Record<string, string> = {
  out: "bg-[color:var(--severity-avoid-bg)] text-[color:var(--severity-avoid)]",
  due: "bg-[color:var(--severity-caution-bg)] text-[color:var(--severity-caution)]",
  soon: "bg-[color:var(--severity-note-bg)] text-[color:var(--severity-note)]",
  ok: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

const STATUS_WORD: Record<string, string> = {
  out: "Out of stock",
  due: "Refill now",
  soon: "Running low soon",
  ok: "Stocked",
  unknown: "No quantity saved",
};

/**
 * Schedules on-device refill alerts. Uses a high, stable id range so it never
 * collides with dose alarm ids, and cancels its own previous set first.
 */
async function scheduleRefillAlarms(rows: Row[]): Promise<void> {
  if (!isNativeNotifications()) return;
  // Never prompt from a screen mount — iOS shows the permission dialog with no
  // context (Guideline 4.5.4). The user opts in through the onboarding card,
  // so here we only schedule when permission was already granted.
  if (!(await checkNativePermission())) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const idFor = (index: number) => 900_000 + index;
    const pending = await LocalNotifications.getPending();
    const mine = pending.notifications.filter((n) => n.id >= 900_000 && n.id < 901_000);
    if (mine.length) await LocalNotifications.cancel({ notifications: mine });

    const notifications = rows
      .map((row, index) =>
        row.reminderAt && row.forecast.status !== "unknown"
          ? {
              id: idFor(index),
              title: "Refill reminder",
              body: describeRefill(row.name, row.forecast),
              schedule: { at: row.reminderAt, allowWhileIdle: true },
            }
          : null,
      )
      .filter((n): n is NonNullable<typeof n> => n !== null)
      .slice(0, 20);
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch {
    /* notification scheduling is a nicety — never break the screen */
  }
}

export function RefillRemindersCard({ className }: { className?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refillQty, setRefillQty] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Not signed in");

      const { data: ucs, error: ucErr } = await supabase
        .from("user_compounds")
        .select(
          "id, custom_name, frequency, times_of_day, days_of_week, active, compound:compounds(name)",
        )
        .eq("user_id", uid)
        .eq("active", true);
      if (ucErr) throw ucErr;

      const ids = (ucs ?? []).map((u) => u.id);
      const { data: vials } = ids.length
        ? await supabase
            .from("vial_inventory")
            .select("user_compound_id, doses_remaining, low_threshold")
            .in("user_compound_id", ids)
        : { data: [] };

      const vialMap = new Map((vials ?? []).map((v) => [v.user_compound_id as string, v]));
      const now = new Date();

      const built: Row[] = (ucs ?? [])
        .map((uc) => {
          const vial = vialMap.get(uc.id);
          const input = {
            frequency: uc.frequency ?? null,
            timesOfDay: (uc.times_of_day as string[] | null) ?? null,
            daysOfWeek: (uc.days_of_week as number[] | null) ?? null,
            dosesRemaining: (vial?.doses_remaining as number | null) ?? null,
            lowThreshold: (vial?.low_threshold as number | null) ?? null,
          };
          return {
            id: uc.id,
            name: (uc.compound as { name?: string } | null)?.name ?? uc.custom_name ?? "Medication",
            dosesRemaining: input.dosesRemaining,
            lowThreshold: input.lowThreshold,
            forecast: forecastRefill(input, now),
            reminderAt: refillReminderDate(input, now),
          };
        })
        // Only medications with a saved bottle quantity can be forecast.
        .filter((row) => row.dosesRemaining != null);

      const sorted = sortByUrgency(built);
      setRows(sorted);
      void scheduleRefillAlarms(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load refill reminders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRefilled(row: Row) {
    const typed = Number(refillQty[row.id]);
    const quantity = Number.isFinite(typed) && typed > 0 ? typed : (row.dosesRemaining ?? 0);
    if (quantity <= 0) return;
    setSavingId(row.id);
    try {
      const { error: upErr } = await supabase
        .from("vial_inventory")
        .update({
          doses_remaining: quantity,
          total_doses: quantity,
          last_refilled_at: new Date().toISOString(),
        })
        .eq("user_compound_id", row.id);
      if (upErr) throw upErr;
      setRefillQty((prev) => ({ ...prev, [row.id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the refill");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className={className}>
      <div className="mb-3 flex items-center gap-2">
        <Pill className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Refill reminders
        </h2>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <RefillAlertsOnboarding className="mb-3" onGranted={() => void load()} />

      {loading && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-card p-5 text-sm text-muted-foreground"
        >
          Loading your refill forecast…
        </p>
      )}

      {!loading && error && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
          No refill forecasts yet. Identify a pill or add a bottle quantity to a stack item and
          we&apos;ll remind you before you run out.
        </p>
      )}

      {!loading && rows.length > 0 && (
        <ul data-testid="refill-list" className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} data-testid="refill-row" className="rounded-2xl bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">{row.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {describeRefill("Supply", row.forecast).replace("Supply — ", "")}
                  </p>
                  {row.reminderAt && row.forecast.status !== "unknown" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reminder set for {row.reminderAt.toLocaleDateString()} at{" "}
                      {row.reminderAt.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    STATUS_CLASS[row.forecast.status] ?? STATUS_CLASS["ok"]
                  }`}
                >
                  {STATUS_WORD[row.forecast.status]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="h-10 w-28"
                  placeholder="Doses"
                  aria-label={`New bottle quantity for ${row.name}`}
                  value={refillQty[row.id] ?? ""}
                  onChange={(e) => setRefillQty((prev) => ({ ...prev, [row.id]: e.target.value }))}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={savingId === row.id}
                  onClick={() => void markRefilled(row)}
                >
                  {savingId === row.id ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <PackageCheck className="mr-1.5 h-4 w-4" />
                  )}
                  Mark refilled
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isNativeNotifications() && rows.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Install the app on your phone to get these refill alerts as push notifications.
        </p>
      )}
    </section>
  );
}
