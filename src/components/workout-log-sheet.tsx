import { useEffect, useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, ChevronDown, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/decimal-input";
import { parseDoseInput } from "@/lib/dose-input";
import {
  deleteWorkoutTemplate,
  fetchWorkoutTemplates,
  filterTemplates,
  formatPaceInput,
  markTemplateUsed,
  parsePaceInput,
  renameWorkoutTemplate,
  saveWorkoutTemplate,
  templateSummary,
  type WorkoutTemplate,
} from "@/lib/workout-templates";
import { SessionContextFields } from "@/components/session-context-fields";
import { clampRating, readTags } from "@/lib/session-context";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MuscleGroupPicker } from "@/components/muscle-group-picker";
import {
  distanceUnitLabel,
  estimateOneRepMaxKg,
  formatPace,
  fromKg,
  fromMetres,
  paceSecondsPerUnit,
  round,
  toKg,
  toMetres,
  totalVolumeKg,
  weightUnitLabel,
  workoutFamily,
  workoutTypeMeta,
  workoutTypesByFamily,
  WORKOUT_FAMILY_LABELS,
  type UnitSystem,
  type WorkoutStatus,
  type WorkoutType,
} from "@/lib/workout-types";
import { exerciseArt } from "@/lib/exercise-art";
import { ExerciseArtThumbnail } from "@/components/exercise-art-lightbox";
import { ExerciseSearchGrid } from "@/components/exercise-search-grid";
import { exerciseOptions } from "@/lib/exercise-options";
import {
  customCategories,
  customExercisesForType,
  deleteCustomExercise,
  fetchCustomExercises,
  groupCustomExercises,
  markCustomExerciseUsed,
  saveCustomExercise,
  type CustomExerciseRow,
} from "@/lib/custom-exercises";
import { unusedStarters, type StarterTemplate } from "@/lib/starter-templates";
import type { WorkoutLogRow, WorkoutSetRow } from "@/lib/workout-stats";

const UNITS_KEY = "doseroutine:fitness-units";

const TYPE_GROUPS = workoutTypesByFamily();
const EXERCISE_LIST_ID = "workout-exercise-suggestions";

const TEMPLATE_FAMILIES: {
  key: "all" | "strength" | "cardio" | "mindbody" | "sport" | "other";
  label: string;
}[] = [
  { key: "all", label: "All" },
  { key: "strength", label: WORKOUT_FAMILY_LABELS.strength },
  { key: "cardio", label: WORKOUT_FAMILY_LABELS.cardio },
  { key: "mindbody", label: WORKOUT_FAMILY_LABELS.mindbody },
  { key: "sport", label: WORKOUT_FAMILY_LABELS.sport },
  { key: "other", label: WORKOUT_FAMILY_LABELS.other },
];

export function readUnitPreference(): UnitSystem {
  if (typeof window === "undefined") return "imperial";
  return window.localStorage.getItem(UNITS_KEY) === "metric" ? "metric" : "imperial";
}

function writeUnitPreference(units: UnitSystem) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UNITS_KEY, units);
}

type SetRowState = {
  key: string;
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
  /** Pacing: rest between sets, in seconds. */
  rest: string;
  /** Pacing: tempo notation such as 3-1-1. */
  tempo: string;
};

function blankSetRow(): SetRowState {
  return {
    key: Math.random().toString(36).slice(2),
    exercise: "",
    sets: "",
    reps: "",
    weight: "",
    rest: "",
    tempo: "",
  };
}

function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseDoseInput(trimmed);
  return parsed.ok ? parsed.value : null;
}

export type WorkoutSheetSeed = {
  log?: WorkoutLogRow;
  sets?: WorkoutSetRow[];
  /** Pre-selected date (YYYY-MM-DD). */
  dayKey: string;
  /** "completed" logs what you did, "planned" schedules it. */
  status: WorkoutStatus;
  /** When set, saving replaces this planned entry instead of adding a new one. */
  convertFromId?: string;
};

