import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle, Plus, Check, Trash2, X } from "lucide-react";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { useConfirm } from "@/components/confirm-dialog";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/side-effects")({
  errorComponent: routeErrorComponent("side-effects"),
  head: () => ({
    meta: [
      { title: "Side Effect Journal — DoseRoutine" },
      {
        name: "description",
        content:
          "Log side effects with severity and link them to a compound. Spot patterns over time and share a clean report with your clinician.",
      },
      { property: "og:title", content: "Side Effect Journal" },
      {
        property: "og:description",
        content: "Track symptoms, severity, and which compound they may be tied to.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SideEffectsPage,
});

const COMMON = [
  "Headache",
  "Nausea",
  "Fatigue",
  "Insomnia",
  "Acne",
  "Injection site reaction",
  "Mood swing",
  "Anxiety",
  "Low libido",
  "Bloating",
  "Joint pain",
  "Elevated BP",
  "Palpitations",
  "Water retention",
  "Hot flashes",
  "Night sweats",
];

const SEVERITY_LABEL = ["", "Mild", "Noticeable", "Moderate", "Severe", "Debilitating"];
const SEVERITY_COLOR = [
  "",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
];

type Entry = {
  id: string;
  occurred_at: string;
  symptom: string;
  severity: number;
  notes: string | null;
  resolved: boolean;
  user_compound_id: string | null;
};

function SideEffectsPage() {
  const [confirmAction, confirmUi] = useConfirm();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["side-effects"],
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("side_effects")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: compounds } = useQuery({
    queryKey: ["side-effects-compounds"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("user_compounds")
        .select("id, custom_name, compounds(name)")
        .eq("user_id", user.id)
        .eq("active", true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
      return (data ?? []).map((u: any) => ({
        id: u.id,
        name: u.custom_name || u.compounds?.name || "Compound",
      }));
    },
  });

  const compoundName = useMemo(() => {
    const m = new Map<string, string>();
    (compounds ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [compounds]);

  const toggleResolved = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase.from("side_effects").update({ resolved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["side-effects"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("side_effects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["side-effects"] }),
  });

  const activeCount = (entries ?? []).filter((e) => !e.resolved).length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {confirmUi}
      <Link
        to="/more"
        className="tap-target inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> More
      </Link>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Side Effect Journal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Log symptoms with severity. Tie them to a compound to spot patterns and share a clean
            history with your clinician.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="tap-target inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Log
        </button>
      </div>

      {activeCount > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          {activeCount} unresolved {activeCount === 1 ? "symptom" : "symptoms"}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (entries?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">
            No entries yet. Tap Log to add your first symptom.
          </p>
        )}
        {entries?.map((e) => (
          <div
            key={e.id}
            className={`rounded-2xl border border-border bg-card p-4 ${e.resolved ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.symptom}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[e.severity]}`}
                  >
                    {SEVERITY_LABEL[e.severity]}
                  </span>
                  {e.resolved && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Resolved</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(e.occurred_at).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {e.user_compound_id && compoundName.get(e.user_compound_id) && (
                    <> · {compoundName.get(e.user_compound_id)}</>
                  )}
                </div>
                {e.notes && <p className="mt-2 text-sm text-foreground/80">{e.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => toggleResolved.mutate({ id: e.id, resolved: !e.resolved })}
                  className="tap-target rounded-lg p-2 text-muted-foreground hover:text-foreground"
                  title={e.resolved ? "Mark active" : "Mark resolved"}
                >
                  {e.resolved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    void confirmAction({
                      title: "Delete this entry?",
                      description: "This side effect log will be permanently removed.",
                    }).then((ok) => {
                      if (ok) del.mutate(e.id);
                    });
                  }}
                  className="tap-target rounded-lg p-2 text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <AddSheet
          compounds={compounds ?? []}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ["side-effects"] });
          }}
        />
      )}

      <DisclaimerFooter />
    </div>
  );
}

function AddSheet({
  compounds,
  onClose,
  onSaved,
}: {
  compounds: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState(2);
  const [ucId, setUcId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  // Keyboard access for this hand-rolled modal:
  // - Escape closes the sheet
  // - Focus is trapped inside the dialog (Tab / Shift+Tab cycle within)
  // - Opening focus goes to the first field; closing focus returns to
  //   whatever triggered the dialog (restored via the previouslyFocused ref)
  // - background scroll is locked while the sheet is open
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  const save = useMutation({
    mutationFn: async () => {
      if (!symptom.trim()) throw new Error("Symptom required");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("side_effects").insert({
        user_id: user.id,
        symptom: symptom.trim(),
        severity,
        user_compound_id: ucId || null,
        notes: notes.trim() || null,
        occurred_at: new Date(when).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: onSaved,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-effect-dialog-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="side-effect-dialog-title" className="font-display text-xl font-semibold">
            Log side effect
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="tap-target rounded-lg p-2 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-muted-foreground">Symptom</span>
          <input
            ref={firstFieldRef}
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            placeholder="e.g. Headache"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {COMMON.map((c) => (
            <button
              key={c}
              onClick={() => setSymptom(c)}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted"
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-sm text-muted-foreground">Severity</div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setSeverity(n)}
                className={`tap-target rounded-xl border px-2 py-2 text-xs font-medium ${
                  severity === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background"
                }`}
              >
                {n}
                <div className="text-[10px] font-normal opacity-70">{SEVERITY_LABEL[n]}</div>
              </button>
            ))}
          </div>
        </div>

        {compounds.length > 0 && (
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-muted-foreground">Linked compound (optional)</span>
            <select
              value={ucId}
              onChange={(e) => setUcId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
            >
              <option value="">— None —</option>
              {compounds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-muted-foreground">When</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
          />
        </label>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-muted-foreground">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Onset, duration, what helped…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
          />
        </label>

        {save.error && (
          <p className="mt-3 text-sm text-rose-500">{(save.error as Error).message}</p>
        )}

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !symptom.trim()}
          className="tap-target mt-5 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save entry"}
        </button>
      </div>
    </div>
  );
}
