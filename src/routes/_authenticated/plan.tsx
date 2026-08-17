import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallSheet } from "@/components/paywall-sheet";
import { generatePlan, type PlanPayload } from "@/lib/generate-plan.functions";
import { SeverityBadge } from "@/components/severity-badge";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { PageHeader } from "@/components/page-header";
import { Card, cardClassName } from "@/components/ui/card";
import { ApplyPlanCard } from "@/components/apply-plan-card";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Plan — DoseRoutine" },
      { name: "description", content: "AI-organized schedule for the stack you already chose." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlanPage,
});

const GOALS = [
  { id: "energy", label: "More daytime energy" },
  { id: "sleep", label: "Better sleep" },
  { id: "recovery", label: "Recovery & training" },
  { id: "focus", label: "Focus & cognition" },
  { id: "longevity", label: "Longevity basics" },
  { id: "glp1", label: "GLP-1 protocol timing" },
];

function PlanPage() {
  const gen = useServerFn(generatePlan);
  const [goal, setGoal] = useState<string>(GOALS[0].label);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanPayload | null>(null);
  const [genAt, setGenAt] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const { data: subscription, isLoading: subLoading } = useSubscription();

  // Cache the most recent plan across navigations so returning to this page
  // shows instantly instead of waiting for another round trip.
  const isPaid = !!subscription?.isPaid;
  const { data: latestPlan } = useQuery({
    queryKey: ["plan", "latest"],
    enabled: !subLoading && isPaid,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return null;
      const { data } = await supabase
        .from("plans")
        .select("plan_json, generated_at, goal")
        .eq("user_id", userRes.user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    if (subLoading) return;
    if (!isPaid) {
      setPaywall(true);
      return;
    }
    if (latestPlan?.plan_json) {
      setPlan(latestPlan.plan_json as unknown as PlanPayload);
      setGenAt(latestPlan.generated_at ?? null);
      setGoal(latestPlan.goal);
    }
  }, [subLoading, isPaid, latestPlan]);

  async function onGenerate() {
    setError(null);
    setLoading(true);
    try {
      // Block publish/generate until the user has acknowledged the
      // high-risk cardiovascular medication warning on the Stack page.
      const { fetchCurrentHighRiskSignature, isHighRiskAcknowledged } =
        await import("@/lib/high-risk-ack");
      const sig = await fetchCurrentHighRiskSignature(supabase);
      if (sig && !isHighRiskAcknowledged(sig)) {
        setError(
          "Your stack contains a high-risk cardiovascular compound. Open the Stack page, tick the red acknowledgment checkbox, then generate your plan.",
        );
        setLoading(false);
        return;
      }
      const chosen = custom.trim() || goal;
      const res = await gen({ data: { goal: chosen } });
      setPlan(res.plan);
      setGenAt(res.generated_at);
    } catch (e: any) {
      setError(e?.message || "Could not generate plan.");
    } finally {
      setLoading(false);
    }
  }

  if (paywall) {
    return (
      <>
        <PageHeader title="Plan" fallbackTo="/more" hideBack />
        <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:pt-10">
          <PaywallSheet feature="plan" onClose={() => setPaywall(false)} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Plan" fallbackTo="/more" hideBack />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:pt-10">
        <header className="mb-6">
          <p className="text-sm text-muted-foreground">
            Sequence your existing stack around a goal. No new compounds. No dose suggestions.
          </p>
        </header>

        <section className={cn(cardClassName, "mb-6 rounded-2xl p-4")}>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Goal
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setGoal(g.label);
                  setCustom("");
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  goal === g.label && !custom
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type a custom goal…"
            maxLength={200}
            className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={onGenerate}
            disabled={loading}
            className="tap-target mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {plan ? "Regenerate plan" : "Generate plan"}
          </button>
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[color:var(--severity-avoid-bg))] p-3 text-sm text-[color:var(--severity-avoid)]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {plan && (
          <section className="space-y-6">
            <Card className="rounded-2xl border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    For goal
                  </div>
                  <div className="mt-1 text-base font-semibold">{plan.goal}</div>
                </div>
                <button
                  onClick={onGenerate}
                  disabled={loading}
                  className="tap-target inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Regenerate
                </button>
              </div>
              {plan.summary && <p className="mt-2 text-sm text-muted-foreground">{plan.summary}</p>}
              {genAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Generated {new Date(genAt).toLocaleString()}
                </p>
              )}
            </Card>

            <ApplyPlanCard planKey={genAt} />

            {(plan.blocks ?? []).map((b, i) => (
              <Card key={i} className="rounded-2xl border-border p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold capitalize">
                    {b.time_of_day.replace("_", " ")}
                  </h2>
                  {b.clock_hint && (
                    <span className="text-xs text-muted-foreground">{b.clock_hint}</span>
                  )}
                </div>
                <ul className="mt-3 divide-y divide-border">
                  {(b.items ?? []).map((it, j) => (
                    <li key={j} className="flex items-start gap-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{it.name}</div>
                        {it.note && <div className="text-xs text-muted-foreground">{it.note}</div>}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm tabular-nums">{it.dose}</div>
                        {it.controlled && (
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Your dose
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {b.education && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {b.education}
                  </p>
                )}
              </Card>
            ))}

            {plan.warnings && plan.warnings.length > 0 && (
              <Card className="rounded-2xl border-border p-4">
                <h2 className="mb-3 text-sm font-semibold">Interactions to know</h2>
                <ul className="space-y-3">
                  {plan.warnings.map((w, i) => (
                    <li key={i} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={w.severity} />
                        <span className="text-sm font-medium">
                          {w.a} + {w.b}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{w.mechanism}</p>
                      {w.recommendation && <p className="text-xs">{w.recommendation}</p>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <p className="pt-2 text-center text-xs text-muted-foreground">{plan.disclaimer}</p>
            <DisclaimerFooter variant="plan" />
          </section>
        )}
      </div>
    </>
  );
}
