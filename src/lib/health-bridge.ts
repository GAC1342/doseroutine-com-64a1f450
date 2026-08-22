/**
 * Platform-safe wrapper around `@capgo/capacitor-health` (HealthKit on iOS,
 * Health Connect on Android). Every export here is safe to call from any
 * platform — including SSR and plain web builds — because the native plugin
 * is always loaded with a dynamic `await import()` inside a try/catch.
 *
 * Callers never touch the plugin directly; they get a normalized result type
 * (`{ ok, reason }` or data) so the UI can render a friendly state instead of
 * an unhandled rejection.
 */
import { isNative } from "@/lib/platform";

/** App-level scopes. Each maps to one or more native `HealthDataType`s. */
export type HealthScope =
  | "weight"
  | "steps"
  | "activeEnergy"
  | "heartRate"
  | "workouts"
  | "nutrition";

const READ_SCOPES: HealthScope[] = ["weight", "steps", "activeEnergy", "heartRate"];
const WRITE_SCOPES: HealthScope[] = ["workouts", "nutrition"];

// Native `HealthDataType` strings used per scope.
const SCOPE_DATA_TYPES: Record<HealthScope, string[]> = {
  weight: ["weight"],
  steps: ["steps"],
  activeEnergy: ["calories"],
  heartRate: ["heartRate"],
  workouts: ["workouts", "calories"],
  nutrition: ["dietaryEnergyConsumed"],
};

export type PermissionState = "granted" | "denied" | "unknown";

export type HealthConnectionState = {
  /** True once the user has completed the permission prompt at least once. */
  connected: boolean;
  read: Partial<Record<HealthScope, PermissionState>>;
  write: Partial<Record<HealthScope, PermissionState>>;
  lastCheckedAt: string | null;
};

const STORAGE_KEY = "dr-health-connection-v1";

function emptyState(): HealthConnectionState {
  return { connected: false, read: {}, write: {}, lastCheckedAt: null };
}

export function getHealthConnectionState(): HealthConnectionState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as HealthConnectionState;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

function saveHealthConnectionState(state: HealthConnectionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode, quota) — non-fatal */
  }
}

export type AvailabilityResult = { available: boolean; reason?: string };

/**
 * Loads the native plugin. Returns `null` (never throws) when unavailable —
 * on web, during SSR, or if the plugin failed to initialize on-device.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin type is only known once dynamically imported
async function loadPlugin(): Promise<any | null> {
  if (!isNative()) return null;
  try {
    const mod = await import("@capgo/capacitor-health");
    return mod.Health;
  } catch {
    return null;
  }
}

export async function isHealthAvailable(): Promise<AvailabilityResult> {
  if (!isNative()) {
    return { available: false, reason: "Health sync is only available in the installed app." };
  }
  const plugin = await loadPlugin();
  if (!plugin) {
    return { available: false, reason: "The health plugin could not be loaded on this device." };
  }
  try {
    const result = await plugin.isAvailable();
    return { available: !!result?.available, reason: result?.reason };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : "Unknown error" };
  }
}

function dataTypesFor(scopes: HealthScope[]): string[] {
  const set = new Set<string>();
  for (const scope of scopes) for (const t of SCOPE_DATA_TYPES[scope] ?? []) set.add(t);
  return [...set];
}

export type RequestPermissionsInput = {
  read?: HealthScope[];
  write?: HealthScope[];
};

export type RequestPermissionsResult = {
  ok: boolean;
  reason?: string;
  state: HealthConnectionState;
};

/**
 * Requests the given read/write scopes. Persists granted/denied status per
 * scope locally so the UI can show connection status without re-prompting.
 * Handles partial grants: scopes the user denies are simply marked "denied",
 * everything else keeps working.
 */
export async function requestHealthPermissions(
  input: RequestPermissionsInput = {},
): Promise<RequestPermissionsResult> {
  const read = input.read ?? READ_SCOPES;
  const write = input.write ?? WRITE_SCOPES;
  const state = getHealthConnectionState();

  if (!isNative()) {
    return { ok: false, reason: "Health sync is only available in the installed app.", state };
  }
  const plugin = await loadPlugin();
  if (!plugin) {
    return { ok: false, reason: "The health plugin could not be loaded on this device.", state };
  }

  try {
    const status = await plugin.requestAuthorization({
      read: dataTypesFor(read),
      write: dataTypesFor(write),
    });
    const readAuthorized: string[] = status?.readAuthorized ?? [];
    const writeAuthorized: string[] = status?.writeAuthorized ?? [];

    const next: HealthConnectionState = {
      connected: true,
      read: { ...state.read },
      write: { ...state.write },
      lastCheckedAt: new Date().toISOString(),
    };
    for (const scope of read) {
      const types = SCOPE_DATA_TYPES[scope];
      next.read[scope] = types.every((t) => readAuthorized.includes(t)) ? "granted" : "denied";
    }
    for (const scope of write) {
      const types = SCOPE_DATA_TYPES[scope];
      next.write[scope] = types.every((t) => writeAuthorized.includes(t)) ? "granted" : "denied";
    }
    saveHealthConnectionState(next);
    return { ok: true, state: next };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Couldn't request Health permissions",
      state,
    };
  }
}

