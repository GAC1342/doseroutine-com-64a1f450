import { supabase } from "@/integrations/supabase/client";
import {
  bucketByDay,
  bucketByWeek,
  condense,
  dayKey,
  type RawPoint,
  type SeriesPoint,
} from "@/lib/insights/aggregate";
import { getEffectiveDoseStatus } from "@/lib/dose-status";
import { insightUnits, kgToDisplay, weightUnitLabel } from "@/lib/insights/units";

export interface SupplyRow {
  label: string;
  value: number;
  max: number;
  note?: string;
}

/**
 * Average intake split by what else happened that day, so people can see how
 * their eating tracks with dosing and training rather than guessing.
 *
 * Only days with at least one logged meal count, and each side needs two such
 * days before we report it — otherwise the fields stay null.
 */
export interface NutritionContext {
  doseDayCalories: number | null;
  restDayCalories: number | null;
  doseDayProtein: number | null;
  restDayProtein: number | null;
  trainDayCalories: number | null;
  offDayCalories: number | null;
  trainDayProtein: number | null;
  offDayProtein: number | null;
  loggedDays: number;
}

export const EMPTY_NUTRITION_CONTEXT: NutritionContext = {
  doseDayCalories: null,
  restDayCalories: null,
  doseDayProtein: null,
  restDayProtein: null,
  trainDayCalories: null,
  offDayCalories: null,
  trainDayProtein: null,
  offDayProtein: null,
  loggedDays: 0,
};

export interface RotationSeries {
  data: Array<Record<string, string | number>>;
  sites: string[];
}

export interface InsightsData {
  units: "metric" | "imperial";
  weightLabel: string;
  /** Daily (or weekly) adherence percentage. */
  adherence: SeriesPoint[];
  /** Doses actually logged per bucket. */
  dosesLogged: SeriesPoint[];
  /** Body weight in the user's preferred unit. */
  weight: SeriesPoint[];
  /** Body fat percentage. */
  bodyFat: SeriesPoint[];
  /** Training minutes per bucket. */
  trainingMinutes: SeriesPoint[];
  /** Calories logged per bucket. */
  calories: SeriesPoint[];
  /** Protein grams logged per bucket. */
  protein: SeriesPoint[];
  /** How eating differs on dose days and training days. */
  nutritionContext: NutritionContext;
  /** Completed sessions per bucket. */
  sessions: SeriesPoint[];
  rotation: RotationSeries;
  vials: SupplyRow[];
  /** Estimated monthly spend per compound. */
  spend: SupplyRow[];
  monthlySpendTotal: number;
  currency: string;
  bucket: "day" | "week";
}

function bucketFor(days: number): "day" | "week" {
  return days <= 31 ? "day" : "week";
}

function bucket(
  rows: RawPoint[],
  days: number,
  how: "sum" | "avg" | "last" | "max",
  end: string,
): SeriesPoint[] {
  return bucketFor(days) === "day"
    ? condense(bucketByDay(rows, days, how, end))
    : condense(bucketByWeek(rows, days, how, end));
}

function dosesPerWeek(uc: {
  frequency: string | null;
  times_of_day: string[] | null;
  days_of_week: number[] | null;
}): number {
  const perDay = Math.max(1, uc.times_of_day?.length ?? 1);
  const freq = (uc.frequency || "daily").toLowerCase();
  if (freq === "daily") return perDay * 7;
  if (freq === "weekly") return (uc.days_of_week?.length ?? 1) * perDay;
  if (freq === "twice_weekly" || freq === "2x_weekly") return 2 * perDay;
  if (freq === "eod" || freq === "every_other_day") return perDay * 3.5;
  if (freq === "custom") return (uc.days_of_week?.length ?? 7) * perDay;
  return perDay * 7;
}

