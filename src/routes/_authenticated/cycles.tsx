import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RotateCcw, Play, Pause, Calendar, X } from "lucide-react";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayInBrowserZone } from "@/lib/day-key";

export const Route = createFileRoute("/_authenticated/cycles")({
  head: () => ({
    meta: [
      { title: "Cycle Tracker — DoseRoutine" },
      {
        name: "description",
        content:
          "Track on/off cycles for peptides, TRT support, and any protocol that pulses. Know the current phase and next transition date at a glance.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CyclesPage,
});

const PRESETS: Array<{ label: string; on: number; off: number }> = [
  { label: "5 on / 2 off", on: 5, off: 2 },
  { label: "8 wk on / 4 wk off", on: 56, off: 28 },
  { label: "12 wk on / 4 wk off", on: 84, off: 28 },
  { label: "4 wk on / 4 wk off", on: 28, off: 28 },
  { label: "6 wk on / 6 wk off", on: 42, off: 42 },
];

type Compound = {
  id: string;
  custom_name: string | null;
  cycle_on_days: number | null;
  cycle_off_days: number | null;
  start_date: string | null;
  active: boolean;
  compounds: { name: string; category: string | null } | null;
};

function computePhase(uc: Compound) {
  if (!uc.cycle_on_days || !uc.cycle_off_days || !uc.start_date) return null;
  const start = new Date(uc.start_date);
  const now = new Date();
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  if (days < 0) {
    return { phase: "pending" as const, dayInPhase: 0, phaseLen: 0, nextTransition: start };
  }
  const cycleLen = uc.cycle_on_days + uc.cycle_off_days;
  const posInCycle = days % cycleLen;
  const inOn = posInCycle < uc.cycle_on_days;
  const dayInPhase = inOn ? posInCycle + 1 : posInCycle - uc.cycle_on_days + 1;
  const phaseLen = inOn ? uc.cycle_on_days : uc.cycle_off_days;
  const daysUntilTransition = phaseLen - dayInPhase + 1;
  const next = new Date();
  next.setDate(next.getDate() + daysUntilTransition);
  next.setHours(0, 0, 0, 0);
  return {
    phase: inOn ? ("on" as const) : ("off" as const),
    dayInPhase,
    phaseLen,
    nextTransition: next,
  };
}

function CyclesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Compound | null>(null);

  const { data: compounds = [] } = useQuery({
    queryKey: ["cycles-compounds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_compounds")
        .select(
          "id, custom_name, cycle_on_days, cycle_off_days, start_date, active, compounds(name, category)",
        )
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Compound[];
    },
  });

  const cycled = compounds.filter((c) => c.cycle_on_days && c.cycle_off_days);
  const uncycled = compounds.filter((c) => !c.cycle_on_days || !c.cycle_off_days);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        to="/more"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Cycle Tracker</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage on/off cycles for peptides, PCT, and any protocol that pulses. Doses only schedule on
        active days.
      </p>

      {cycled.length > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Active cycles</h2>
          {cycled.map((c) => {
            const p = computePhase(c);
            if (!p) return null;
            const isOn = p.phase === "on";
            const pending = p.phase === "pending";
            return (
              <button
                key={c.id}
                onClick={() => setEditing(c)}
                className="tap-target block w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {c.custom_name || c.compounds?.name || "Compound"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.cycle_on_days}d on / {c.cycle_off_days}d off
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      pending
                        ? "bg-muted text-muted-foreground"
                        : isOn
                          ? "bg-primary/15 text-primary"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {pending ? (
                      <Calendar className="h-3 w-3" />
                    ) : isOn ? (
                      <Play className="h-3 w-3" />
                    ) : (
                      <Pause className="h-3 w-3" />
                    )}
                    {pending ? "Starts soon" : isOn ? "ON" : "OFF"}
                  </span>
                </div>

                {!pending && (
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>
                        Day {p.dayInPhase} of {p.phaseLen}
                      </span>
                      <span>Switches {p.nextTransition.toLocaleDateString()}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={isOn ? "h-full bg-primary" : "h-full bg-amber-500"}
                        style={{ width: `${(p.dayInPhase / p.phaseLen) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </section>
      )}

      {uncycled.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">Add a cycle</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These compounds run continuously. Tap to set an on/off schedule.
          </p>
          <div className="mt-3 space-y-2">
            {uncycled.map((c) => (
              <button
                key={c.id}
                onClick={() => setEditing(c)}
                className="tap-target flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition hover:border-primary/40"
              >
                <span className="truncate font-medium text-foreground">
                  {c.custom_name || c.compounds?.name || "Compound"}
                </span>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      )}

      {compounds.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Add compounds to your stack first, then set on/off cycles here.
        </div>
      )}

      <CycleEditor
        compound={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["cycles-compounds"] });
          qc.invalidateQueries({ queryKey: ["schedule-events"] });
        }}
      />

      <DisclaimerFooter />
    </div>
  );
}

function CycleEditor({
  compound,
  onClose,
  onSaved,
}: {
  compound: Compound | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [on, setOn] = useState<string>("");
  const [off, setOff] = useState<string>("");
  const [start, setStart] = useState<string>("");

  useEffect(() => {
    if (compound) {
      setOn(compound.cycle_on_days?.toString() ?? "");
      setOff(compound.cycle_off_days?.toString() ?? "");
      setStart(compound.start_date ?? todayInBrowserZone());
    }
  }, [compound]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!compound) return;
      const onN = parseInt(on, 10);
      const offN = parseInt(off, 10);
      if (!onN || !offN || onN < 1 || offN < 1) throw new Error("Enter valid on/off day counts");
      const { error } = await supabase
        .from("user_compounds")
        .update({
          cycle_on_days: onN,
          cycle_off_days: offN,
          start_date: start || todayInBrowserZone(),
        })
        .eq("id", compound.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setOn("");
      setOff("");
      setStart("");
      onSaved();
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!compound) return;
      const { error } = await supabase
        .from("user_compounds")
        .update({ cycle_on_days: null, cycle_off_days: null })
        .eq("id", compound.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setOn("");
      setOff("");
      setStart("");
      onSaved();
    },
  });

  return (
    <Sheet
      open={!!compound}
      onOpenChange={(o) => {
        if (!o) {
          setOn("");
          setOff("");
          setStart("");
          onClose();
        }
      }}
    >
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{compound?.custom_name || compound?.compounds?.name || "Cycle"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Quick presets</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setOn(String(p.on));
                    setOff(String(p.off));
                  }}
                  className="tap-target rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">ON days</label>
              <Input
                type="number"
                min={1}
                value={on}
                onChange={(e) => setOn(e.target.value)}
                placeholder="e.g. 56"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">OFF days</label>
              <Input
                type="number"
                min={1}
                value={off}
                onChange={(e) => setOff(e.target.value)}
                placeholder="e.g. 28"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Cycle start date</label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Day 1 of the first ON phase.</p>
          </div>

          {saveMutation.error && (
            <p className="text-xs text-destructive">{(saveMutation.error as Error).message}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1"
            >
              {saveMutation.isPending ? "Saving…" : "Save cycle"}
            </Button>
            {compound?.cycle_on_days && (
              <Button
                variant="outline"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
