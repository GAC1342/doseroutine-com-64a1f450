/**
 * Health sync engine. Pulls body weight / steps / active energy / heart rate
 * from Health and mirrors completed workouts + meal nutrition back into
 * Health. Uses a per-user, localStorage-persisted watermark so repeated
 * syncs are incremental and never create duplicate `body_metrics` rows or
 * duplicate Health samples.
 *
 * Note: `body_metrics` only has a column for body weight, so that's the only
 * pulled metric persisted to Supabase. Steps / active energy / heart rate are
 * read from Health and surfaced as live status in the UI, but aren't written
 * to a table that has no columns for them — adding those columns is a schema
 * change outside this feature's scope.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  getHealthConnectionState,
  readHealthSamples,
  writeNutrition,
  writeWorkout,
  type HealthScope,
} from "@/lib/health-bridge";

type Watermarks = {
  pullWeightSince: string | null;
  pushWorkoutsSince: string | null;
  pushNutritionSince: string | null;
  syncedWorkoutIds: string[];
  syncedMealIds: string[];
  lastSyncedAt: string | null;
};

const WATERMARK_KEY = "dr-health-sync-watermarks-v1";
const MAX_ID_HISTORY = 500;

function defaultWatermarks(): Watermarks {
  return {
    pullWeightSince: null,
    pushWorkoutsSince: null,
    pushNutritionSince: null,
    syncedWorkoutIds: [],
    syncedMealIds: [],
    lastSyncedAt: null,
  };
}

function loadWatermarks(): Watermarks {
  if (typeof window === "undefined") return defaultWatermarks();
  try {
    const raw = window.localStorage.getItem(WATERMARK_KEY);
    if (!raw) return defaultWatermarks();
    return { ...defaultWatermarks(), ...(JSON.parse(raw) as Watermarks) };
  } catch {
    return defaultWatermarks();
  }
}

function saveWatermarks(w: Watermarks): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WATERMARK_KEY, JSON.stringify(w));
  } catch {
    /* non-fatal */
  }
}

export type MetricSyncStatus = {
  scope: HealthScope;
  attempted: boolean;
  ok: boolean;
  count: number;
  reason?: string;
};

export type SyncResult = {
  ranAt: string;
  metrics: MetricSyncStatus[];
};

function isoOrNow(v: string | null): string {
  return v ?? new Date(0).toISOString();
}

/**
 * A connection that is technically "online" but stalled would otherwise leave
 * every await here pending forever (a real risk on cellular during review).
 * Every network hop gets a hard ceiling, and each sample loop stops early once
 * the whole pass has burned its budget so the caller always gets a result.
 */
const CALL_TIMEOUT_MS = 15_000;
const PASS_BUDGET_MS = 60_000;