/** Fetch and aggregate everything the Insights dashboard renders. */
export async function fetchInsightsData(days: number): Promise<InsightsData> {
  const end = dayKey(new Date());
  const startISO = new Date(Date.now() - days * 86_400_000).toISOString();
  const startDay = startISO.slice(0, 10);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return emptyInsights(days);

  const [profileRes, eventsRes, checkinsRes, workoutsRes, sitesRes, compoundsRes, mealsRes] =
    await Promise.all([
      supabase.from("profiles").select("unit_pref").eq("id", user.id).maybeSingle(),
      supabase
        .from("schedule_events")
        .select("scheduled_at, status, taken_at")
        .gte("scheduled_at", startISO)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("body_checkins" as never)
        .select("checked_at, weight_kg, body_fat_pct")
        .eq("user_id", user.id)
        .gte("checked_at", startDay)
        .order("checked_at", { ascending: true }),
      supabase
        .from("workout_logs")
        .select("performed_on, status, duration_min")
        .gte("performed_on", startDay)
        .order("performed_on", { ascending: true }),
      supabase
        .from("injection_sites")
        .select("site, used_at")
        .gte("used_at", startISO)
        .order("used_at", { ascending: true }),
      supabase
        .from("user_compounds")
        .select(
          "id, custom_name, frequency, times_of_day, days_of_week, compound_id, compounds(name)",
        )
        .eq("user_id", user.id)
        .eq("active", true),
      supabase
        .from("meals")
        .select("logged_at, adj_calories, adj_protein_g, est_calories, est_protein_g")
        .eq("user_id", user.id)
        .gte("logged_at", startISO)
        .order("logged_at", { ascending: true }),
    ]);

  const units: "metric" | "imperial" =
    (profileRes.data as { unit_pref?: string } | null)?.unit_pref === "imperial"
      ? "imperial"
      : "metric";
  const weightLabel = weightUnitLabel(units);

  // ---- Adherence -----------------------------------------------------------
  const now = new Date();
  const perDay = new Map<string, { resolved: number; taken: number }>();
  for (const e of eventsRes.data ?? []) {
    const status = getEffectiveDoseStatus(e.status, e.scheduled_at, now);
    if (status !== "taken" && status !== "missed" && status !== "skipped") continue;
    const key = dayKey(e.scheduled_at);
    const b = perDay.get(key) ?? { resolved: 0, taken: 0 };
    b.resolved += 1;
    if (status === "taken") b.taken += 1;
    perDay.set(key, b);
  }
  const adherenceRaw: RawPoint[] = [];
  const takenRaw: RawPoint[] = [];
  for (const [date, b] of perDay) {
    adherenceRaw.push({ date, value: b.resolved ? (b.taken / b.resolved) * 100 : 0 });
    takenRaw.push({ date, value: b.taken });
  }

  // ---- Body metrics --------------------------------------------------------
  const checkins = (checkinsRes.data ?? []) as unknown as Array<{
    checked_at: string;
    weight_kg: number | null;
    body_fat_pct: number | null;
  }>;
  const weightRaw: RawPoint[] = checkins
    .filter((c) => c.weight_kg != null)
    .map((c) => ({
      date: c.checked_at,
      value: kgToDisplay(Number(c.weight_kg), units),
    }));
  const bodyFatRaw: RawPoint[] = checkins
    .filter((c) => c.body_fat_pct != null)
    .map((c) => ({ date: c.checked_at, value: Number(c.body_fat_pct) }));

  // ---- Training ------------------------------------------------------------
  const completed = (workoutsRes.data ?? []).filter((w) => w.status === "completed");
  const minutesRaw: RawPoint[] = completed.map((w) => ({
    date: w.performed_on,
    value: Number(w.duration_min ?? 0),
  }));
  const sessionsRaw: RawPoint[] = completed.map((w) => ({ date: w.performed_on, value: 1 }));

  // ---- Nutrition -----------------------------------------------------------
  const perDayFood = new Map<string, { calories: number; protein: number }>();
  for (const m of mealsRes.data ?? []) {
    if (!m.logged_at) continue;
    const key = dayKey(m.logged_at);
    const bucketRow = perDayFood.get(key) ?? { calories: 0, protein: 0 };
    bucketRow.calories += Number(m.adj_calories ?? m.est_calories ?? 0);
    bucketRow.protein += Number(m.adj_protein_g ?? m.est_protein_g ?? 0);
    perDayFood.set(key, bucketRow);
  }
  const caloriesRaw: RawPoint[] = [];
  const proteinRaw: RawPoint[] = [];
  for (const [date, b] of perDayFood) {
    caloriesRaw.push({ date, value: b.calories });
    proteinRaw.push({ date, value: b.protein });
  }
  const doseDays = new Set<string>();
  for (const e of eventsRes.data ?? []) {
    if (getEffectiveDoseStatus(e.status, e.scheduled_at, now) === "taken") {
      doseDays.add(dayKey(e.scheduled_at));
    }
  }
  const trainDays = new Set(completed.map((w) => dayKey(w.performed_on)));
  const nutritionContext = buildNutritionContext(perDayFood, doseDays, trainDays);

  // ---- Injection rotation --------------------------------------------------
  const rotation = buildRotation(sitesRes.data ?? [], days, end);

  // ---- Vials + spend -------------------------------------------------------
  const ucs = (compoundsRes.data ?? []) as Array<{
    id: string;
    custom_name: string | null;
    frequency: string | null;
    times_of_day: string[] | null;
    days_of_week: number[] | null;
    compounds: { name: string } | null;
  }>;
  const ids = ucs.map((u) => u.id);
  const vialsRes = ids.length
    ? await supabase.from("vial_inventory").select("*").in("user_compound_id", ids)
    : { data: [] as Array<Record<string, unknown>> };
  const vialMap = new Map(
    (vialsRes.data ?? []).map((v) => [
      (v as Record<string, unknown>)["user_compound_id"] as string,
      v as Record<string, unknown>,
    ]),
  );

  const fmtBase = insightUnits({ units, weightLabel });
  const vials: SupplyRow[] = [];
  const spend: SupplyRow[] = [];
  let currency = "USD";
  for (const uc of ucs) {
    const name = uc.custom_name || uc.compounds?.name || "Compound";
    const v = vialMap.get(uc.id);
    const totalDoses = v?.["total_doses"] != null ? Number(v["total_doses"]) : null;
    const remaining = v?.["doses_remaining"] != null ? Number(v["doses_remaining"]) : null;
    const costPerVial = v?.["cost_per_vial"] != null ? Number(v["cost_per_vial"]) : null;
    if (v?.["currency"]) currency = String(v["currency"]);
    const dpw = dosesPerWeek(uc);

    if (remaining != null && totalDoses != null && totalDoses > 0) {
      const daysLeft = dpw > 0 ? Math.round((remaining / dpw) * 7) : null;
      vials.push({
        label: name,
        value: remaining,
        max: totalDoses,
        note:
          daysLeft != null
            ? `${fmtBase.count(remaining)} left · ~${daysLeft}d`
            : `${fmtBase.count(remaining)} left`,
      });
    }
    if (costPerVial != null && totalDoses && totalDoses > 0) {
      const monthly = (costPerVial / totalDoses) * dpw * (52 / 12);
      spend.push({ label: name, value: monthly, max: 0 });
    }
  }
  const maxSpend = Math.max(1, ...spend.map((s) => s.value));
  const fmt = insightUnits({ units, weightLabel, currency });
  for (const s of spend) {
    s.max = maxSpend;
    s.note = fmt.moneyPerMonth(s.value);
  }
  spend.sort((a, b) => b.value - a.value);
  vials.sort((a, b) => a.value / (a.max || 1) - b.value / (b.max || 1));

  return {
    units,
    weightLabel,
    adherence: bucket(adherenceRaw, days, "avg", end),
    dosesLogged: bucket(takenRaw, days, "sum", end),
    weight: bucket(weightRaw, days, "avg", end),
    bodyFat: bucket(bodyFatRaw, days, "avg", end),
    trainingMinutes: bucket(minutesRaw, days, "sum", end),
    calories: bucket(caloriesRaw, days, bucketFor(days) === "day" ? "sum" : "avg", end),
    protein: bucket(proteinRaw, days, bucketFor(days) === "day" ? "sum" : "avg", end),
    nutritionContext,
    sessions: bucket(sessionsRaw, days, "sum", end),
    rotation,
    vials: vials.slice(0, 4),
    spend: spend.slice(0, 4),
    monthlySpendTotal: spend.reduce((s, r) => s + r.value, 0),
    currency,
    bucket: bucketFor(days),
  };
}

