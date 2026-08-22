import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TIMING_RULES, type MealTimingRules } from "@/lib/meal-timing";
import {
  AUTO_MODE_LABELS,
  PRESET_COLUMNS,
  STARTER_PRESETS,
  WEEKDAY_LABELS,
  autoRuleSummary,
  isPresetActive,
  normalizePresetName,
  presetRules,
  resolveAutoPreset,
  type MealTimingPreset,
  type PresetAutoMode,
  parsePresetsJson,
  presetsToJson,
} from "@/lib/meal-timing-presets";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bookmark, CalendarClock, Check, Download, Plus, Settings2, Upload, X } from "lucide-react";
import { downloadFile } from "@/lib/grocery-export";

const AUTO_APPLIED_KEY = "dr.meal-timing.auto-applied";
const AUTO_APPLY_OFF_KEY = "dr.meal-timing.auto-off";
/** Set to today's date when the user hand-edits their rules, pausing auto-apply. */
const MANUAL_TODAY_KEY = "dr.meal-timing.manual-today";

const AUTO_MODES: PresetAutoMode[] = ["off", "workout_days", "rest_days", "weekdays"];

/** YYYY-MM-DD for the user's own clock. */
function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

const RULE_COLUMNS =
  "with_food_window_min,workout_window_min,empty_stomach_gap_min,first_meal_protein_g,late_meal_hour,max_meals_per_day,suggestions_enabled";

const NUMBER_FIELDS: Array<{
  key: keyof MealTimingRules;
  label: string;
  hint: string;
  min: number;
  max: number;
  step?: number;
  suffix: string;
}> = [
  {
    key: "with_food_window_min",
    label: "Dose-with-food window",
    hint: "How close a with-food dose should sit to the meal.",
    min: 0,
    max: 180,
    suffix: "min",
  },
  {
    key: "empty_stomach_gap_min",
    label: "Empty-stomach gap",
    hint: "Wait before eating after an absorption-sensitive dose.",
    min: 0,
    max: 240,
    suffix: "min",
  },
  {
    key: "workout_window_min",
    label: "Post-workout cutoff",
    hint: "How long after training still counts as post-workout.",
    min: 15,
    max: 300,
    suffix: "min",
  },
  {
    key: "first_meal_protein_g",
    label: "Protein in first meal",
    hint: "Used in front-loading suggestions.",
    min: 10,
    max: 100,
    suffix: "g",
  },
  {
    key: "late_meal_hour",
    label: "A meal counts as late after",
    hint: "24-hour clock, e.g. 21 for 9pm.",
    min: 15,
    max: 23,
    suffix: ":00",
  },
  {
    key: "max_meals_per_day",
    label: "Most meals per day",
    hint: "Above this, suggest consolidating into fewer meals.",
    min: 1,
    max: 10,
    step: 0.5,
    suffix: "meals",
  },
];

