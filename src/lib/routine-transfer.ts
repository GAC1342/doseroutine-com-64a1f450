/**
 * Export / import for saved routines and their weekly recurrence rules.
 *
 * One JSON file holds every template (with its exercises) plus the repeat
 * rules pointing at them, so a schedule can be moved to another device or
 * shared with a training partner without rebuilding anything.
 */

import { saveWorkoutTemplate, type WorkoutTemplate } from "@/lib/workout-templates";
import {
  repeatRoutineWeekly,
  saveTimeOverrides,
  sortWeekdays,
  type RoutineAssignment,
} from "@/lib/repeat-routine";
import {
  normalizeInterval,
  parseDateOverrides,
  parseTimeOverrides,
} from "@/lib/routine-recurrence";
import type { WorkoutType } from "@/lib/workout-types";

export const ROUTINE_BACKUP_VERSION = 1;
export const ROUTINE_BACKUP_KIND = "doseroutine.routines";

export type RoutineBackupExercise = {
  exercise: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  restSeconds: number | null;
  tempo: string | null;
};

export type RoutineBackupTemplate = {
  name: string;
  workoutType: string;
  durationMin: number | null;
  rpe: number | null;
  calories: number | null;
  distanceM: number | null;
  targetPaceS: number | null;
  targetHr: number | null;
  notes: string | null;
  exercises: RoutineBackupExercise[];
};

export type RoutineBackupSchedule = {
  /** Template name this repeat rule points at. */
  templateName: string;
  weekdays: number[];
  time: string;
  durationMin: number | null;
  intervalWeeks: number;
  anchorDate: string | null;
  timeOverrides: Record<string, string>;
};

export type RoutineBackup = {
  kind: typeof ROUTINE_BACKUP_KIND;
  version: number;
  exportedAt: string;
  templates: RoutineBackupTemplate[];
  schedules: RoutineBackupSchedule[];
};

/** Builds the backup payload from what's already loaded in the UI. */
export function buildRoutineBackup(
  templates: WorkoutTemplate[],
  assignments: RoutineAssignment[],
  now = new Date(),
): RoutineBackup {
  const nameById = new Map(templates.map((t) => [t.id, t.name]));
  return {
    kind: ROUTINE_BACKUP_KIND,
    version: ROUTINE_BACKUP_VERSION,
    exportedAt: now.toISOString(),
    templates: templates.map((t) => ({
      name: t.name,
      workoutType: t.workout_type,
      durationMin: t.duration_min,
      rpe: t.rpe,
      calories: t.calories,
      distanceM: t.distance_m,
      targetPaceS: t.target_pace_s,
      targetHr: t.target_hr,
      notes: t.notes,
      exercises: [...t.exercises]
        .sort((a, b) => a.set_index - b.set_index)
        .map((e) => ({
          exercise: e.exercise,
          sets: e.sets,
          reps: e.reps,
          weightKg: e.weight_kg,
          restSeconds: e.rest_seconds,
          tempo: e.tempo,
        })),
    })),
    schedules: assignments
      .filter((a) => a.templateId && nameById.has(a.templateId))
      .map((a) => ({
        templateName: nameById.get(a.templateId as string) as string,
        weekdays: sortWeekdays(a.weekdays),
        time: a.time,
        durationMin: a.durationMin,
        intervalWeeks: normalizeInterval(a.intervalWeeks),
        anchorDate: a.anchorDate,
        timeOverrides: Object.fromEntries(
          Object.entries(a.timeOverrides).map(([k, v]) => [String(k), v]),
        ),
      })),
  };
}

export function backupFilename(now = new Date()): string {
  return `doseroutine-routines-${now.toISOString().slice(0, 10)}.json`;
}

