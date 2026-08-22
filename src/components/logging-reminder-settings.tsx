import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_NUDGE_SETTINGS, type LoggingNudgeSettings } from "@/lib/logging-streak";

const TIME_FIELDS: Array<{ key: keyof LoggingNudgeSettings; label: string }> = [
  { key: "breakfast_by", label: "Breakfast logged by" },
  { key: "lunch_by", label: "Lunch logged by" },
  { key: "dinner_by", label: "Dinner logged by" },
  { key: "quiet_after", label: "No nudges after" },
];

/** Controls the in-app nudges shown on the food page when a meal or dose is missing. */
export function LoggingReminderSettings({ className = "" }: { className?: string }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<LoggingNudgeSettings>(DEFAULT_NUDGE_SETTINGS);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["logging-reminder-settings"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data: row } = await supabase
        .from("logging_reminder_settings")
        .select("meals_enabled,doses_enabled,breakfast_by,lunch_by,dinner_by,quiet_after")
        .eq("user_id", uid)
        .maybeSingle();
      return (row as LoggingNudgeSettings | null) ?? DEFAULT_NUDGE_SETTINGS;
    },
  });

  useEffect(() => {
    if (data) setValues({ ...data });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("logging_reminder_settings")
        .upsert({ user_id: uid, ...values }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Logging reminders saved");
      void queryClient.invalidateQueries({ queryKey: ["logging-streak"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`rounded-2xl bg-card p-4 ${className}`}>
      <h2 className="text-sm font-semibold">Smart logging reminders</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Gentle in-app nudges when a meal or dose hasn't been logged by the time you picked.
      </p>

      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="meals-enabled">Meal logging nudges</Label>
          <Switch
            id="meals-enabled"
            checked={values.meals_enabled}
            onCheckedChange={(checked) => setValues((v) => ({ ...v, meals_enabled: checked }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="doses-enabled">Unmarked dose nudges</Label>
          <Switch
            id="doses-enabled"
            checked={values.doses_enabled}
            onCheckedChange={(checked) => setValues((v) => ({ ...v, doses_enabled: checked }))}
          />
        </div>

        {TIME_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-3">
            <Label htmlFor={`nudge-${field.key}`} className="text-sm font-normal">
              {field.label}
            </Label>
            <Input
              id={`nudge-${field.key}`}
              type="time"
              className="h-9 w-32"
              value={String(values[field.key]).slice(0, 5)}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <Button className="mt-4 w-full" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save logging reminders"}
      </Button>
    </section>
  );
}
