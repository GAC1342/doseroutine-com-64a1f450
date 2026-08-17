import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, DollarSign, TrendingUp, Package, Save } from "lucide-react";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/costs")({
  head: () => ({
    meta: [
      { title: "Cost Tracker — DoseRoutine" },
      {
        name: "description",
        content:
          "Track how much your stack costs per dose, per month, and per year. See spend by compound and monitor your burn rate.",
      },
      { property: "og:title", content: "Stack Cost Tracker" },
      {
        property: "og:description",
        content: "See exactly what your protocol costs per dose, month, and year.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CostsPage,
});

type Row = {
  ucId: string;
  name: string;
  dosesPerWeek: number;
  costPerVial: number | null;
  totalDoses: number | null;
  dosesRemaining: number | null;
  currency: string;
  costPerDose: number | null;
  monthly: number | null;
  yearly: number | null;
};

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

function fmt(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function dosesPerWeek(uc: {
  frequency: string | null;
  times_of_day: string[] | null;
  days_of_week: number[] | null;
}): number {
  const perDay = Math.max(1, uc.times_of_day?.length ?? 1);
  const freq = (uc.frequency || "daily").toLowerCase();
  if (freq === "daily") return perDay * 7;
  if (freq === "weekly") return (uc.days_of_week?.length ?? 1) * perDay;
  if (freq === "twice_weekly" || freq === "2x_weekly") return 2 * perDay;
  if (freq === "eod" || freq === "every_other_day") return perDay * 3.5;
  if (freq === "custom") return (uc.days_of_week?.length ?? 7) * perDay;
  return perDay * 7;
}

function CostsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["costs-overview"],
    queryFn: async (): Promise<Row[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: ucs } = await supabase
        .from("user_compounds")
        .select(
          "id, custom_name, frequency, times_of_day, days_of_week, active, compound_id, compounds(name)",
        )
        .eq("user_id", user.id)
        .eq("active", true);
      if (!ucs) return [];
      const ids = ucs.map((u) => u.id);
      const { data: vials } = ids.length
        ? await supabase.from("vial_inventory").select("*").in("user_compound_id", ids)
        : { data: [] as any[] };
      const vialMap = new Map((vials ?? []).map((v: any) => [v.user_compound_id, v]));

      return ucs.map((u: any) => {
        const v = vialMap.get(u.id);
        const dpw = dosesPerWeek(u);
        const total = v?.total_doses ?? null;
        const cost = v?.cost_per_vial ?? null;
        const costPerDose = cost && total && total > 0 ? Number(cost) / Number(total) : null;
        const monthly = costPerDose != null ? costPerDose * dpw * (52 / 12) : null;
        const yearly = costPerDose != null ? costPerDose * dpw * 52 : null;
        return {
          ucId: u.id,
          name: u.custom_name || u.compounds?.name || "Compound",
          dosesPerWeek: dpw,
          costPerVial: cost != null ? Number(cost) : null,
          totalDoses: total != null ? Number(total) : null,
          dosesRemaining: v?.doses_remaining != null ? Number(v.doses_remaining) : null,
          currency: v?.currency || "USD",
          costPerDose,
          monthly,
          yearly,
        };
      });
    },
  });

  const totals = useMemo(() => {
    const rows = data ?? [];
    const primary = rows.find((r) => r.currency)?.currency ?? "USD";
    const mono = rows.every((r) => r.currency === primary);
    const monthly = rows.reduce((s, r) => s + (r.monthly ?? 0), 0);
    const yearly = rows.reduce((s, r) => s + (r.yearly ?? 0), 0);
    return { monthly, yearly, currency: primary, mono };
  }, [data]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        to="/more"
        className="tap-target inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> More
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Cost Tracker</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter what each vial costs and DoseRoutine calculates your cost per dose, monthly burn, and
        yearly spend.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card className="rounded-2xl border-border p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Monthly
          </div>
          <div className="mt-1 font-display text-2xl font-semibold">
            {fmt(totals.monthly, totals.currency)}
            {!totals.mono && <span className="ml-1 text-xs text-muted-foreground">*</span>}
          </div>
        </Card>
        <Card className="rounded-2xl border-border p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" /> Yearly
          </div>
          <div className="mt-1 font-display text-2xl font-semibold">
            {fmt(totals.yearly, totals.currency)}
            {!totals.mono && <span className="ml-1 text-xs text-muted-foreground">*</span>}
          </div>
        </Card>
      </div>
      {!totals.mono && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          * Multiple currencies detected — totals shown in {totals.currency} without conversion.
        </p>
      )}

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold">Per compound</h2>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Add compounds to your stack first, then set doses-per-vial and price to see costs here.
          </p>
        )}
        <div className="mt-3 space-y-3">
          {data?.map((r) => (
            <CostRow
              key={r.ucId}
              row={r}
              onSaved={() => qc.invalidateQueries({ queryKey: ["costs-overview"] })}
            />
          ))}
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
}

function CostRow({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [cost, setCost] = useState<string>(row.costPerVial != null ? String(row.costPerVial) : "");
  const [total, setTotal] = useState<string>(row.totalDoses != null ? String(row.totalDoses) : "");
  const [currency, setCurrency] = useState<string>(row.currency);

  const save = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const costNum = cost === "" ? null : Number(cost);
      const totalNum = total === "" ? null : Number(total);
      const { data: existing } = await supabase
        .from("vial_inventory")
        .select("id")
        .eq("user_compound_id", row.ucId)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("vial_inventory")
          .update({ cost_per_vial: costNum, total_doses: totalNum ?? 0, currency })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vial_inventory").insert({
          user_compound_id: row.ucId,
          cost_per_vial: costNum,
          total_doses: totalNum ?? 0,
          doses_remaining: totalNum ?? 0,
          currency,
        });
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
  });

  const costPerDose = cost && total && Number(total) > 0 ? Number(cost) / Number(total) : null;
  const dpw = row.dosesPerWeek;
  const monthly = costPerDose != null ? costPerDose * dpw * (52 / 12) : null;

  return (
    <Card className="rounded-2xl border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">
            {dpw.toFixed(dpw % 1 === 0 ? 0 : 1)} doses/week
            {row.dosesRemaining != null && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Package className="h-3 w-3" /> {row.dosesRemaining} left
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm">
          {monthly != null ? (
            <>
              <div className="font-semibold">
                {fmt(monthly, currency)}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </div>
              {costPerDose != null && (
                <div className="text-xs text-muted-foreground">
                  {fmt(costPerDose, currency)}/dose
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground">Enter cost →</div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="text-xs">
          <span className="mb-1 block text-muted-foreground">Cost / vial</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted-foreground">Doses / vial</span>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted-foreground">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="tap-target mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {save.isPending ? "Saving…" : save.isSuccess ? "Saved" : "Save"}
      </button>
    </Card>
  );
}