/** Lets the user tune the numbers behind the meal timing suggestions. */
export function MealTimingRulesPanel({ className = "" }: { className?: string }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<MealTimingRules>(DEFAULT_TIMING_RULES);
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [autoEnabled, setAutoEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(AUTO_APPLY_OFF_KEY) !== "1";
  });
  const [manualToday, setManualToday] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setManualToday(window.localStorage.getItem(MANUAL_TODAY_KEY) === todayKey());
  }, []);

  /** Remember that today's settings were hand-tuned, so auto-apply stands down. */
  const markManualToday = () => {
    window.localStorage.setItem(MANUAL_TODAY_KEY, todayKey());
    // Stop today's scheduled switch from firing later in the session.
    window.localStorage.setItem(AUTO_APPLIED_KEY, `${todayKey()}:manual`);
    setManualToday(true);
  };

  const resumeAutoToday = () => {
    window.localStorage.removeItem(MANUAL_TODAY_KEY);
    window.localStorage.removeItem(AUTO_APPLIED_KEY);
    setManualToday(false);
    toast.success("Auto-apply resumed for today");
  };

  const { data } = useQuery({
    queryKey: ["meal-timing-rules"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data: row } = await supabase
        .from("meal_timing_rules")
        .select(RULE_COLUMNS)
        .eq("user_id", uid)
        .maybeSingle();
      return (row as MealTimingRules | null) ?? DEFAULT_TIMING_RULES;
    },
  });

  useEffect(() => {
    if (data) setValues({ ...data });
  }, [data]);

  const presetsQuery = useQuery({
    queryKey: ["meal-timing-presets"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [] as MealTimingPreset[];
      const { data: rows, error } = await supabase
        .from("meal_timing_presets")
        .select(PRESET_COLUMNS)
        .eq("user_id", uid)
        .order("name", { ascending: true });
      if (error) throw error;
      return (rows ?? []) as MealTimingPreset[];
    },
  });
  const presets = presetsQuery.data ?? [];

  /** Write rules to the live settings so suggestions update immediately. */
  const applyRules = useMutation({
    mutationFn: async (rules: MealTimingRules) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("meal_timing_rules")
        .upsert({ user_id: uid, ...rules }, { onConflict: "user_id" });
      if (error) throw error;
      return rules;
    },
    onSuccess: (rules) => {
      setValues({ ...rules });
      void queryClient.invalidateQueries({ queryKey: ["meal-timing-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["meal-timing-suggestions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not switch preset"),
  });

  const savePreset = useMutation({
    mutationFn: async (input: { name: string; rules: MealTimingRules }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const name = normalizePresetName(input.name);
      if (!name) throw new Error("Give the preset a name");
      const { error } = await supabase
        .from("meal_timing_presets")
        .upsert({ user_id: uid, name, ...input.rules }, { onConflict: "user_id,name" });
      if (error) throw error;
      return name;
    },
    onSuccess: (name) => {
      setPresetName("");
      setNaming(false);
      toast.success(`Saved “${name}”`);
      void queryClient.invalidateQueries({ queryKey: ["meal-timing-presets"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save preset"),
  });

  const deletePreset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_timing_presets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["meal-timing-presets"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete preset"),
  });

  /** Is today a training day? Planned routine for this weekday, or a logged workout. */
  const workoutDayQuery = useQuery({
    queryKey: ["meal-timing-auto", "workout-day", todayKey()],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return false;
      const weekday = new Date().getDay();
      const [{ data: sessions }, { data: logs }] = await Promise.all([
        supabase.from("workout_sessions").select("days_of_week,active").eq("user_id", uid),
        supabase
          .from("workout_logs")
          .select("id")
          .eq("user_id", uid)
          .eq("performed_on", todayKey())
          .limit(1),
      ]);
      const planned = (sessions ?? []).some(
        (row) =>
          row.active !== false &&
          (row.days_of_week == null ||
            row.days_of_week.length === 0 ||
            row.days_of_week.includes(weekday)),
      );
      return planned || (logs ?? []).length > 0;
    },
    staleTime: 5 * 60_000,
  });

  const autoPreset =
    autoEnabled && workoutDayQuery.data !== undefined
      ? resolveAutoPreset(presets, {
          weekday: new Date().getDay(),
          isWorkoutDay: Boolean(workoutDayQuery.data),
        })
      : null;

  const setAuto = useMutation({
    mutationFn: async (input: { id: string; mode: PresetAutoMode; weekdays: number[] }) => {
      const { error } = await supabase
        .from("meal_timing_presets")
        .update({ auto_mode: input.mode, auto_weekdays: input.weekdays })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["meal-timing-presets"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the schedule"),
  });

  // Apply the scheduled preset once per calendar day.
  useEffect(() => {
    if (!autoPreset || !data) return;
    if (manualToday) return;
    const stamp = `${todayKey()}:${autoPreset.id}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(AUTO_APPLIED_KEY) === stamp) {
      return;
    }
    if (isPresetActive(autoPreset, data)) {
      window.localStorage.setItem(AUTO_APPLIED_KEY, stamp);
      return;
    }
    window.localStorage.setItem(AUTO_APPLIED_KEY, stamp);
    const previous: MealTimingRules = { ...data };
    applyRules.mutate(presetRules(autoPreset), {
      onSuccess: () =>
        toast.success(`Switched to “${autoPreset.name}” for today`, {
          duration: 12000,
          action: {
            label: "Undo",
            onClick: () => {
              markManualToday();
              applyRules.mutate(previous, {
                onSuccess: () => toast.success("Reverted to your previous timing rules"),
              });
            },
          },
        }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPreset?.id, data, manualToday]);

  const exportPresets = () => {
    if (presets.length === 0) {
      toast.error("Save a preset first");
      return;
    }
    downloadFile(
      `meal-timing-presets-${todayKey()}.json`,
      presetsToJson(presets),
      "application/json",
    );
    toast.success("Presets exported");
  };

  const importPresets = useMutation({
    mutationFn: async (text: string) => {
      const { presets: rows, skipped } = parsePresetsJson(text);
      if (rows.length === 0) throw new Error(skipped[0] ?? "Nothing to import");
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("meal_timing_presets").upsert(
        rows.map(({ auto_weekdays, ...row }) => ({
          user_id: uid,
          ...row,
          auto_weekdays: auto_weekdays ?? undefined,
        })),
        { onConflict: "user_id,name" },
      );
      if (error) throw error;
      return { count: rows.length, skipped };
    },
    onSuccess: ({ count, skipped }) => {
      void queryClient.invalidateQueries({ queryKey: ["meal-timing-presets"] });
      toast.success(
        `Imported ${count} preset${count === 1 ? "" : "s"}` +
          (skipped.length > 0 ? ` — skipped ${skipped.length}` : ""),
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not import presets"),
  });

  const onPresetFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      importPresets.mutate(await file.text());
    } catch {
      toast.error("Could not read that file");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("meal_timing_rules")
        .upsert({ user_id: uid, ...values }, { onConflict: "user_id" });
      if (error) throw error;
      markManualToday();
      toast.success("Timing rules saved — auto-apply paused until tomorrow");
      void queryClient.invalidateQueries({ queryKey: ["meal-timing-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["meal-timing-suggestions"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`rounded-2xl bg-card p-4 ${className}`}>
      <h2 className="text-sm font-semibold">Meal timing rules</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Tune the windows behind your timing suggestions so the advice matches how you actually eat
        and train.
      </p>

      <div className="mt-3 rounded-xl bg-muted/50 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Bookmark className="size-3.5" /> Presets
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const active = isPresetActive(preset, values);
            const schedule = autoRuleSummary(preset);
            const weekdays = preset.auto_weekdays ?? [];
            return (
              <span key={preset.id} className="inline-flex items-center">
                <Button
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="h-7 rounded-r-none px-2.5 text-xs"
                  disabled={applyRules.isPending}
                  onClick={() => applyRules.mutate(presetRules(preset))}
                >
                  {active ? <Check className="mr-1 size-3" /> : null}
                  {preset.name}
                  {schedule ? <CalendarClock className="ml-1 size-3 opacity-70" /> : null}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-none border-l-0 px-1.5"
                      aria-label={`Auto-apply schedule for ${preset.name}`}
                    >
                      <Settings2 className="size-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-3">
                    <p className="text-xs font-medium">Auto-apply “{preset.name}”</p>
                    <div className="mt-2 space-y-1">
                      {AUTO_MODES.map((mode) => (
                        <label
                          key={mode}
                          className="flex cursor-pointer items-center gap-2 text-xs"
                        >
                          <input
                            type="radio"
                            name={`auto-mode-${preset.id}`}
                            className="accent-primary"
                            checked={preset.auto_mode === mode}
                            onChange={() => setAuto.mutate({ id: preset.id, mode, weekdays })}
                          />
                          {AUTO_MODE_LABELS[mode]}
                        </label>
                      ))}
                    </div>
                    {preset.auto_mode === "weekdays" ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {WEEKDAY_LABELS.map((label, index) => {
                          const on = weekdays.includes(index);
                          return (
                            <Button
                              key={label}
                              size="sm"
                              variant={on ? "default" : "outline"}
                              className="h-7 w-9 px-0 text-[11px]"
                              aria-pressed={on}
                              onClick={() =>
                                setAuto.mutate({
                                  id: preset.id,
                                  mode: "weekdays",
                                  weekdays: on
                                    ? weekdays.filter((d) => d !== index)
                                    : [...weekdays, index],
                                })
                              }
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    ) : null}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {schedule ?? "This preset only switches on when you tap it."}
                    </p>
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-l-none border-l-0 px-1.5"
                  aria-label={`Delete preset ${preset.name}`}
                  onClick={() => deletePreset.mutate(preset.id)}
                >
                  <X className="size-3" />
                </Button>
              </span>
            );
          })}

          {presets.length === 0
            ? STARTER_PRESETS.map((starter) => (
                <Button
                  key={starter.name}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  disabled={savePreset.isPending}
                  onClick={() => savePreset.mutate({ name: starter.name, rules: starter.rules })}
                >
                  <Plus className="mr-1 size-3" /> {starter.name}
                </Button>
              ))
            : null}
        </div>

        {naming ? (
          <form
            className="mt-2 flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              savePreset.mutate({ name: presetName, rules: values });
            }}
          >
            <Input
              autoFocus
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name, e.g. Training day"
              aria-label="Preset name"
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" className="h-8" disabled={savePreset.isPending}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => setNaming(false)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 h-7 px-2 text-xs"
            onClick={() => setNaming(true)}
          >
            <Plus className="mr-1 size-3" /> Save current settings as a preset
          </Button>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={exportPresets}>
            <Download className="mr-1 size-3" /> Export presets
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={importPresets.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1 size-3" /> Import presets
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import meal timing presets"
            onChange={(e) => {
              void onPresetFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-2">
          <div className="min-w-0">
            <Label htmlFor="auto-apply-presets" className="text-xs font-medium">
              Auto-apply by day
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {manualToday
                ? "Paused today because you adjusted these settings yourself."
                : autoPreset
                  ? `Today matches “${autoPreset.name}”.`
                  : "Set a schedule on a preset with the gear button."}
            </p>
            {manualToday ? (
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-6 px-2 text-[11px]"
                onClick={resumeAutoToday}
              >
                Resume auto-apply today
              </Button>
            ) : null}
          </div>
          <Switch
            id="auto-apply-presets"
            checked={autoEnabled}
            onCheckedChange={(checked) => {
              setAutoEnabled(checked);
              if (typeof window !== "undefined") {
                if (checked) window.localStorage.removeItem(AUTO_APPLY_OFF_KEY);
                else window.localStorage.setItem(AUTO_APPLY_OFF_KEY, "1");
              }
            }}
          />
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Tap a preset to switch your timing rules in one go.
        </p>
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="timing-enabled">Show timing suggestions</Label>
          <Switch
            id="timing-enabled"
            checked={values.suggestions_enabled}
            onCheckedChange={(checked) =>
              setValues((v) => ({ ...v, suggestions_enabled: checked }))
            }
          />
        </div>

        {NUMBER_FIELDS.map((field) => (
          <div key={field.key} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor={`rule-${field.key}`} className="text-sm font-normal">
                {field.label}
              </Label>
              <p className="text-[11px] text-muted-foreground">{field.hint}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Input
                id={`rule-${field.key}`}
                type="number"
                inputMode="decimal"
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                disabled={!values.suggestions_enabled}
                className="h-9 w-20 text-right"
                value={String(values[field.key] ?? "")}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setValues((v) => ({
                    ...v,
                    [field.key]: Number.isFinite(next) ? next : field.min,
                  }));
                }}
              />
              <span className="w-10 text-xs text-muted-foreground">{field.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save timing rules"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setValues({ ...DEFAULT_TIMING_RULES })}
          disabled={saving}
        >
          Reset
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        These are your own preferences — general timing guidance, not medical advice.
      </p>
    </section>
  );
}