/**
 * Compare average intake on dose days vs the rest, and training days vs rest
 * days. Each side needs at least two logged days so a single outlier meal
 * can't produce a confident-looking comparison.
 */
function buildNutritionContext(
  perDayFood: Map<string, { calories: number; protein: number }>,
  doseDays: ReadonlySet<string>,
  trainDays: ReadonlySet<string>,
): NutritionContext {
  const split = (member: ReadonlySet<string>) => {
    const inside: Array<{ calories: number; protein: number }> = [];
    const outside: Array<{ calories: number; protein: number }> = [];
    for (const [day, totals] of perDayFood) {
      (member.has(day) ? inside : outside).push(totals);
    }
    const avg = (
      rows: Array<{ calories: number; protein: number }>,
      key: "calories" | "protein",
    ) => (rows.length >= 2 ? Math.round(rows.reduce((s, r) => s + r[key], 0) / rows.length) : null);
    return {
      inCalories: avg(inside, "calories"),
      outCalories: avg(outside, "calories"),
      inProtein: avg(inside, "protein"),
      outProtein: avg(outside, "protein"),
    };
  };
  const dose = split(doseDays);
  const train = split(trainDays);
  return {
    doseDayCalories: dose.inCalories,
    restDayCalories: dose.outCalories,
    doseDayProtein: dose.inProtein,
    restDayProtein: dose.outProtein,
    trainDayCalories: train.inCalories,
    offDayCalories: train.outCalories,
    trainDayProtein: train.inProtein,
    offDayProtein: train.outProtein,
    loggedDays: perDayFood.size,
  };
}

