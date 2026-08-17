import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/doctor-report")({
  head: () => ({
    meta: [
      { title: "My Report — DoseRoutine" },
      {
        name: "description",
        content: "One-page printable summary of your stack, adherence, recent labs, and check-ins.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DoctorReportPage,
});

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function DoctorReportPage() {
  const { data: profile } = useQuery({
    queryKey: ["profile-doc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, dob, sex, height_cm, weight_kg, unit_pref")
        .maybeSingle();
      return data;
    },
  });

  const { data: stack = [] } = useQuery({
    queryKey: ["stack-doc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_compounds")
        .select(
          "id, custom_name, dose_amount, dose_unit, frequency, days_of_week, times_of_day, start_date, notes, active, compounds(name, category)",
        )
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        custom_name: string | null;
        dose_amount: number | null;
        dose_unit: string | null;
        frequency: string | null;
        days_of_week: string[] | null;
        times_of_day: string[] | null;
        start_date: string | null;
        notes: string | null;
        active: boolean;
        compounds: { name: string; category: string | null } | null;
      }>;
    },
  });

  const { data: adherence } = useQuery({
    queryKey: ["adherence-doc"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("schedule_events")
        .select("status, scheduled_at")
        .gte("scheduled_at", since)
        .lte("scheduled_at", new Date().toISOString());
      if (error) throw error;
      const total = data?.length ?? 0;
      const taken = data?.filter((e) => e.status === "taken").length ?? 0;
      const missed = data?.filter((e) => e.status === "missed").length ?? 0;
      return { total, taken, missed, pct: total ? Math.round((taken / total) * 100) : 0 };
    },
  });

  const { data: labs = [] } = useQuery({
    queryKey: ["labs-doc"],
    queryFn: async () => {
      const { data: panels } = await supabase
        .from("lab_panels")
        .select("id, drawn_on, lab_name")
        .order("drawn_on", { ascending: false })
        .limit(3);
      if (!panels?.length) return [];
      const ids = panels.map((p) => p.id);
      const { data: results } = await supabase
        .from("lab_results")
        .select("panel_id, marker_slug, value, unit, ref_low, ref_high")
        .in("panel_id", ids);
      return panels.map((p) => ({
        ...p,
        results: (results ?? []).filter((r) => r.panel_id === p.id),
      }));
    },
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins-doc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("body_checkins")
        .select("checked_at, weight_kg, body_fat_pct, waist_cm")
        .order("checked_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const age = useMemo(() => {
    if (!profile?.dob) return null;
    const d = new Date(profile.dob);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 86400000));
  }, [profile?.dob]);

  const today = new Date().toLocaleDateString();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="print:hidden">
        <Link
          to="/more"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">My Report</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A one-page snapshot of your current routine, recent logs, and 30-day adherence. Save
              or share as a PDF.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Printer className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      <Card className="mt-6 rounded-2xl border-border p-6 print:border-none print:bg-transparent print:p-0">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              DoseRoutine · Personal Summary
            </div>
            <div className="mt-1 font-display text-2xl font-semibold text-foreground">
              {profile?.display_name || "Patient"}
            </div>
            <div className="text-sm text-muted-foreground">
              {age != null && <>Age {age} · </>}
              {profile?.sex && <>{profile.sex} · </>}
              {profile?.height_cm && <>{profile.height_cm} cm · </>}
              {profile?.weight_kg && <>{profile.weight_kg} kg</>}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Generated</div>
            <div className="text-sm font-medium text-foreground">{today}</div>
          </div>
        </div>

        {/* Adherence */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            30-Day Adherence
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-background p-3 print:border print:border-border">
              <div className="text-2xl font-semibold text-foreground">{adherence?.pct ?? 0}%</div>
              <div className="text-xs text-muted-foreground">Doses taken</div>
            </div>
            <div className="rounded-xl bg-background p-3 print:border print:border-border">
              <div className="text-2xl font-semibold text-foreground">{adherence?.taken ?? 0}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="rounded-xl bg-background p-3 print:border print:border-border">
              <div className="text-2xl font-semibold text-foreground">{adherence?.missed ?? 0}</div>
              <div className="text-xs text-muted-foreground">Missed</div>
            </div>
          </div>
        </section>

        {/* Current stack */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Current Protocol
          </h2>
          {stack.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No active compounds.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Compound</th>
                  <th className="py-2 pr-2 font-medium">Dose</th>
                  <th className="py-2 pr-2 font-medium">Frequency</th>
                  <th className="py-2 pr-2 font-medium">Timing</th>
                  <th className="py-2 pr-2 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {stack.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 align-top">
                    <td className="py-2 pr-2 font-medium text-foreground">
                      {s.custom_name || s.compounds?.name || "—"}
                      {s.compounds?.category && (
                        <div className="text-xs text-muted-foreground">{s.compounds.category}</div>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-foreground">
                      {s.dose_amount ? `${s.dose_amount} ${s.dose_unit ?? ""}`.trim() : "—"}
                    </td>
                    <td className="py-2 pr-2 text-foreground">
                      {s.frequency || "—"}
                      {s.days_of_week?.length ? (
                        <div className="text-xs text-muted-foreground">
                          {s.days_of_week.join(", ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 text-foreground">
                      {s.times_of_day?.length ? s.times_of_day.join(", ") : "—"}
                    </td>
                    <td className="py-2 pr-2 text-foreground">{fmtDate(s.start_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Recent labs */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Lab Results
          </h2>
          {labs.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No lab panels recorded.</p>
          ) : (
            <div className="mt-2 space-y-3">
              {labs.map((p) => (
                <div key={p.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-baseline justify-between">
                    <div className="font-medium text-foreground">{fmtDate(p.drawn_on)}</div>
                    <div className="text-xs text-muted-foreground">{p.lab_name || "Lab"}</div>
                  </div>
                  {p.results.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                      {p.results.map((r) => {
                        const flag =
                          r.ref_low != null && r.value < r.ref_low
                            ? "L"
                            : r.ref_high != null && r.value > r.ref_high
                              ? "H"
                              : "";
                        return (
                          <div
                            key={r.marker_slug}
                            className="flex items-baseline justify-between border-b border-border/40 py-1"
                          >
                            <span className="text-muted-foreground">{r.marker_slug}</span>
                            <span className="font-medium text-foreground">
                              {r.value} {r.unit ?? ""}
                              {flag && (
                                <span className="ml-1 text-xs font-bold text-primary">{flag}</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Check-ins */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Body Metrics
          </h2>
          {checkins.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No check-ins recorded.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Date</th>
                  <th className="py-2 pr-2 font-medium">Weight</th>
                  <th className="py-2 pr-2 font-medium">Body fat</th>
                  <th className="py-2 pr-2 font-medium">Waist</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((c, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-2 text-foreground">{fmtDate(c.checked_at)}</td>
                    <td className="py-2 pr-2 text-foreground">
                      {c.weight_kg ? `${c.weight_kg} kg` : "—"}
                    </td>
                    <td className="py-2 pr-2 text-foreground">
                      {c.body_fat_pct ? `${c.body_fat_pct}%` : "—"}
                    </td>
                    <td className="py-2 pr-2 text-foreground">
                      {c.waist_cm ? `${c.waist_cm} cm` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <span>
              This summary is patient-reported and generated from DoseRoutine logs. It is not a
              medical record. Verify with the patient and any prescribing clinician before making
              clinical decisions.
            </span>
          </div>
        </div>
      </Card>

      <div className="print:hidden">
        <DisclaimerFooter />
      </div>

      <style>{`
        @media print {
          body { background: white; }
          nav, header, footer, aside { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
