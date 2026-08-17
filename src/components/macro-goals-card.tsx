import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MACRO_META } from "@/lib/macro-progress";

type Form = Record<string, string>;

/** Daily calorie and macro goals, used by the progress bars on Today and Timeline. */
export function MacroGoalsCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>({});
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["macro-goals"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("target_calories,target_protein_g,target_carbs_g,target_fat_g")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });


  useEffect(() => {
    if (!data) return;
    setForm({
      calories: data.target_calories === null ? "" : String(data.target_calories),
      protein_g: data.target_protein_g === null ? "" : String(data.target_protein_g),
      carbs_g: data.target_carbs_g === null ? "" : String(data.target_carbs_g),
      fat_g: data.target_fat_g === null ? "" : String(data.target_fat_g),
    });
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("You need to be signed in.");
      const num = (key: string) => {
        const raw = (form[key] ?? "").trim();
        if (raw === "") return null;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
      };
      const { error } = await supabase
        .from("profiles")
        .update({
          target_calories: num("calories"),
          target_protein_g: num("protein_g"),
          target_carbs_g: num("carbs_g"),
          target_fat_g: num("fat_g"),
        })
        .eq("id", uid);
      if (error) throw error;
      toast.success("Daily goals saved");
      void queryClient.invalidateQueries({ queryKey: ["macro-goals"] });
      void queryClient.invalidateQueries({ queryKey: ["macro-progress"] });
    } catch (err) {
      toast.error("Could not save your goals", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Target className="h-4 w-4 text-primary" />
        Daily goals
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MACRO_META.map(({ key, label, unit }) => (
          <div key={key}>
            <Label htmlFor={`goal-${key}`} className="text-xs">
              {label} ({unit})
            </Label>
            <Input
              id={`goal-${key}`}
              inputMode="numeric"
              placeholder="—"
              value={form[key] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="mt-1"
            />
          </div>
        ))}
      </div>
      <Button type="button" size="sm" className="mt-3" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save goals
      </Button>
    </section>
  );
}
