import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  ChevronRight,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { todayInBrowserZone } from "@/lib/day-key";
import { Card } from "@/components/ui/card";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/labs")({
  errorComponent: routeErrorComponent("labs"),
  head: () => ({
    meta: [
      { title: "Blood Work — DoseRoutine" },
      {
        name: "description",
        content:
          "Track your lab results over time. Testosterone, estradiol, hematocrit, lipids, HbA1c, and more with reference-range flags.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LabsPage,
});

type Marker = {
  slug: string;
  name: string;
  category: string;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  ref_low_male: number | null;
  ref_high_male: number | null;
  ref_low_female: number | null;
  ref_high_female: number | null;
  sort_order: number;
};

type Panel = { id: string; drawn_on: string; lab_name: string | null; notes: string | null };
type Result = {
  id: string;
  panel_id: string;
  marker_slug: string;
  value: number;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  created_at: string;
};

function rangeFor(m: Marker, sex: "male" | "female" | "any") {
  if (sex === "male" && m.ref_low_male != null)
    return { low: m.ref_low_male, high: m.ref_high_male };
  if (sex === "female" && m.ref_low_female != null)
    return { low: m.ref_low_female, high: m.ref_high_female };
  return { low: m.ref_low, high: m.ref_high };
}

function flag(value: number, low: number | null, high: number | null) {
  if (low != null && value < low) return "low";
  if (high != null && value > high) return "high";
  return "ok";
}

function LabsPage() {
  const qc = useQueryClient();
  const [sex, setSex] = useState<"male" | "female" | "any">("male");
  const [addOpen, setAddOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState<Panel | null>(null);

  const markers = useQuery({
    queryKey: ["lab_markers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_markers").select("*").order("sort_order");
      if (error) throw error;
      return data as Marker[];
    },
  });

  const panels = useQuery({
    queryKey: ["lab_panels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_panels")
        .select("*")
        .order("drawn_on", { ascending: false });
      if (error) throw error;
      return data as Panel[];
    },
  });

  const results = useQuery({
    queryKey: ["lab_results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_results")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Result[];
    },
  });

  const byMarker = useMemo(() => {
    const map = new Map<string, Result[]>();
    (results.data ?? []).forEach((r) => {
      if (!map.has(r.marker_slug)) map.set(r.marker_slug, []);
      map.get(r.marker_slug)!.push(r);
    });
    return map;
  }, [results.data]);

  const grouped = useMemo(() => {
    const g = new Map<string, Marker[]>();
    (markers.data ?? []).forEach((m) => {
      if (!g.has(m.category)) g.set(m.category, []);
      g.get(m.category)!.push(m);
    });
    return g;
  }, [markers.data]);

  const deletePanel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_panels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab_panels"] });
      qc.invalidateQueries({ queryKey: ["lab_results"] });
      toast.success("Panel deleted");
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Link
        to="/more"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Blood Work</h1>
            <p className="text-sm text-muted-foreground">Track labs and see trends</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add panel
        </Button>
      </div>

      <div className="mb-5 inline-flex rounded-lg border border-border bg-card p-1 text-xs">
        {(["male", "female", "any"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSex(s)}
            className={`rounded-md px-3 py-1.5 capitalize transition-colors ${sex === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {s === "any" ? "General" : s}
          </button>
        ))}
      </div>

      {/* Panels list */}
      {(panels.data?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">Recent panels</h2>
          <div className="space-y-2">
            {panels.data!.map((p) => {
              const count = (results.data ?? []).filter((r) => r.panel_id === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setPanelOpen(p)}
                  className="tap-target flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {new Date(p.drawn_on).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.lab_name || "—"} · {count} marker{count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Markers by category with latest value + trend */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Markers</h2>
        {[...grouped.entries()].map(([cat, list]) => (
          <div key={cat} className="mb-4">
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {cat}
            </div>
            <Card className="overflow-hidden border-border">
              {list.map((m, i) => {
                const rs = byMarker.get(m.slug) ?? [];
                const latest = rs[0];
                const prev = rs[1];
                const range = rangeFor(m, sex);
                const status = latest ? flag(latest.value, range.low, range.high) : null;
                const trend =
                  latest && prev
                    ? latest.value > prev.value
                      ? "up"
                      : latest.value < prev.value
                        ? "down"
                        : "flat"
                    : null;
                return (
                  <div
                    key={m.slug}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {range.low != null || range.high != null
                          ? `Ref ${range.low ?? "—"}–${range.high ?? "—"} ${m.unit}`
                          : m.unit || ""}
                      </div>
                    </div>
                    {latest ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold tabular-nums ${status === "high" ? "text-rose-500" : status === "low" ? "text-amber-500" : "text-emerald-500"}`}
                        >
                          {latest.value}
                        </span>
                        {trend === "up" && (
                          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {trend === "down" && (
                          <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {trend === "flat" && (
                          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        ))}
      </section>

      {addOpen && markers.data && (
        <AddPanelSheet
          markers={markers.data}
          sex={sex}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            qc.invalidateQueries({ queryKey: ["lab_panels"] });
            qc.invalidateQueries({ queryKey: ["lab_results"] });
          }}
        />
      )}

      {panelOpen && markers.data && (
        <Sheet open onOpenChange={(o) => !o && setPanelOpen(null)}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{new Date(panelOpen.drawn_on).toLocaleDateString()}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              {(results.data ?? [])
                .filter((r) => r.panel_id === panelOpen.id)
                .map((r) => {
                  const m = markers.data!.find((x) => x.slug === r.marker_slug);
                  const range = rangeFor(m!, sex);
                  const status = flag(r.value, range.low, range.high);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <div className="text-sm">{m?.name ?? r.marker_slug}</div>
                      <div
                        className={`text-sm font-semibold tabular-nums ${status === "high" ? "text-rose-500" : status === "low" ? "text-amber-500" : "text-emerald-500"}`}
                      >
                        {r.value} {r.unit || m?.unit}
                      </div>
                    </div>
                  );
                })}
              {panelOpen.notes && (
                <p className="mt-3 text-xs text-muted-foreground">{panelOpen.notes}</p>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="mt-4 w-full"
                onClick={() => {
                  deletePanel.mutate(panelOpen.id);
                  setPanelOpen(null);
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete panel
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function AddPanelSheet({
  markers,
  sex,
  onClose,
  onSaved,
}: {
  markers: Marker[];
  sex: "male" | "female" | "any";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [drawnOn, setDrawnOn] = useState(() => todayInBrowserZone());
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data: panel, error: pErr } = await supabase
        .from("lab_panels")
        .insert({
          user_id: uid,
          drawn_on: drawnOn,
          lab_name: labName || null,
          notes: notes || null,
        })
        .select()
        .single();
      if (pErr) throw pErr;
      const rows = Object.entries(values)
        .map(([slug, v]) => ({ slug, num: parseFloat(v) }))
        .filter((r) => Number.isFinite(r.num))
        .map((r) => {
          const m = markers.find((x) => x.slug === r.slug)!;
          const range = rangeFor(m, sex);
          return {
            user_id: uid,
            panel_id: panel.id,
            marker_slug: r.slug,
            value: r.num,
            unit: m.unit,
            ref_low: range.low,
            ref_high: range.high,
          };
        });
      if (rows.length > 0) {
        const { error: rErr } = await supabase.from("lab_results").insert(rows);
        if (rErr) throw rErr;
      }
      toast.success(`Saved ${rows.length} result${rows.length === 1 ? "" : "s"}`);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const g = new Map<string, Marker[]>();
    markers.forEach((m) => {
      if (!g.has(m.category)) g.set(m.category, []);
      g.get(m.category)!.push(m);
    });
    return g;
  }, [markers]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New lab panel</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Date drawn</label>
              <Input type="date" value={drawnOn} onChange={(e) => setDrawnOn(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Lab</label>
              <Input
                placeholder="Quest, LabCorp…"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Input
              placeholder="Fasted, cycle day, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <p className="pt-2 text-xs text-muted-foreground">
            Enter only the markers on your report. Blank fields are skipped.
          </p>

          {[...grouped.entries()].map(([cat, list]) => (
            <div key={cat}>
              <div className="mb-1.5 mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {cat}
              </div>
              <div className="space-y-1.5">
                {list.map((m) => (
                  <div key={m.slug} className="flex items-center gap-2">
                    <label className="flex-1 text-sm">{m.name}</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      placeholder={m.unit}
                      className="w-28"
                      value={values[m.slug] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [m.slug]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button className="sticky bottom-2 mt-4 w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save panel"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