function buildRotation(
  rows: ReadonlyArray<{ site: string; used_at: string | null }>,
  days: number,
  end: string,
): RotationSeries {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.site) continue;
    counts.set(r.site, (counts.get(r.site) ?? 0) + 1);
  }
  const sites = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([site]) => site);
  if (sites.length === 0) return { data: [], sites: [] };

  const template = bucket(
    rows.filter((r) => r.used_at).map((r) => ({ date: r.used_at as string, value: 1 })),
    days,
    "sum",
    end,
  );
  const bucketDays = bucketFor(days) === "day" ? 1 : 7;
  const data = template.map((point) => {
    const row: Record<string, string | number> = { label: point.label, date: point.date };
    for (const site of sites) row[site] = 0;
    return row;
  });
  for (const r of rows) {
    if (!r.used_at || !sites.includes(r.site)) continue;
    const key = dayKey(r.used_at);
    let target = data[data.length - 1];
    for (let i = 0; i < data.length; i++) {
      const start = String(data[i]!["date"]);
      const nextStart = i + 1 < data.length ? String(data[i + 1]!["date"]) : null;
      if (key >= start && (nextStart === null || key < nextStart)) {
        target = data[i];
        break;
      }
    }
    if (target && key >= String(data[0]!["date"])) {
      target[r.site] = Number(target[r.site] ?? 0) + 1;
    }
  }
  void bucketDays;
  return { data, sites };
}

export function emptyInsights(days: number): InsightsData {
  const end = dayKey(new Date());
  const blank = bucket([], days, "sum", end);
  return {
    units: "metric",
    weightLabel: "kg",
    adherence: blank,
    dosesLogged: blank,
    weight: blank,
    bodyFat: blank,
    trainingMinutes: blank,
    sessions: blank,
    calories: blank,
    protein: blank,
    nutritionContext: EMPTY_NUTRITION_CONTEXT,
    rotation: { data: [], sites: [] },
    vials: [],
    spend: [],
    monthlySpendTotal: 0,
    currency: "USD",
    bucket: bucketFor(days),
  };
}