/** Validates an uploaded file. Throws a plain-English message when it can't be read. */
export function parseRoutineBackup(text: string): RoutineBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a routine backup — it isn't valid JSON.");
  }
  if (!raw || typeof raw !== "object") throw new Error("That file isn't a routine backup.");
  const obj = raw as Record<string, unknown>;
  if (obj.kind !== ROUTINE_BACKUP_KIND) throw new Error("That file isn't a routine backup.");
  if (Number(obj.version) > ROUTINE_BACKUP_VERSION) {
    throw new Error("This backup was made by a newer version of the app.");
  }

  const templates = Array.isArray(obj.templates) ? obj.templates : [];
  const schedules = Array.isArray(obj.schedules) ? obj.schedules : [];

  const cleanTemplates: RoutineBackupTemplate[] = [];
  for (const item of templates) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const name = String(t.name ?? "").trim();
    if (!name) continue;
    const exercises = Array.isArray(t.exercises) ? t.exercises : [];
    cleanTemplates.push({
      name,
      workoutType: String(t.workoutType ?? "strength"),
      durationMin: numberOrNull(t.durationMin),
      rpe: numberOrNull(t.rpe),
      calories: numberOrNull(t.calories),
      distanceM: numberOrNull(t.distanceM),
      targetPaceS: numberOrNull(t.targetPaceS),
      targetHr: numberOrNull(t.targetHr),
      notes: t.notes == null ? null : String(t.notes),
      exercises: exercises.flatMap((e) => {
        if (!e || typeof e !== "object") return [];
        const ex = e as Record<string, unknown>;
        const label = String(ex.exercise ?? "").trim();
        if (!label) return [];
        return [
          {
            exercise: label,
            sets: numberOrNull(ex.sets),
            reps: numberOrNull(ex.reps),
            weightKg: numberOrNull(ex.weightKg),
            restSeconds: numberOrNull(ex.restSeconds),
            tempo: ex.tempo == null ? null : String(ex.tempo),
          },
        ];
      }),
    });
  }

  const names = new Set(cleanTemplates.map((t) => t.name));
  const cleanSchedules: RoutineBackupSchedule[] = [];
  for (const item of schedules) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const templateName = String(s.templateName ?? "").trim();
    if (!templateName || !names.has(templateName)) continue;
    const weekdays = sortWeekdays(Array.isArray(s.weekdays) ? s.weekdays.map(Number) : []);
    if (weekdays.length === 0) continue;
    cleanSchedules.push({
      templateName,
      weekdays,
      time: /^\d{2}:\d{2}$/.test(String(s.time ?? "")) ? String(s.time) : "18:00",
      durationMin: numberOrNull(s.durationMin),
      intervalWeeks: normalizeInterval(numberOrNull(s.intervalWeeks) ?? 1),
      anchorDate: /^\d{4}-\d{2}-\d{2}$/.test(String(s.anchorDate ?? ""))
        ? String(s.anchorDate)
        : null,
      timeOverrides: collectOverrides(s.timeOverrides),
    });
  }

  if (cleanTemplates.length === 0) throw new Error("That backup has no routines in it.");

  return {
    kind: ROUTINE_BACKUP_KIND,
    version: ROUTINE_BACKUP_VERSION,
    exportedAt: String(obj.exportedAt ?? new Date().toISOString()),
    templates: cleanTemplates,
    schedules: cleanSchedules,
  };
}

/** Weekday ("0".."6") and date ("YYYY-MM-DD") time overrides, merged. */
function collectOverrides(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parseTimeOverrides(value))) out[String(k)] = v;
  for (const [k, v] of Object.entries(parseDateOverrides(value))) out[k] = v;
  return out;
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Names that already exist get " (imported)" so nothing is silently replaced. */
export function uniqueName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  const base = `${name} (imported)`;
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base} ${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base} ${Date.now()}`;
}

export type ImportResult = { templates: number; schedules: number };

/** Writes an imported backup into the signed-in user's account. */
export async function importRoutineBackup(
  backup: RoutineBackup,
  existingNames: ReadonlySet<string>,
): Promise<ImportResult> {
  const taken = new Set(existingNames);
  const idByName = new Map<string, string>();
  const finalNameByOriginal = new Map<string, string>();

  for (const template of backup.templates) {
    const name = uniqueName(template.name, taken);
    taken.add(name);
    finalNameByOriginal.set(template.name, name);
    const id = await saveWorkoutTemplate({
      name,
      workoutType: (template.workoutType || "strength") as WorkoutType,
      durationMin: template.durationMin,
      rpe: template.rpe,
      calories: template.calories,
      distanceM: template.distanceM,
      targetPaceS: template.targetPaceS,
      targetHr: template.targetHr,
      notes: template.notes,
      exercises: template.exercises.map((e) => ({
        exercise: e.exercise,
        sets: e.sets,
        reps: e.reps,
        weightKg: e.weightKg,
        restSeconds: e.restSeconds,
        tempo: e.tempo,
      })),
    });
    idByName.set(name, id);
  }

  let schedules = 0;
  for (const schedule of backup.schedules) {
    const name = finalNameByOriginal.get(schedule.templateName);
    const templateId = name ? idByName.get(name) : undefined;
    if (!templateId || !name) continue;
    const sessionId = await repeatRoutineWeekly({
      templateId,
      label: name,
      weekdays: schedule.weekdays,
      time: schedule.time,
      durationMin: schedule.durationMin,
      intervalWeeks: schedule.intervalWeeks,
      anchorDate: schedule.anchorDate,
    });
    await saveTimeOverrides(sessionId, schedule.timeOverrides);
    schedules += 1;
  }

  return { templates: backup.templates.length, schedules };
}
