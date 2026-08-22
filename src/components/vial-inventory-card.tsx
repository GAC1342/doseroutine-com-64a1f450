import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Loader2, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VialInventory = {
  id: string;
  user_compound_id: string;
  doses_remaining: number;
  total_doses: number | null;
  low_threshold: number;
  last_refilled_at: string | null;
  notes: string | null;
};

export function VialInventoryCard({ userCompoundId }: { userCompoundId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["vial-inventory", userCompoundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vial_inventory")
        .select("*, user_compound:user_compounds(times_of_day, frequency, days_of_week)")
        .eq("user_compound_id", userCompoundId)
        .maybeSingle();
      if (error) throw error;
      return data as
        | (VialInventory & {
            user_compound?: {
              times_of_day: string[] | null;
              frequency: string | null;
              days_of_week: number[] | null;
            } | null;
          })
        | null;
    },
  });

  const [remaining, setRemaining] = useState<string>("");
  const [total, setTotal] = useState<string>("");
  const [threshold, setThreshold] = useState<string>("3");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (data) {
      setRemaining(String(data.doses_remaining));
      setTotal(data.total_doses != null ? String(data.total_doses) : "");
      setThreshold(String(data.low_threshold));
    }
  }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(refill = false) {
    setSaving(true);
    setSavedOk(false);
    const doses = parseFloat(remaining) || 0;
    const tot = total ? parseFloat(total) : null;
    const thr = parseFloat(threshold) || 0;
    const payload = {
      user_compound_id: userCompoundId,
      doses_remaining: refill && tot != null ? tot : doses,
      total_doses: tot,
      low_threshold: thr,
      last_refilled_at: refill ? new Date().toISOString() : (data?.last_refilled_at ?? null),
    };
    const { error } = await supabase
      .from("vial_inventory")
      .upsert(payload, { onConflict: "user_compound_id" });
    setSaving(false);
    if (!error) {
      setSavedOk(true);
      qc.invalidateQueries({ queryKey: ["vial-inventory", userCompoundId] });
      qc.invalidateQueries({ queryKey: ["vial-inventory-low"] });
      setTimeout(() => setSavedOk(false), 1500);
    }
  }

  const isLow = data && data.doses_remaining <= data.low_threshold && data.doses_remaining >= 0;

  // Forecast days remaining
  const uc = data?.user_compound;
  const perDay = uc ? Math.max(1, (uc.times_of_day ?? [null]).length) : 1;
  const freq = (uc?.frequency ?? "daily").toLowerCase();
  let rate = perDay;
  if (freq.includes("weekly")) rate = (perDay * Math.max(1, (uc?.days_of_week ?? [1]).length)) / 7;
  else if (freq.includes("weekdays")) rate = (perDay * 5) / 7;
  else if (freq === "custom" && uc?.days_of_week?.length)
    rate = (perDay * uc.days_of_week.length) / 7;
  const daysLeft = data && rate > 0 ? data.doses_remaining / rate : null;
  const runOutDate = daysLeft != null ? new Date(Date.now() + daysLeft * 86400000) : null;

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Package className="h-4 w-4 text-primary" />
          Vial / bottle inventory
        </div>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {isLow && (
          <span className="rounded-full bg-[color:var(--caution)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--caution)]">
            Reorder soon
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <NumField label="Doses left" value={remaining} onChange={setRemaining} />
        <NumField label="Vial holds" value={total} onChange={setTotal} placeholder="opt" />
        <NumField label="Alert at" value={threshold} onChange={setThreshold} />
      </div>

      {data && data.doses_remaining > 0 && daysLeft != null && (
        <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px]">
          <span className="font-medium text-foreground">
            ~{Math.max(1, Math.round(daysLeft))} days left
          </span>
          {runOutDate && (
            <span className="text-muted-foreground">
              {" "}
              · runs out around{" "}
              {runOutDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )}

      {data?.last_refilled_at && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Last refilled {new Date(data.last_refilled_at).toLocaleDateString()}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={saving}
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/60 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="mx-auto h-3 w-3 animate-spin" />
          ) : savedOk ? (
            <span className="flex items-center justify-center gap-1 text-primary">
              <Check className="h-3 w-3" /> Saved
            </span>
          ) : (
            "Save inventory"
          )}
        </button>
        {total && (
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" /> Mark refilled
          </button>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Each dose you mark taken automatically subtracts 1.
      </p>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}
