import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { upsertCheckin, type Checkin } from "@/lib/checkins.functions";
import { trackEvent } from "@/lib/analytics";
import { hapticSuccess, hapticWarning } from "@/lib/haptics";
import { todayInBrowserZone } from "@/lib/day-key";

export type CheckinValues = {
  checked_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after save. Receives the server-normalized row when available. */
  onSaved: (row?: Checkin) => void;
  unitPref: "metric" | "imperial";
  /**
   * When provided, replaces the built-in server call — enables optimistic
   * updates. Return the server row so the sheet can reflect normalized
   * values (e.g. rounded weight) before it closes.
   */
  onSubmit?: (values: CheckinValues) => Promise<Checkin | void> | Checkin | void;
  initial?: {
    checked_at?: string;
    weight_kg?: number | null;
    body_fat_pct?: number | null;
    waist_cm?: number | null;
  };
};

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export function CheckinSheet({ open, onClose, onSaved, unitPref, onSubmit, initial }: Props) {
  const [date, setDate] = useState(initial?.checked_at ?? todayInBrowserZone());
  const [weight, setWeight] = useState<string>("");
  const [bf, setBf] = useState<string>("");
  const [waist, setWaist] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const w = initial?.weight_kg ?? null;
    const wa = initial?.waist_cm ?? null;
    setDate(initial?.checked_at ?? todayInBrowserZone());
    setWeight(
      w == null
        ? ""
        : String(
            unitPref === "imperial"
              ? Math.round((w / KG_PER_LB) * 10) / 10
              : Math.round(w * 10) / 10,
          ),
    );
    setBf(initial?.body_fat_pct == null ? "" : String(initial.body_fat_pct));
    setWaist(
      wa == null
        ? ""
        : String(
            unitPref === "imperial"
              ? Math.round((wa / CM_PER_IN) * 10) / 10
              : Math.round(wa * 10) / 10,
          ),
    );
    setErr(null);
  }, [open, initial, unitPref]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const weight_kg =
        weight === ""
          ? null
          : unitPref === "imperial"
            ? Number(weight) * KG_PER_LB
            : Number(weight);
      const waist_cm =
        waist === "" ? null : unitPref === "imperial" ? Number(waist) * CM_PER_IN : Number(waist);
      const body_fat_pct = bf === "" ? null : Number(bf);
      if (weight_kg == null && waist_cm == null && body_fat_pct == null) {
        throw new Error("Enter at least one value.");
      }
      const values: CheckinValues = { checked_at: date, weight_kg, waist_cm, body_fat_pct };
      let row: Checkin | void;
      if (onSubmit) {
        row = await onSubmit(values);
      } else {
        row = (await upsertCheckin({ data: values })) as Checkin;
      }
      // Reseed inputs from the server-normalized row so any transient
      // render between save and close shows the canonical values
      // (server may round waist_cm, weight_kg, or coerce nulls).
      if (row) {
        const nextDate = row.checked_at;
        const nextW = row.weight_kg;
        const nextWa = row.waist_cm;
        setDate(nextDate);
        setWeight(
          nextW == null
            ? ""
            : String(
                unitPref === "imperial"
                  ? Math.round((nextW / KG_PER_LB) * 10) / 10
                  : Math.round(nextW * 10) / 10,
              ),
        );
        setBf(row.body_fat_pct == null ? "" : String(row.body_fat_pct));
        setWaist(
          nextWa == null
            ? ""
            : String(
                unitPref === "imperial"
                  ? Math.round((nextWa / CM_PER_IN) * 10) / 10
                  : Math.round(nextWa * 10) / 10,
              ),
        );
      }
      trackEvent("checkin_completed", {
        has_weight: weight_kg != null,
        has_bf: body_fat_pct != null,
        has_waist: waist_cm != null,
      });
      void hapticSuccess();
      onSaved(row || undefined);
      onClose();
    } catch (e) {
      void hapticWarning();
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const weightUnit = unitPref === "imperial" ? "lb" : "kg";
  const waistUnit = unitPref === "imperial" ? "in" : "cm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-background p-6 shadow-2xl"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="checkin-title" className="font-display text-xl font-semibold">
              Weekly check-in
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              All fields optional — log what you have.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-target -mr-2 -mt-2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-card"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Date
            </span>
            <input
              type="date"
              value={date}
              max={todayInBrowserZone()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-base"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Weight ({weightUnit})
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={unitPref === "imperial" ? "e.g. 185.4" : "e.g. 84.1"}
              className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Body fat %
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={bf}
              onChange={(e) => setBf(e.target.value)}
              placeholder="e.g. 18.5"
              className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Waist ({waistUnit})
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              placeholder={unitPref === "imperial" ? "e.g. 34" : "e.g. 86"}
              className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-base"
            />
          </label>
        </div>

        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => {
              trackEvent("checkin_skipped");
              onClose();
            }}
            className="tap-target flex-1 rounded-xl border border-border bg-card px-4 text-sm font-semibold"
          >
            Not now
          </button>
          <button
            type="submit"
            disabled={saving}
            className="tap-target flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save check-in
          </button>
        </div>
      </form>
    </div>
  );
}