function withSyncTimeout<T>(op: PromiseLike<T>, label: string, ms = CALL_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    Promise.resolve(op).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Runs one incremental sync pass for the given user. Every branch is
 * independent: a permission the user denied (or a step that throws) is
 * recorded as a non-fatal per-metric status instead of aborting the rest.
 */
export async function runHealthSync(userId: string): Promise<SyncResult> {
  const state = getHealthConnectionState();
  const watermarks = loadWatermarks();
  const metrics: MetricSyncStatus[] = [];
  const now = new Date().toISOString();
  const deadline = Date.now() + PASS_BUDGET_MS;

  // ── Pull: body weight → body_metrics ────────────────────────────────
  if (state.read.weight === "granted") {
    try {
      const since = isoOrNow(watermarks.pullWeightSince);
      const { ok, samples, reason } = await withSyncTimeout(
        readHealthSamples({
          dataType: "weight",
          startDate: since,
          endDate: now,
          limit: 200,
        }),
        "Reading weight from Health",
      );
      if (!ok) {
        metrics.push({ scope: "weight", attempted: true, ok: false, count: 0, reason });
      } else {
        let inserted = 0;
        let truncated = false;
        for (const sample of samples) {
          if (Date.now() > deadline) {
            truncated = true;
            break; // leave the watermark alone so the rest syncs next pass
          }
          // Idempotency: one body_metrics row per exact measured_at timestamp.
          const { data: existing } = await withSyncTimeout(
            supabase
              .from("body_metrics")
              .select("id")
              .eq("user_id", userId)
              .eq("measured_at", sample.endDate)
              .maybeSingle(),
            "Checking existing weight row",
          );
          if (existing) continue;
          const { error } = await withSyncTimeout(
            supabase.from("body_metrics").insert({
              user_id: userId,
              measured_at: sample.endDate,
              weight_kg: sample.unit === "kilogram" ? sample.value : sample.value * 0.45359237,
              notes: "Synced from Health",
            }),
            "Saving weight row",
          );
          if (!error) inserted++;
        }
        if (!truncated) watermarks.pullWeightSince = now;
        metrics.push({ scope: "weight", attempted: true, ok: true, count: inserted });
      }
    } catch (e) {
      metrics.push({
        scope: "weight",
        attempted: true,
        ok: false,
        count: 0,
        reason: e instanceof Error ? e.message : "Sync failed",
      });
    }
  } else {
    metrics.push({ scope: "weight", attempted: false, ok: false, count: 0 });
  }

  // ── Pull: steps / active energy / heart rate → live status only ────
  for (const [scope, dataType] of [
    ["steps", "steps"],
    ["activeEnergy", "calories"],
    ["heartRate", "heartRate"],
  ] as const) {
    if (state.read[scope] !== "granted") {
      metrics.push({ scope, attempted: false, ok: false, count: 0 });
      continue;
    }
    try {
      const { ok, samples, reason } = await withSyncTimeout(
        readHealthSamples({
          dataType,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: now,
          limit: 500,
        }),
        `Reading ${scope} from Health`,
      );
      metrics.push({
        scope,
        attempted: true,
        ok,
        count: samples.length,
        reason: ok ? undefined : reason,
      });
    } catch (e) {
      metrics.push({
        scope,
        attempted: true,
        ok: false,
        count: 0,
        reason: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }

  // ── Push: completed workouts → Health ───────────────────────────────
  if (state.write.workouts === "granted") {
    try {
      const since = isoOrNow(watermarks.pushWorkoutsSince);
      const { data: logs, error } = await withSyncTimeout(
        supabase
          .from("workout_logs")
          .select("id, performed_on, duration_min, calories, title, updated_at, status")
          .eq("user_id", userId)
          .eq("status", "completed")
          .gt("updated_at", since)
          .order("updated_at", { ascending: true })
          .limit(200),
        "Loading completed workouts",
      );
      if (error) throw error;
      const seen = new Set(watermarks.syncedWorkoutIds);
      let pushed = 0;
      let truncated = false;
      for (const log of logs ?? []) {
        if (Date.now() > deadline) {
          truncated = true;
          break; // finish the remainder on the next pass
        }
        if (seen.has(log.id)) continue; // dedupe against duplicate re-syncs
        const durationMin = log.duration_min ?? 30;
        const start = new Date(log.performed_on);
        const end = new Date(start.getTime() + durationMin * 60_000);
        const res = await withSyncTimeout(
          writeWorkout({
            durationMin,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            calories: log.calories,
            title: log.title,
          }),
          "Writing workout to Health",
        );
        if (res.ok) {
          seen.add(log.id);
          pushed++;
        }
      }
      watermarks.syncedWorkoutIds = [...seen].slice(-MAX_ID_HISTORY);
      if (!truncated) watermarks.pushWorkoutsSince = now;
      metrics.push({ scope: "workouts", attempted: true, ok: true, count: pushed });
    } catch (e) {
      metrics.push({
        scope: "workouts",
        attempted: true,
        ok: false,
        count: 0,
        reason: e instanceof Error ? e.message : "Sync failed",
      });
    }
  } else {
    metrics.push({ scope: "workouts", attempted: false, ok: false, count: 0 });
  }

  // ── Push: meal nutrition → Health ───────────────────────────────────
  if (state.write.nutrition === "granted") {
    try {
      const since = isoOrNow(watermarks.pushNutritionSince);
      const { data: meals, error } = await withSyncTimeout(
        supabase
          .from("meals")
          .select(
            "id, logged_at, label, est_calories, adj_calories, est_protein_g, adj_protein_g, est_carbs_g, adj_carbs_g, est_fat_g, adj_fat_g, was_adjusted",
          )
          .eq("user_id", userId)
          .gt("logged_at", since)
          .order("logged_at", { ascending: true })
          .limit(200),
        "Loading meals",
      );
      if (error) throw error;
      const seen = new Set(watermarks.syncedMealIds);
      let pushed = 0;
      let truncated = false;
      for (const meal of meals ?? []) {
        if (Date.now() > deadline) {
          truncated = true;
          break; // finish the remainder on the next pass
        }
        if (seen.has(meal.id)) continue; // dedupe
        const calories = meal.was_adjusted
          ? meal.adj_calories
          : (meal.adj_calories ?? meal.est_calories);
        const protein = meal.was_adjusted
          ? meal.adj_protein_g
          : (meal.adj_protein_g ?? meal.est_protein_g);
        const carbs = meal.was_adjusted ? meal.adj_carbs_g : (meal.adj_carbs_g ?? meal.est_carbs_g);
        const fat = meal.was_adjusted ? meal.adj_fat_g : (meal.adj_fat_g ?? meal.est_fat_g);
        const res = await withSyncTimeout(
          writeNutrition({
            loggedAt: meal.logged_at ?? new Date().toISOString(),
            calories,
            proteinG: protein,
            carbsG: carbs,
            fatG: fat,
            label: meal.label,
          }),
          "Writing nutrition to Health",
        );
        if (res.ok) {
          seen.add(meal.id);
          pushed++;
        }
      }
      watermarks.syncedMealIds = [...seen].slice(-MAX_ID_HISTORY);
      if (!truncated) watermarks.pushNutritionSince = now;
      metrics.push({ scope: "nutrition", attempted: true, ok: true, count: pushed });
    } catch (e) {
      metrics.push({
        scope: "nutrition",
        attempted: true,
        ok: false,
        count: 0,
        reason: e instanceof Error ? e.message : "Sync failed",
      });
    }
  } else {
    metrics.push({ scope: "nutrition", attempted: false, ok: false, count: 0 });
  }

  watermarks.lastSyncedAt = now;
  saveWatermarks(watermarks);
  const result: SyncResult = { ranAt: now, metrics };
  saveLastSyncResult(result);
  return result;
}

export function getLastSyncedAt(): string | null {
  return loadWatermarks().lastSyncedAt;
}

/* ── Last-run record (powers the in-app sync status panel) ─────────────── */

const LAST_RESULT_KEY = "dr-health-sync-last-result-v1";

export function saveLastSyncResult(result: SyncResult): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
  } catch {
    /* non-fatal */
  }
}

export function getLastSyncResult(): SyncResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SyncResult;
    if (!parsed || typeof parsed.ranAt !== "string" || !Array.isArray(parsed.metrics)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Every metric that attempted a sync and failed, with its reason. */
export function syncErrors(result: SyncResult | null): MetricSyncStatus[] {
  return (result?.metrics ?? []).filter((m) => m.attempted && !m.ok);
}

/** Test/debug helper — clears local sync state (not Health/Supabase data). */
export function resetHealthSyncWatermarks(): void {
  saveWatermarks(defaultWatermarks());
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LAST_RESULT_KEY);
    } catch {
      /* non-fatal */
    }
  }
}

export const __internal = { loadWatermarks, saveWatermarks, defaultWatermarks };
