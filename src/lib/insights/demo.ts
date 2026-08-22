import { addDays, dayKey, enumerateDays, type SeriesPoint } from "@/lib/insights/aggregate";
import type { InsightsData } from "@/lib/insights/data";

/**
 * Deterministic sample data for the public homepage showcase.
 * Clearly illustrative — never mixed with real user data.
 */

// Small deterministic pseudo-random generator so SSR and client agree.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const WEEKS = 12;

function weekly(
  start: string,
  produce: (i: number, rand: () => number) => number | null,
  seed: number,
): SeriesPoint[] {
  const rand = rng(seed);
  const out: SeriesPoint[] = [];
  for (let i = 0; i < WEEKS; i++) {
    const date = addDays(start, i * 7);
    const d = new Date(`${date}T00:00:00Z`);
    out.push({
      date,
      label: `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`,
      value: produce(i, rand),
    });
  }
  return out;
}

export function buildDemoInsights(): InsightsData {
  const end = dayKey(new Date());
  const start = addDays(end, -(WEEKS - 1) * 7);

  const adherence = weekly(
    start,
    (i, rand) => Math.min(100, Math.round(64 + i * 2.6 + rand() * 6)),
    7,
  );
  const dosesLogged = weekly(start, (i, rand) => Math.round(9 + i * 0.7 + rand() * 3), 11);
  const weight = weekly(
    start,
    (i, rand) => Math.round((92.4 - i * 0.62 + rand() * 0.5) * 10) / 10,
    3,
  );
  const bodyFat = weekly(
    start,
    (i, rand) => Math.round((26.8 - i * 0.32 + rand() * 0.3) * 10) / 10,
    5,
  );
  const trainingMinutes = weekly(start, (i, rand) => Math.round(110 + i * 9 + rand() * 40), 13);
  const sessions = weekly(
    start,
    (i, rand) => Math.round(2 + Math.min(3, i * 0.25 + rand() * 1.2)),
    17,
  );

  const calories = weekly(start, (i, rand) => Math.round(2380 - i * 14 + rand() * 180), 29);
  const protein = weekly(start, (i, rand) => Math.round(126 + i * 2.6 + rand() * 14), 31);

  const sites = ["Left abdomen", "Right abdomen", "Left thigh", "Right thigh"];
  const rotRand = rng(23);
  const rotation = {
    sites,
    data: adherence.map((p) => {
      const row: Record<string, string | number> = { label: p.label, date: p.date };
      sites.forEach((site, idx) => {
        row[site] = Math.round(1 + rotRand() * (idx % 2 === 0 ? 1.6 : 1.1));
      });
      return row;
    }),
  };

  const spend = [
    { label: "Retatrutide", value: 148, max: 148, note: "$148/mo" },
    { label: "BPC-157", value: 96, max: 148, note: "$96/mo" },
    { label: "Creatine", value: 18, max: 148, note: "$18/mo" },
  ];

  const vials = [
    { label: "Retatrutide 10mg", value: 4, max: 20, note: "4 left · ~14d" },
    { label: "BPC-157 5mg", value: 11, max: 20, note: "11 left · ~24d" },
    { label: "Tesamorelin 5mg", value: 17, max: 20, note: "17 left · ~38d" },
  ];

  return {
    units: "metric",
    weightLabel: "kg",
    adherence,
    dosesLogged,
    weight,
    bodyFat,
    trainingMinutes,
    sessions,
    calories,
    protein,
    nutritionContext: {
      doseDayCalories: 2180,
      restDayCalories: 2395,
      doseDayProtein: 158,
      restDayProtein: 132,
      trainDayCalories: 2410,
      offDayCalories: 2105,
      trainDayProtein: 162,
      offDayProtein: 129,
      loggedDays: 74,
    },
    rotation,
    vials,
    spend,
    monthlySpendTotal: 262,
    currency: "USD",
    bucket: "week",
  };
}

/** Exposed for tests — the demo window always covers 12 weekly buckets. */
export const DEMO_WEEKS = WEEKS;
export const demoDays = () => enumerateDays(WEEKS * 7).length;
