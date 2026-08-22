import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CardListSkeleton, LoadingStatus } from "@/components/skeletons";
import { PageHeader } from "@/components/page-header";
import { CheckinSheet, type CheckinValues } from "@/components/checkin-sheet";
import { CHECKINS_KEY } from "@/components/stats-trend-card";
import {
  getRecentCheckins,
  deleteCheckin,
  upsertCheckin,
  type Checkin,
} from "@/lib/checkins.functions";
import { supabase } from "@/integrations/supabase/client";
import { reconcileRow } from "@/lib/reconcile";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/confirm-dialog";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/checkins")({
  errorComponent: routeErrorComponent("checkins"),
  head: () => ({
    meta: [
      { title: "Check-ins — DoseRoutine" },
      {
        name: "description",
        content: "Weekly body-stats history so you can see if your stack is working.",
      },
    ],
  }),
  component: CheckinsPage,
});

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

function CheckinsPage() {
  const [confirmAction, confirmUi] = useConfirm();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Checkin | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const { data: unitPref = "metric" as "metric" | "imperial" } = useQuery({
    queryKey: ["profile-unit-pref"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return "metric";
      const { data } = await supabase
        .from("profiles")
        .select("unit_pref")
        .eq("id", uid)
        .maybeSingle();
      return (data?.unit_pref === "imperial" ? "imperial" : "metric") as "metric" | "imperial";
    },
    staleTime: 5 * 60_000,
  });

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: CHECKINS_KEY,
    queryFn: () => getRecentCheckins(),
  });

  const wUnit = unitPref === "imperial" ? "lb" : "kg";
  const lUnit = unitPref === "imperial" ? "in" : "cm";
  const fmtW = (kg: number | null) =>
    kg == null
      ? "—"
      : `${Math.round((unitPref === "imperial" ? kg / KG_PER_LB : kg) * 10) / 10} ${wUnit}`;
  const fmtL = (cm: number | null) =>
    cm == null
      ? "—"
      : `${Math.round((unitPref === "imperial" ? cm / CM_PER_IN : cm) * 10) / 10} ${lUnit}`;

  const saveMutation = useMutation({
    mutationFn: (values: CheckinValues) => upsertCheckin({ data: values }),
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: CHECKINS_KEY });
      const prev = qc.getQueryData<Checkin[]>(CHECKINS_KEY);
      qc.setQueryData<Checkin[]>(CHECKINS_KEY, (old) => {
        const list = old ?? [];
        const idx = list.findIndex((c) => c.checked_at === values.checked_at);
        const optimistic: Checkin = {
          id: idx >= 0 ? list[idx].id : `optimistic-${values.checked_at}`,
          checked_at: values.checked_at,
          weight_kg: values.weight_kg,
          body_fat_pct: values.body_fat_pct,
          waist_cm: values.waist_cm,
          notes: idx >= 0 ? list[idx].notes : null,
        };
        const next =
          idx >= 0 ? list.map((c, i) => (i === idx ? optimistic : c)) : [optimistic, ...list];
        return [...next].sort((a, b) => b.checked_at.localeCompare(a.checked_at));
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHECKINS_KEY, ctx.prev);
    },
    onSuccess: (row, values) => {
      // Reconcile: swap the optimistic row for the server row, matching by
      // the row's unique business key (checked_at is unique per user for
      // body_checkins). Guards against attaching the server row to a
      // different date if the server ever returns an unexpected row.
      qc.setQueryData<Checkin[]>(CHECKINS_KEY, (old) =>
        reconcileRow(old, row, { checked_at: values.checked_at }).sort((a, b) =>
          b.checked_at.localeCompare(a.checked_at),
        ),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCheckin({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: CHECKINS_KEY });
      const prev = qc.getQueryData<Checkin[]>(CHECKINS_KEY);
      qc.setQueryData<Checkin[]>(CHECKINS_KEY, (old) => (old ?? []).filter((c) => c.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHECKINS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHECKINS_KEY }),
  });

  async function onDelete(id: string) {
    const ok = await confirmAction({
      title: "Delete this check-in?",
      description: "This entry will be removed from your history.",
    });
    if (!ok) return;
    deleteMutation.mutate(id);
  }

  return (
    <div>
      {confirmUi}
      <PageHeader
        hideBack
        title="Check-ins"
        fallbackTo="/today"
        actions={
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            aria-label="Add check-in"
            className="tap-target inline-flex h-11 w-11 items-center justify-center rounded-xl text-primary hover:bg-card"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6">
        {isLoading ? (
          <div aria-busy="true">
            <LoadingStatus label="Loading your check-ins…" />
            <CardListSkeleton count={5} itemClassName="h-16 w-full rounded-2xl" />
          </div>
        ) : checkins.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border p-8 text-center">
            <p className="font-display text-lg font-semibold">No check-ins yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Log your weight, body fat, and waist weekly to track how your stack is working.
            </p>
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="tap-target mt-4 inline-flex items-center gap-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Log first check-in
            </button>
          </Card>
        ) : (
          <ul className="space-y-2">
            {checkins.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-base font-semibold">
                      {new Date(c.checked_at + "T12:00:00").toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        Weight: <span className="text-foreground">{fmtW(c.weight_kg)}</span>
                      </span>
                      {c.body_fat_pct != null && (
                        <span>
                          BF: <span className="text-foreground">{c.body_fat_pct}%</span>
                        </span>
                      )}
                      {c.waist_cm != null && (
                        <span>
                          Waist: <span className="text-foreground">{fmtL(c.waist_cm)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      aria-label="Edit"
                      className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-background"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      aria-label="Delete"
                      className="tap-target inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-background hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CheckinSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSaved={() => {}}
        onSubmit={(values) => saveMutation.mutateAsync(values)}
        unitPref={unitPref}
      />
      <CheckinSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        // Refresh `editing` with the server-normalized row so if the user
        // reopens the sheet immediately, inputs seed from canonical values
        // instead of the pre-save copy.
        onSaved={(row) => {
          if (row) setEditing(row);
        }}
        onSubmit={(values) => saveMutation.mutateAsync(values)}
        unitPref={unitPref}
        initial={
          editing
            ? {
                checked_at: editing.checked_at,
                weight_kg: editing.weight_kg,
                body_fat_pct: editing.body_fat_pct,
                waist_cm: editing.waist_cm,
              }
            : undefined
        }
      />
    </div>
  );
}