/** Re-checks current authorization without prompting (e.g. on page load). */
export async function refreshHealthPermissions(): Promise<HealthConnectionState> {
  const state = getHealthConnectionState();
  if (!isNative() || !state.connected) return state;
  const plugin = await loadPlugin();
  if (!plugin) return state;
  try {
    const status = await plugin.checkAuthorization({
      read: dataTypesFor(READ_SCOPES),
      write: dataTypesFor(WRITE_SCOPES),
    });
    const readAuthorized: string[] = status?.readAuthorized ?? [];
    const writeAuthorized: string[] = status?.writeAuthorized ?? [];
    const next: HealthConnectionState = {
      connected: true,
      read: {},
      write: {},
      lastCheckedAt: new Date().toISOString(),
    };
    for (const scope of READ_SCOPES) {
      next.read[scope] = SCOPE_DATA_TYPES[scope].every((t) => readAuthorized.includes(t))
        ? "granted"
        : "denied";
    }
    for (const scope of WRITE_SCOPES) {
      next.write[scope] = SCOPE_DATA_TYPES[scope].every((t) => writeAuthorized.includes(t))
        ? "granted"
        : "denied";
    }
    saveHealthConnectionState(next);
    return next;
  } catch {
    return state;
  }
}

export type HealthSample = {
  dataType: string;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
};

export type ReadSamplesInput = {
  dataType: "weight" | "steps" | "calories" | "heartRate";
  startDate: string;
  endDate: string;
  limit?: number;
};

export type ReadSamplesResult = { ok: boolean; samples: HealthSample[]; reason?: string };

/** Reads raw samples for a single native data type within a date range. */
export async function readHealthSamples(input: ReadSamplesInput): Promise<ReadSamplesResult> {
  if (!isNative()) return { ok: false, samples: [], reason: "Not available on web" };
  const plugin = await loadPlugin();
  if (!plugin) return { ok: false, samples: [], reason: "Health plugin unavailable" };
  try {
    const result = await plugin.readSamples({
      dataType: input.dataType,
      startDate: input.startDate,
      endDate: input.endDate,
      limit: input.limit ?? 500,
      ascending: true,
    });
    return { ok: true, samples: result?.samples ?? [] };
  } catch (e) {
    return { ok: false, samples: [], reason: e instanceof Error ? e.message : "Read failed" };
  }
}

export type WriteWorkoutInput = {
  /** Minutes. */
  durationMin: number;
  startDate: string;
  endDate: string;
  calories?: number | null;
  title?: string | null;
};

export type WriteResult = { ok: boolean; reason?: string };

/**
 * Writes a completed workout to Health. `@capgo/capacitor-health` doesn't
 * expose a typed "workout" write beyond `saveSample`, so we save the
 * duration under the `workouts` data type (with the title in metadata) and,
 * when known, a matching `calories` sample for the same window.
 */
export async function writeWorkout(input: WriteWorkoutInput): Promise<WriteResult> {
  if (!isNative()) return { ok: false, reason: "Not available on web" };
  const plugin = await loadPlugin();
  if (!plugin) return { ok: false, reason: "Health plugin unavailable" };
  try {
    await plugin.saveSample({
      dataType: "workouts",
      value: input.durationMin,
      unit: "minute",
      startDate: input.startDate,
      endDate: input.endDate,
      metadata: input.title ? { title: input.title } : undefined,
    });
    if (typeof input.calories === "number" && input.calories > 0) {
      await plugin.saveSample({
        dataType: "calories",
        value: input.calories,
        unit: "kilocalorie",
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Write failed" };
  }
}

export type WriteNutritionInput = {
  loggedAt: string;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  label?: string | null;
};

/**
 * Writes a meal's energy to Health as `dietaryEnergyConsumed`. Neither
 * HealthKit nor this plugin's unified `HealthDataType` set expose separate
 * writable macro (protein/carb/fat) quantity types, so macros are attached
 * as metadata on the same sample for apps that read it back, rather than
 * silently dropped.
 */
export async function writeNutrition(input: WriteNutritionInput): Promise<WriteResult> {
  if (!isNative()) return { ok: false, reason: "Not available on web" };
  if (typeof input.calories !== "number" || input.calories <= 0) {
    return { ok: false, reason: "No calorie value to write" };
  }
  const plugin = await loadPlugin();
  if (!plugin) return { ok: false, reason: "Health plugin unavailable" };
  try {
    const metadata: Record<string, string> = {};
    if (input.label) metadata.label = input.label;
    if (typeof input.proteinG === "number") metadata.proteinG = String(input.proteinG);
    if (typeof input.carbsG === "number") metadata.carbsG = String(input.carbsG);
    if (typeof input.fatG === "number") metadata.fatG = String(input.fatG);
    await plugin.saveSample({
      dataType: "dietaryEnergyConsumed",
      value: input.calories,
      unit: "kilocalorie",
      startDate: input.loggedAt,
      endDate: input.loggedAt,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Write failed" };
  }
}

export const HEALTH_READ_SCOPES = READ_SCOPES;
export const HEALTH_WRITE_SCOPES = WRITE_SCOPES;
