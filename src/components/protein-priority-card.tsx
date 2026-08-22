import { useQuery } from "@tanstack/react-query";
import { Beef } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

/**
 * Protein-first coaching for people on a GLP-1.
 *
 * Appetite suppression makes it easy to fall short on protein, so when the
 * user's stack contains an active GLP-1 we surface protein ahead of calories
 * with a plain-English nudge instead of a generic macro bar.
 */
export function ProteinPriorityCard({
  proteinToday,
  className = "",
}: {
  proteinToday: number;
  className?: string;
}) {
  const context = useQuery({
    queryKey: ["protein-priority-context"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? "";
      const [stackRes, profileRes] = await Promise.all([
        supabase
          .from("user_compounds")
          .select("id, active, custom_category, compounds(category)")
          .eq("user_id", uid),
        supabase.from("profiles").select("target_protein_g, weight_kg").eq("id", uid).maybeSingle(),
      ]);
      const onGlp1 = (stackRes.data ?? []).some((row) => {
        if (row.active === false) return false;
        const linked = (row.compounds as { category?: string | null } | null)?.category;
        return linked === "glp1" || row.custom_category === "glp1";
      });
      const profile = profileRes.data as {
        target_protein_g: number | null;
        weight_kg: number | null;
      } | null;
      const target =
        profile?.target_protein_g != null
          ? Number(profile.target_protein_g)
          : profile?.weight_kg != null
            ? Math.round(Number(profile.weight_kg) * 1.6)
            : null;
      return { onGlp1, target, derived: profile?.target_protein_g == null };
    },
    staleTime: 5 * 60_000,
  });

  const data = context.data;
  if (!data?.onGlp1 || !data.target) return null;

  const pct = Math.min(100, Math.round((proteinToday / data.target) * 100));
  const remaining = Math.max(0, Math.round(data.target - proteinToday));

  return (
    <section className={`rounded-2xl bg-card p-4 ${className}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Beef className="h-4 w-4 text-primary" /> Protein first
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        You have a GLP-1 in your stack. Appetite drops before protein needs do, so hit protein
        before anything else today.
      </p>
      <div className="mt-3 flex items-baseline justify-between text-sm">
        <span className="font-semibold tabular-nums">
          {Math.round(proteinToday)}g of {data.target}g
        </span>
        <span className="text-muted-foreground tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} className="mt-2 h-2" />
      <p className="mt-2 text-xs text-muted-foreground">
        {remaining === 0
          ? "Target met — nice work protecting your muscle while you lose."
          : `${remaining}g to go. A palm-sized serving of meat, fish or Greek yogurt is roughly 25g.`}
        {data.derived ? " Target estimated from your weight (1.6g/kg)." : ""}
      </p>
    </section>
  );
}