export function WorkoutLogSheet({
  open,
  onOpenChange,
  seed,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: WorkoutSheetSeed;
  onSaved: () => void;
}) {
  const [units, setUnits] = useState<UnitSystem>(readUnitPreference);
  const [status, setStatus] = useState<WorkoutStatus>(seed.status);
  const [dayKey, setDayKey] = useState(seed.dayKey);
  const [startTime, setStartTime] = useState("");
  const [type, setType] = useState<WorkoutType>("strength");
  /** Families the user has manually expanded; the selected type's family is always open. */
  const [openFamilies, setOpenFamilies] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState("");
  const [calories, setCalories] = useState("");
  const [distance, setDistance] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);

  // Tags this user has already used, offered first in the tag picker.
  const recentTags = useQuery({
    queryKey: ["workout-recent-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_logs")
        .select("tags")
        .order("performed_on", { ascending: false })
        .limit(200);
      if (error) throw error;
      const seen: string[] = [];
      for (const row of data ?? []) {
        for (const tag of readTags((row as { tags?: unknown }).tags)) {
          if (!seen.some((t) => t.toLowerCase() === tag.toLowerCase())) seen.push(tag);
        }
      }
      return seen.slice(0, 12);
    },
    staleTime: 5 * 60_000,
  });
  const [rows, setRows] = useState<SetRowState[]>([blankSetRow()]);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [targetPace, setTargetPace] = useState("");
  const [appliedTemplate, setAppliedTemplate] = useState<WorkoutTemplate | null>(null);

  // Re-seed whenever the sheet is opened for a different day / entry.
  useEffect(() => {
    if (!open) return;
    const currentUnits = readUnitPreference();
    setUnits(currentUnits);
    setStatus(seed.status);
    setDayKey(seed.dayKey);
    setStartTime((seed.log?.scheduled_time ?? "").slice(0, 5));
    setRepeatDays([]);
    setTargetPace("");
    setAppliedTemplate(null);
    const log = seed.log;
    setType(((log?.workout_type as WorkoutType) ?? "strength") as WorkoutType);
    setTitle(log?.title ?? "");
    setDuration(log?.duration_min != null ? String(round(log.duration_min)) : "");
    setRpe(log?.rpe != null ? String(round(log.rpe)) : "");
    setCalories(log?.calories != null ? String(Math.round(log.calories)) : "");
    setDistance(
      log?.distance_m != null ? String(round(fromMetres(log.distance_m, currentUnits), 2)) : "",
    );
    setAvgHr(log?.avg_hr != null ? String(Math.round(log.avg_hr)) : "");
    setMaxHr(log?.max_hr != null ? String(Math.round(log.max_hr)) : "");
    setNotes(log?.notes ?? "");
    setTags(readTags((log as { tags?: unknown } | null | undefined)?.tags));
    setSleepQuality(
      clampRating((log as { sleep_quality?: number | null } | null)?.sleep_quality ?? null),
    );
    setStressLevel(
      clampRating((log as { stress_level?: number | null } | null)?.stress_level ?? null),
    );
    const seededRows: SetRowState[] = (seed.sets ?? []).map((s) => ({
      key: s.id,
      exercise: s.exercise,
      sets: s.sets != null ? String(s.sets) : "",
      reps: s.reps != null ? String(round(s.reps)) : "",
      weight: s.weight_kg != null ? String(round(fromKg(s.weight_kg, currentUnits), 1)) : "",
      rest: "",
      tempo: "",
    }));
    setRows(seededRows.length > 0 ? seededRows : [blankSetRow()]);
  }, [open, seed]);

  const meta = workoutTypeMeta(type);
  const isStrength = meta.family === "strength";
  const showExercises = meta.tracksSets === true;
  const builtInSuggestions = useMemo(() => exerciseOptions(type), [type]);

  const parsedRows = useMemo(
    () =>
      rows
        .filter((r) => r.exercise.trim() !== "")
        .map((r) => ({
          exercise: r.exercise.trim(),
          sets: num(r.sets),
          reps: num(r.reps),
          weightKg: (() => {
            const w = num(r.weight);
            return w == null ? null : toKg(w, units);
          })(),
        })),
    [rows, units],
  );

  const volumeKg = totalVolumeKg(parsedRows);
  const durationMin = num(duration);
  const distanceMetres = (() => {
    const d = num(distance);
    return d == null ? null : toMetres(d, units);
  })();
  const pace = paceSecondsPerUnit(durationMin, distanceMetres, units);
  const targetPaceSeconds = parsePaceInput(targetPace);

  /* -------------------- templates -------------------- */

  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateNameOpen, setTemplateNameOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [templateFamily, setTemplateFamily] =
    useState<(typeof TEMPLATE_FAMILIES)[number]["key"]>("all");

  const templates = useQuery({
    queryKey: ["workout-templates"],
    queryFn: fetchWorkoutTemplates,
    enabled: open,
    staleTime: 60_000,
  });

  const visibleTemplates = useMemo(() => {
    const matched = filterTemplates(templates.data ?? [], templateQuery);
    if (templateFamily === "all") return matched;
    return matched.filter((t) => workoutFamily(t.workout_type) === templateFamily);
  }, [templates.data, templateQuery, templateFamily]);

  /** Built-in starters the user hasn't copied yet, scoped to the family filter. */
  const starters = useMemo(
    () =>
      unusedStarters(
        (templates.data ?? []).map((t) => t.name),
        templateFamily,
      ),
    [templates.data, templateFamily],
  );

  const addStarter = useMutation({
    mutationFn: (starter: StarterTemplate) => saveWorkoutTemplate(starter.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout-templates"] }),
  });

  /** Fills every field from a saved template, leaving the date/status alone. */
  function applyTemplate(template: WorkoutTemplate) {
    setType((template.workout_type as WorkoutType) ?? "strength");
    setTitle(template.name);
    setDuration(template.duration_min != null ? String(round(template.duration_min)) : "");
    setRpe(template.rpe != null ? String(round(template.rpe)) : "");
    setCalories(template.calories != null ? String(Math.round(template.calories)) : "");
    setDistance(
      template.distance_m != null ? String(round(fromMetres(template.distance_m, units), 2)) : "",
    );
    setAvgHr(template.target_hr != null ? String(Math.round(template.target_hr)) : "");
    setTargetPace(formatPaceInput(template.target_pace_s));
    setNotes(template.notes ?? "");
    const templateRows: SetRowState[] = template.exercises.map((e) => ({
      key: e.id,
      exercise: e.exercise,
      sets: e.sets != null ? String(e.sets) : "",
      reps: e.reps != null ? String(round(e.reps)) : "",
      weight: e.weight_kg != null ? String(round(fromKg(e.weight_kg, units), 1)) : "",
      rest: e.rest_seconds != null ? String(e.rest_seconds) : "",
      tempo: e.tempo ?? "",
    }));
    setRows(templateRows.length > 0 ? templateRows : [blankSetRow()]);
    setAppliedTemplate(template);
    setPickerOpen(false);
    void markTemplateUsed(template).catch(() => {});
  }

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const existing = appliedTemplate;
      const name = templateName.trim() || title.trim() || existing?.name || "";
      await saveWorkoutTemplate(
        {
          name,
          workoutType: type,
          durationMin,
          rpe: num(rpe),
          calories: num(calories),
          distanceM: distanceMetres,
          targetPaceS: targetPaceSeconds ?? pace,
          targetHr: num(avgHr),
          notes: notes.trim() || null,
          exercises: rows
            .filter((r) => r.exercise.trim() !== "")
            .map((r) => {
              const w = num(r.weight);
              return {
                exercise: r.exercise,
                sets: num(r.sets),
                reps: num(r.reps),
                weightKg: w == null ? null : toKg(w, units),
                restSeconds: num(r.rest),
                tempo: r.tempo || null,
              };
            }),
        },
        existing && existing.name === name ? existing.id : undefined,
      );
    },
    onSuccess: () => {
      setTemplateNameOpen(false);
      setTemplateName("");
      qc.invalidateQueries({ queryKey: ["workout-templates"] });
    },
  });

  const removeTemplate = useMutation({
    mutationFn: (id: string) => deleteWorkoutTemplate(id),
    onSuccess: (_data, id) => {
      setConfirmDeleteId(null);
      setAppliedTemplate((cur) => (cur?.id === id ? null : cur));
      qc.invalidateQueries({ queryKey: ["workout-templates"] });
    },
  });

  const renameTemplate = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWorkoutTemplate(id, name),
    onSuccess: (name, { id }) => {
      setRenamingId(null);
      setAppliedTemplate((cur) => (cur?.id === id ? { ...cur, name } : cur));
      qc.invalidateQueries({ queryKey: ["workout-templates"] });
    },
  });

  /* -------------------- custom exercises -------------------- */

  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  const customExercises = useQuery({
    queryKey: ["custom-exercises"],
    queryFn: fetchCustomExercises,
    enabled: open,
    staleTime: 60_000,
  });

  const customRows = customExercises.data ?? [];

  const addCustomExercise = useMutation({
    mutationFn: () =>
      saveCustomExercise({
        name: customName,
        category: customCategory,
        workoutType: type,
        family: workoutFamily(type),
      }),
    onSuccess: (row) => {
      setCustomName("");
      qc.invalidateQueries({ queryKey: ["custom-exercises"] });
      insertExercise(row.name);
    },
  });

  const removeCustomExercise = useMutation({
    mutationFn: (id: string) => deleteCustomExercise(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-exercises"] }),
  });

  /** Drops a name into the first empty exercise row, or appends a new one. */
  function insertExercise(name: string) {
    setRows((prev) => {
      const index = prev.findIndex((r) => r.exercise.trim() === "");
      if (index === -1) return [...prev, { ...blankSetRow(), exercise: name }];
      const next = [...prev];
      next[index] = { ...next[index], exercise: name };
      return next;
    });
  }

  // Custom names first so a user's own vocabulary wins in the suggestion list.
  const exerciseSuggestions = useMemo(() => {
    const custom = customExercisesForType(customRows, type).map((r) => r.name);
    const seen = new Set(custom.map((n) => n.toLowerCase()));
    return [...custom, ...builtInSuggestions.filter((n) => !seen.has(n.toLowerCase()))];
  }, [customRows, type, builtInSuggestions]);

  const customCategoryOptions = useMemo(() => customCategories(customRows), [customRows]);

  const customGroups = useMemo(
    () => groupCustomExercises(customExercisesForType(customRows, type)),
    [customRows, type],
  );

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const basePayload = {
        user_id: userId,
        status,
        workout_type: type,
        title: title.trim() || null,
        duration_min: durationMin,
        rpe: num(rpe),
        calories: num(calories),
        distance_m: distanceMetres,
        avg_pace_s: pace,
        avg_hr: num(avgHr),
        max_hr: num(maxHr),
        notes: notes.trim() || null,
        tags,
        sleep_quality: sleepQuality,
        stress_level: stressLevel,
        scheduled_time: status === "planned" && startTime ? startTime : null,
      };

      // Editing / converting a planned entry replaces it in place.
      const targetId = seed.convertFromId ?? seed.log?.id;
      let logId: string;
      if (targetId) {
        const { error } = await supabase
          .from("workout_logs")
          .update({ ...basePayload, performed_on: dayKey })
          .eq("id", targetId);
        if (error) throw error;
        logId = targetId;
        const { error: delError } = await supabase
          .from("workout_sets")
          .delete()
          .eq("workout_log_id", targetId);
        if (delError) throw delError;
      } else {
        const { data, error } = await supabase
          .from("workout_logs")
          .insert({ ...basePayload, performed_on: dayKey })
          .select("id")
          .single();
        if (error) throw error;
        logId = data.id;
      }

      if (showExercises && parsedRows.length > 0) {
        const { error } = await supabase.from("workout_sets").insert(
          parsedRows.map((r, index) => ({
            workout_log_id: logId,
            user_id: userId,
            exercise: r.exercise,
            set_index: index,
            sets: r.sets != null ? Math.round(r.sets) : null,
            reps: r.reps,
            weight_kg: r.weightKg,
          })),
        );
        if (error) throw error;
      }

      // Weekly repeat only makes sense for things you plan to do.
      if (status === "planned" && repeatDays.length > 0 && !targetId) {
        const extra = repeatPlanDates(dayKey, repeatDays, repeatWeeks);
        if (extra.length > 0) {
          const { error } = await supabase
            .from("workout_logs")
            .insert(extra.map((date) => ({ ...basePayload, performed_on: date })));
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-recent-tags"] });
      onSaved();
      onOpenChange(false);
    },
  });

  const wLabel = weightUnitLabel(units);

  // Illustration for the currently picked workout type (yoga, boxing, …).
  const selectedTypeArt = (() => {
    const selected = TYPE_GROUPS.flatMap((g) => g.types).find((t) => t.key === type);
    if (!selected) return null;
    return exerciseArt(selected.label) ? { label: selected.label, art: selected.label } : null;
  })();

  const dLabel = distanceUnitLabel(units);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] w-full max-w-full overflow-y-auto overflow-x-hidden rounded-t-3xl px-4 sm:px-6"
      >
        <SheetHeader className="text-left">
          <SheetTitle>
            {seed.log ? "Edit workout" : status === "planned" ? "Plan a workout" : "Log a workout"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5 pb-10">
          {/* Reusable templates */}
          <div className="rounded-xl border border-border p-3">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              className="tap-target flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Layers className="h-4 w-4 text-primary" />
                {appliedTemplate ? `Template: ${appliedTemplate.name}` : "Start from a template"}
              </span>
              <span className="text-xs text-muted-foreground">
                {pickerOpen ? "Hide" : `${templates.data?.length ?? 0} saved`}
              </span>
            </button>

            {pickerOpen && (
              <div className="mt-3 space-y-2">
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Filter templates by family"
                >
                  {TEMPLATE_FAMILIES.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setTemplateFamily(f.key)}
                      aria-pressed={templateFamily === f.key}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        templateFamily === f.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {(templates.data?.length ?? 0) > 0 && (
                  <Input
                    value={templateQuery}
                    onChange={(e) => setTemplateQuery(e.target.value)}
                    placeholder="Search templates, exercises…"
                    aria-label="Search templates"
                    type="search"
                  />
                )}
                {templates.isLoading && (
                  <p className="text-xs text-muted-foreground">Loading templates…</p>
                )}
                {!templates.isLoading && (templates.data?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No templates yet. Fill this workout in, then tap “Save as template” at the
                    bottom to reuse it.
                  </p>
                )}
                {!templates.isLoading &&
                  (templates.data?.length ?? 0) > 0 &&
                  visibleTemplates.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No templates match “{templateQuery.trim()}”.
                    </p>
                  )}
                {visibleTemplates.map((template) => {
                  const templateArts = template.exercises
                    .map((e) => exerciseArt(e.exercise.trim()))
                    .filter(Boolean) as string[];
                  return (
                    <div
                      key={template.id}
                      className="flex items-center gap-2 rounded-lg border border-border p-2"
                    >
                      {renamingId === template.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            aria-label={`Rename template ${template.name}`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                renameTemplate.mutate({ id: template.id, name: renameValue });
                              }
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                          />
                          <button
                            type="button"
                            className="tap-target rounded-lg border border-border px-2 py-1 text-xs font-medium"
                            disabled={!renameValue.trim() || renameTemplate.isPending}
                            onClick={() =>
                              renameTemplate.mutate({ id: template.id, name: renameValue })
                            }
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="tap-target rounded-lg px-2 py-1 text-xs text-muted-foreground"
                            onClick={() => setRenamingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          {templateArts.length > 0 && (
                            <ExerciseArtThumbnail
                              exercise={template.exercises[0]?.exercise}
                              size={40}
                              className="h-10 w-10 rounded-md"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-sm font-medium">{template.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {templateSummary(template) || "No details yet"}
                            </p>
                          </button>
                          <button
                            type="button"
                            aria-label={`Rename template ${template.name}`}
                            onClick={() => {
                              setRenamingId(template.id);
                              setRenameValue(template.name);
                              setConfirmDeleteId(null);
                            }}
                            className="tap-target rounded-lg border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {confirmDeleteId === template.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-label={`Confirm delete template ${template.name}`}
                                disabled={removeTemplate.isPending}
                                onClick={() => removeTemplate.mutate(template.id)}
                                className="tap-target rounded-lg bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="tap-target rounded-lg px-2 py-1 text-xs text-muted-foreground"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Delete template ${template.name}`}
                              onClick={() => setConfirmDeleteId(template.id)}
                              className="tap-target rounded-lg border border-border px-2 py-1 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                {starters.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Starter templates
                    </p>
                    <div className="space-y-2">
                      {starters.slice(0, 6).map((starter) => (
                        <div
                          key={starter.key}
                          className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{starter.input.name}</p>
                            <p className="text-[11px] text-muted-foreground">{starter.blurb}</p>
                          </div>
                          <button
                            type="button"
                            disabled={addStarter.isPending}
                            onClick={() => addStarter.mutate(starter)}
                            className="tap-target rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(removeTemplate.error || renameTemplate.error) && (
                  <p className="text-xs text-destructive">
                    {((removeTemplate.error ?? renameTemplate.error) as Error).message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Did it / planning it */}

          <div className="flex gap-2">
            <ToggleButton active={status === "completed"} onClick={() => setStatus("completed")}>
              I did this
            </ToggleButton>
            <ToggleButton active={status === "planned"} onClick={() => setStatus("planned")}>
              I plan to
            </ToggleButton>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="workout-date">Date</FieldLabel>
              <input
                id="workout-date"
                type="date"
                value={dayKey}
                onChange={(e) => setDayKey(e.target.value)}
                className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            {status === "planned" ? (
              <div>
                <FieldLabel htmlFor="workout-start-time">Start time</FieldLabel>
                <input
                  id="workout-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  aria-label="Planned start time"
                  className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            ) : null}
            <div>
              <FieldLabel>Units</FieldLabel>
              <div className="mt-1 flex gap-2">
                <ToggleButton
                  active={units === "imperial"}
                  onClick={() => {
                    setUnits("imperial");
                    writeUnitPreference("imperial");
                  }}
                >
                  lb / mi
                </ToggleButton>
                <ToggleButton
                  active={units === "metric"}
                  onClick={() => {
                    setUnits("metric");
                    writeUnitPreference("metric");
                  }}
                >
                  kg / km
                </ToggleButton>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel>Type</FieldLabel>
            <div className="mt-1.5 space-y-2">
              {TYPE_GROUPS.map((group) => {
                const selected = group.types.find((t) => t.key === type);
                const expanded = Boolean(selected) || openFamilies.includes(group.family);
                const panelId = `workout-type-group-${group.family}`;
                return (
                  <div key={group.family} className="rounded-xl border border-border">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() =>
                        setOpenFamilies((prev) =>
                          prev.includes(group.family)
                            ? prev.filter((f) => f !== group.family)
                            : [...prev, group.family],
                        )
                      }
                      className="flex w-full items-center gap-2 px-3 py-2 text-left"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </span>
                      {selected ? (
                        <span className="truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {selected.label}
                        </span>
                      ) : null}
                      <ChevronDown
                        aria-hidden="true"
                        className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <div id={panelId} hidden={!expanded} className="px-3 pb-3">
                      <div className="flex flex-wrap gap-2">
                        {group.types.map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setType(t.key)}
                            aria-pressed={type === t.key}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              type === t.key
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedTypeArt ? (
              <div
                role="group"
                aria-label={`${selectedTypeArt.label} illustration reference`}
                className="mt-2 flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <ExerciseArtThumbnail
                  exercise={selectedTypeArt.art}
                  label={selectedTypeArt.label}
                  size={56}
                  className="h-14 w-14 shrink-0 rounded-lg"
                  // Single, always-visible reference row: load it eagerly so
                  // the full-size modal is already warm when tapped.
                  priority
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedTypeArt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Tap the picture for a bigger reference.
                  </p>
                </div>
              </div>
            ) : null}

          </div>


          <div>
            <FieldLabel htmlFor="workout-name">Name (optional)</FieldLabel>
            <input
              id="workout-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isStrength
                  ? "Push day, Legs…"
                  : meta.family === "cardio"
                    ? "Easy run, intervals…"
                    : meta.family === "mindbody"
                      ? "Morning flow, mobility…"
                      : "Pickup game, class…"
              }
              className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Minutes" value={duration} onChange={setDuration} />
            <NumberField label="Effort (1–10)" value={rpe} onChange={setRpe} />
            <NumberField label="Calories" value={calories} onChange={setCalories} />
          </div>

          {meta.tracksDistance && (
            <div>
              <SectionTitle>Cardio</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label={`Distance (${dLabel})`}
                  value={distance}
                  onChange={setDistance}
                />
                <NumberField label="Avg HR" value={avgHr} onChange={setAvgHr} />
                <NumberField label="Max HR" value={maxHr} onChange={setMaxHr} />
              </div>
              <div className="mt-2">
                <FieldLabel htmlFor="workout-target-pace">
                  Target pace (min:sec / {dLabel})
                </FieldLabel>
                <input
                  id="workout-target-pace"
                  value={targetPace}
                  onChange={(e) => setTargetPace(e.target.value)}
                  placeholder="8:30"
                  inputMode="numeric"
                  aria-label={`Target pace per ${dLabel}`}
                  className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                {targetPace.trim() !== "" && targetPaceSeconds == null && (
                  <p className="mt-1 text-[11px] text-destructive">Use a min:sec pace like 8:30.</p>
                )}
              </div>
              {pace != null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Pace:{" "}
                  <span className="font-medium text-foreground">
                    {formatPace(pace)} / {dLabel}
                  </span>
                  {targetPaceSeconds != null && (
                    <>
                      {" "}
                      · target {formatPace(targetPaceSeconds)} / {dLabel}
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {showExercises && (
            <div>
              <SectionTitle>Exercises</SectionTitle>
              <MuscleGroupPicker
                onPick={insertExercise}
                chosen={rows.map((r) => r.exercise)}
              />
              <ExerciseSearchGrid
                names={exerciseSuggestions}
                onPick={insertExercise}
                chosen={rows.map((r) => r.exercise)}
              />
              <div className="mb-2 rounded-xl border border-border p-3">
                <button
                  type="button"
                  onClick={() => setCustomOpen((v) => !v)}
                  aria-expanded={customOpen}
                  className="tap-target flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="text-sm font-medium">My exercises</span>
                  <span className="text-xs text-muted-foreground">
                    {customOpen ? "Hide" : `${customRows.length} saved`}
                  </span>
                </button>

                {customOpen && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Exercise name"
                        aria-label="Custom exercise name"
                        className="min-w-[9rem] flex-1"
                      />
                      <Input
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Category (optional)"
                        aria-label="Custom exercise category"
                        list="workout-custom-categories"
                        className="min-w-[9rem] flex-1"
                      />
                      <button
                        type="button"
                        disabled={!customName.trim() || addCustomExercise.isPending}
                        onClick={() => addCustomExercise.mutate()}
                        className="tap-target rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                    <datalist id="workout-custom-categories">
                      {customCategoryOptions.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    {addCustomExercise.error && (
                      <p className="text-xs text-destructive">
                        {(addCustomExercise.error as Error).message}
                      </p>
                    )}
                    {customRows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Save your own exercises — and your own category names — and they show up in
                        the suggestions here every time.
                      </p>
                    ) : (
                      customGroups.map((group) => (
                        <div key={group.label}>
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            {group.label}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.rows.map((row: CustomExerciseRow) => (
                              <span
                                key={row.id}
                                className="flex items-center gap-1 rounded-full border border-border py-1 pl-2.5 pr-1 text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    insertExercise(row.name);
                                    void markCustomExerciseUsed(row).catch(() => {});
                                  }}
                                  className="font-medium"
                                >
                                  {row.name}
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Delete custom exercise ${row.name}`}
                                  onClick={() => removeCustomExercise.mutate(row.id)}
                                  className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <datalist id={EXERCISE_LIST_ID}>
                {exerciseSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <div className="space-y-2">
                {rows.map((row, index) => {
                  const weight = num(row.weight);
                  const oneRm = estimateOneRepMaxKg(
                    weight == null ? null : toKg(weight, units),
                    num(row.reps),
                  );
                  return (
                    <div key={row.key} className="rounded-xl border border-border p-2">
                      <div className="flex items-center gap-2">
                        <ExerciseArtThumbnail
                          exercise={row.exercise.trim()}
                          size={44}
                          className="h-11 w-11 rounded-lg"
                        />
                        <input
                          value={row.exercise}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) =>
                                i === index ? { ...r, exercise: e.target.value } : r,
                              ),
                            )
                          }
                          placeholder="Exercise"
                          list={EXERCISE_LIST_ID}
                          aria-label={`Exercise ${index + 1}`}
                          className="tap-target min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label={`Remove exercise ${index + 1}`}
                          onClick={() =>
                            setRows((prev) =>
                              prev.length === 1
                                ? [blankSetRow()]
                                : prev.filter((_, i) => i !== index),
                            )
                          }
                          className="tap-target rounded-lg border border-border px-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <NumberField
                          label="Sets"
                          value={row.sets}
                          onChange={(v) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, sets: v } : r)),
                            )
                          }
                        />
                        <NumberField
                          label="Reps"
                          value={row.reps}
                          onChange={(v) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, reps: v } : r)),
                            )
                          }
                        />
                        <NumberField
                          label={`Weight (${wLabel})`}
                          value={row.weight}
                          onChange={(v) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, weight: v } : r)),
                            )
                          }
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <NumberField
                          label="Rest (sec)"
                          value={row.rest}
                          onChange={(v) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, rest: v } : r)),
                            )
                          }
                        />
                        <div className="min-w-0">
                          <FieldLabel htmlFor={`workout-tempo-${row.key}`}>Tempo</FieldLabel>
                          <input
                            id={`workout-tempo-${row.key}`}
                            value={row.tempo}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, tempo: e.target.value } : r,
                                ),
                              )
                            }
                            placeholder="3-1-1"
                            aria-label={`Tempo for exercise ${index + 1}`}
                            className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      {oneRm != null && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          Estimated 1RM {round(fromKg(oneRm, units))} {wLabel}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, blankSetRow()])}
                className="tap-target mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" /> Add exercise
              </button>
              {volumeKg > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Total volume:{" "}
                  <span className="font-medium text-foreground">
                    {Math.round(fromKg(volumeKg, units)).toLocaleString()} {wLabel}
                  </span>
                </p>
              )}
            </div>
          )}

          {status === "planned" && !seed.log && (
            <div>
              <SectionTitle>Repeat weekly (optional)</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={repeatDays.includes(index)}
                    onClick={() =>
                      setRepeatDays((prev) =>
                        prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index],
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      repeatDays.includes(index)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {repeatDays.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>for the next</span>
                  <select
                    value={repeatWeeks}
                    onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    aria-label="Repeat for weeks"
                  >
                    {[2, 4, 8, 12].map((w) => (
                      <option key={w} value={w}>
                        {w} weeks
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <FieldLabel htmlFor="workout-notes">Notes (optional)</FieldLabel>
            <textarea
              id="workout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="How it felt, soreness, what to change next time…"
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <SessionContextFields
            tags={tags}
            onTagsChange={setTags}
            sleepQuality={sleepQuality}
            onSleepChange={setSleepQuality}
            stressLevel={stressLevel}
            onStressChange={setStressLevel}
            recentTags={recentTags.data ?? []}
          />

          {save.error && (
            <p className="text-sm text-destructive">{(save.error as Error).message}</p>
          )}
          {saveTemplate.error && (
            <p className="text-sm text-destructive">{(saveTemplate.error as Error).message}</p>
          )}

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : status === "planned" ? "Save plan" : "Save workout"}
          </button>

          {/* Reuse this session later */}
          {templateNameOpen ? (
            <div className="rounded-xl border border-border p-3">
              <FieldLabel htmlFor="workout-template-name">Template name</FieldLabel>
              <input
                id="workout-template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={title.trim() || "Push day A"}
                aria-label="Template name"
                className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => saveTemplate.mutate()}
                  disabled={saveTemplate.isPending || (!templateName.trim() && !title.trim())}
                  className="flex-1 rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-50"
                >
                  {saveTemplate.isPending ? "Saving…" : "Save template"}
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateNameOpen(false)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTemplateName(appliedTemplate?.name ?? title.trim());
                setTemplateNameOpen(true);
              }}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <BookmarkPlus className="h-4 w-4" />
              {appliedTemplate ? "Update / save as template" : "Save as template"}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Future dates matching the chosen weekdays, for the next N weeks. */
export function repeatPlanDates(startDayKey: string, weekdays: number[], weeks: number): string[] {
  const [y, m, d] = startDayKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
  const out: string[] = [];
  const totalDays = weeks * 7;
  for (let i = 1; i <= totalDays; i++) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    if (!weekdays.includes(day.getUTCDay())) continue;
    out.push(
      `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(
        day.getUTCDate(),
      ).padStart(2, "0")}`,
    );
  }
  return out;
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  /**
   * Ties the label to its control. Without it the <label> is orphaned: screen
   * readers announce the input as unlabelled and tapping the text does not
   * focus the field.
   */
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // Generated per instance: these fields are rendered in lists (one per set
  // row), so a hardcoded id would produce duplicates.
  const id = useId();
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DecimalInput
        id={id}
        value={value}
        onValueChange={onChange}
        aria-label={label}
        className="tap-target mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
