import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart as LineChartIcon,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Weight,
  Dumbbell,
  Ruler,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";

type Row = {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  bench_kg: number | null;
  squat_kg: number | null;
  deadlift_kg: number | null;
  ohp_kg: number | null;
  notes: string | null;
};

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export function BodyMetricsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["body-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_metrics")
        .select("*")
        .order("measured_at", { ascending: false })
        .limit(90);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const latest = rows[0];
  const previous = rows[1];

  return (
    <div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Log measurement
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>New measurement</SheetTitle>
          </SheetHeader>
          <LogForm
            onDone={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["body-metrics"] });
            }}
          />
        </SheetContent>
      </Sheet>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && rows.length === 0 && (
        <Card className="mt-6 rounded-2xl border-dashed border-border p-8 text-center">
          <LineChartIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No measurements yet. Log your first one to start a trend line.
          </p>
        </Card>
      )}

      {latest && (
        <div className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Latest
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Weight className="h-4 w-4" />}
              label="Weight"
              value={latest.weight_kg}
              unit="kg"
              prev={previous?.weight_kg}
            />
            <StatCard
              label="Body fat"
              value={latest.body_fat_pct}
              unit="%"
              prev={previous?.body_fat_pct}
              invert
            />
            <StatCard
              icon={<Ruler className="h-4 w-4" />}
              label="Waist"
              value={latest.waist_cm}
              unit="cm"
              prev={previous?.waist_cm}
              invert
            />
            <StatCard label="Chest" value={latest.chest_cm} unit="cm" prev={previous?.chest_cm} />
            <StatCard
              icon={<Dumbbell className="h-4 w-4" />}
              label="Bench"
              value={latest.bench_kg}
              unit="kg"
              prev={previous?.bench_kg}
            />
            <StatCard label="Squat" value={latest.squat_kg} unit="kg" prev={previous?.squat_kg} />
            <StatCard
              label="Deadlift"
              value={latest.deadlift_kg}
              unit="kg"
              prev={previous?.deadlift_kg}
            />
            <StatCard label="OHP" value={latest.ohp_kg} unit="kg" prev={previous?.ohp_kg} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Best-lift numbers here are the ones you enter by hand. Personal records calculated from
            logged sessions live on the Workouts tab.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            History
          </h2>
          <div className="mt-3 space-y-2">
            {rows.map((r) => (
              <Card key={r.id} className="border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {new Date(r.measured_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[r.weight_kg && `${r.weight_kg}kg`, r.body_fat_pct && `${r.body_fat_pct}%`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  prev,
  invert,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number | null;
  unit: string;
  prev?: number | null;
  invert?: boolean;
}) {
  if (value == null) {
    return (
      <Card className="border-border p-3 opacity-60">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-lg font-semibold text-muted-foreground">—</div>
      </Card>
    );
  }
  const delta = prev != null ? value - prev : null;
  const trendUp = delta != null && delta > 0;
  const trendDown = delta != null && delta < 0;
  const good = invert ? trendDown : trendUp;
  return (
    <Card className="border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      {delta != null && delta !== 0 && (
        <div
          className={`mt-0.5 flex items-center gap-0.5 text-[10px] ${good ? "text-emerald-600" : "text-orange-600"}`}
        >
          {trendUp ? (
            <TrendingUp className="h-3 w-3" />
          ) : trendDown ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {Math.abs(delta).toFixed(1)}
        </div>
      )}
    </Card>
  );
}

function LogForm({ onDone }: { onDone: () => void }) {
  const [unit, setUnit] = useState<"metric" | "imperial">("imperial");
  const [form, setForm] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const toKg = (v: string) =>
        v ? (unit === "imperial" ? Number(v) * KG_PER_LB : Number(v)) : null;
      const toCm = (v: string) =>
        v ? (unit === "imperial" ? Number(v) * CM_PER_IN : Number(v)) : null;
      const payload = {
        user_id: userData.user.id,
        weight_kg: toKg(form.weight ?? ""),
        body_fat_pct: form.bf ? Number(form.bf) : null,
        waist_cm: toCm(form.waist ?? ""),
        chest_cm: toCm(form.chest ?? ""),
        arm_cm: toCm(form.arm ?? ""),
        thigh_cm: toCm(form.thigh ?? ""),
        bench_kg: toKg(form.bench ?? ""),
        squat_kg: toKg(form.squat ?? ""),
        deadlift_kg: toKg(form.dl ?? ""),
        ohp_kg: toKg(form.ohp ?? ""),
        notes: notes || null,
      };
      const { error } = await supabase.from("body_metrics").insert(payload);
      if (error) throw error;
    },
    onSuccess: onDone,
  });

  const wLabel = unit === "imperial" ? "lb" : "kg";
  const lLabel = unit === "imperial" ? "in" : "cm";

  return (
    <div className="mt-4 space-y-4 pb-8">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUnit("imperial")}
          className={`flex-1 rounded-xl py-2 text-sm font-medium ${unit === "imperial" ? "bg-primary text-primary-foreground" : "border border-border"}`}
        >
          lb / in
        </button>
        <button
          type="button"
          onClick={() => setUnit("metric")}
          className={`flex-1 rounded-xl py-2 text-sm font-medium ${unit === "metric" ? "bg-primary text-primary-foreground" : "border border-border"}`}
        >
          kg / cm
        </button>
      </div>

      <Section title="Body">
        <Field label={`Weight (${wLabel})`} k="weight" form={form} setForm={setForm} />
        <Field label="Body fat (%)" k="bf" form={form} setForm={setForm} />
        <Field label={`Waist (${lLabel})`} k="waist" form={form} setForm={setForm} />
        <Field label={`Chest (${lLabel})`} k="chest" form={form} setForm={setForm} />
        <Field label={`Arm (${lLabel})`} k="arm" form={form} setForm={setForm} />
        <Field label={`Thigh (${lLabel})`} k="thigh" form={form} setForm={setForm} />
      </Section>

      <Section title="Lifts (1RM)">
        <Field label={`Bench (${wLabel})`} k="bench" form={form} setForm={setForm} />
        <Field label={`Squat (${wLabel})`} k="squat" form={form} setForm={setForm} />
        <Field label={`Deadlift (${wLabel})`} k="dl" form={form} setForm={setForm} />
        <Field label={`OHP (${wLabel})`} k="ohp" form={form} setForm={setForm} />
      </Section>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
          placeholder="How you felt, sleep, etc."
        />
      </div>

      {mutation.error && (
        <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {mutation.isPending ? "Saving…" : "Save measurement"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  k,
  form,
  setForm,
}: {
  label: string;
  k: string;
  form: Record<string, string>;
  setForm: (v: Record<string, string>) => void;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={form[k] ?? ""}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="tap-target mt-0.5 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
