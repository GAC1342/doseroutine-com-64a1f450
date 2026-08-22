/**
 * Protocol-aware meal timing suggestions.
 *
 * Everything here is generic timing guidance derived from how a compound is
 * normally taken (with food, empty stomach, around training) plus the user's
 * own recent macros. It is deliberately non-prescriptive: no doses, no
 * medical advice, and every line is phrased as a suggestion.
 */

export type TimingStackItem = {
  name: string;
  category: string | null;
  /** Times the user set for this compound, "HH:MM". */
  times: string[];
  withFood: boolean | null;
  postWorkout: boolean | null;
};

export type TimingMacroSummary = {
  /** Average protein per logged day over the recent window. */
  avgProtein: number | null;
  /** Average calories per logged day. */
  avgCalories: number | null;
  proteinTarget: number | null;
  calorieTarget: number | null;
  /** Hour of day of the earliest meal logged on a typical day, if known. */
  firstMealHour: number | null;
  /** Hour of the latest meal. */
  lastMealHour: number | null;
  /** Meals per logged day, rounded to one decimal. */
  mealsPerDay: number | null;
};

export type TimingSuggestion = {
  id: string;
  title: string;
  detail: string;
  /** What triggered the suggestion, shown as a small caption. */
  because: string;
};

/**
 * User-tunable rules. Every number here is a preference, not a clinical
 * threshold — the suggestions simply repeat back what the user set.
 */
export type MealTimingRules = {
  /** Minutes to allow between a with-food dose and the meal around it. */
  with_food_window_min: number;
  /** Minutes after training that still counts as the post-workout window. */
  workout_window_min: number;
  /** Empty-stomach gap before eating after an absorption-sensitive dose. */
  empty_stomach_gap_min: number;
  /** Protein the user wants in their first meal of the day. */
  first_meal_protein_g: number;
  /** Hour (0–23) at or after which a meal counts as "late". */
  late_meal_hour: number;
  /** Above this many eating occasions a day, suggest consolidating. */
  max_meals_per_day: number;
  suggestions_enabled: boolean;
};

export const DEFAULT_TIMING_RULES: MealTimingRules = {
  with_food_window_min: 30,
  workout_window_min: 90,
  empty_stomach_gap_min: 45,
  first_meal_protein_g: 35,
  late_meal_hour: 21,
  max_meals_per_day: 3.5,
  suggestions_enabled: true,
};

function has(stack: ReadonlyArray<TimingStackItem>, category: string) {
  return stack.some((s) => s.category === category);
}

function nameMatch(stack: ReadonlyArray<TimingStackItem>, pattern: RegExp) {
  return stack.find((s) => pattern.test(s.name.toLowerCase()));
}

function fmtTime(time: string) {
  const [h = "0", m = "00"] = time.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return m === "00" ? `${display}${suffix}` : `${display}:${m}${suffix}`;
}

/**
 * Build up to five suggestions, most protocol-specific first.
 */
export function buildMealTimingSuggestions(
  stack: ReadonlyArray<TimingStackItem>,
  macros: TimingMacroSummary,
  rules: MealTimingRules = DEFAULT_TIMING_RULES,
): TimingSuggestion[] {
  const out: TimingSuggestion[] = [];
  if (!rules.suggestions_enabled) return out;

  const gap = Math.max(0, Math.round(rules.empty_stomach_gap_min));
  const firstMealProtein = Math.max(0, Math.round(rules.first_meal_protein_g));
  const maxMeals = rules.max_meals_per_day;

  // --- Thyroid: absorption is the whole game ------------------------------
  const thyroid = nameMatch(stack, /levothyroxine|synthroid|liothyronine|\bt3\b|\bt4\b/);
  if (thyroid) {
    out.push({
      id: "thyroid-empty-stomach",
      title: `Keep breakfast ${gap} minutes after your thyroid dose`,
      detail:
        "Thyroid medication is usually taken on an empty stomach, and coffee, calcium, iron and fibre all cut absorption. Log the dose first, then eat.",
      because: `${thyroid.name} is in your stack · your ${gap}-minute gap`,
    });
  }

  // --- GLP-1: protein first, small and early ------------------------------
  if (has(stack, "glp1")) {
    const shortfall =
      macros.avgProtein != null && macros.proteinTarget != null
        ? Math.round(macros.proteinTarget - macros.avgProtein)
        : null;
    out.push({
      id: "glp1-protein-front-load",
      title: "Front-load protein before appetite drops off",
      detail:
        shortfall != null && shortfall > 10
          ? `You're averaging about ${shortfall}g under your protein target. Putting ${firstMealProtein}g in your first meal is usually easier than catching up at night on a GLP-1.`
          : `Appetite fades through the day on a GLP-1, so the first two meals are where protein actually lands. Aim for about ${firstMealProtein}g each.`,
      because: "You have an active GLP-1",
    });
    if (macros.mealsPerDay != null && macros.mealsPerDay > maxMeals) {
      out.push({
        id: "glp1-fewer-larger",
        title: "Try fewer, larger planned meals instead of grazing",
        detail: `You're logging more than the ${maxMeals} eating occasions a day you set as your ceiling. Fewer, protein-dense meals tend to sit better and make hitting the target simpler.`,
        because: `About ${macros.mealsPerDay} meals per day recently`,
      });
    }
  }

  // --- Metformin and other with-food compounds -----------------------------
  const metformin = nameMatch(stack, /metformin|glucophage/);
  if (metformin) {
    out.push({
      id: "metformin-with-food",
      title: "Take metformin with the largest part of the meal",
      detail:
        "Stomach upset is far more common on an empty stomach. Log the meal and the dose together so you can see the pattern if symptoms show up.",
      because: "Metformin is in your stack",
    });
  }
  const withFood = stack.filter((s) => s.withFood && !/metformin/i.test(s.name));
  if (withFood.length > 0) {
    const names = withFood.slice(0, 3).map((s) => s.name);
    out.push({
      id: "with-food-cluster",
      title: `Pair ${names.join(", ")} with a real meal`,
      detail: `These are marked take-with-food in your stack. Keep them inside ${Math.max(
        0,
        Math.round(rules.with_food_window_min),
      )} minutes of the meal — fat-soluble items in particular absorb better alongside food that contains some fat.`,
      because: "Marked with food in your stack",
    });
  }

  // --- Training window ------------------------------------------------------
  const postWorkout = stack.filter((s) => s.postWorkout);
  if (postWorkout.length > 0) {
    out.push({
      id: "post-workout-meal",
      title: "Line a protein meal up with your post-workout items",
      detail: `${postWorkout
        .slice(0, 3)
        .map((s) => s.name)
        .join(
          ", ",
        )} sit in your post-workout slot. Logging a ${firstMealProtein}g+ protein meal within ${Math.max(
        0,
        Math.round(rules.workout_window_min),
      )} minutes of training keeps the whole block in one place.`,
      because: "Post-workout items in your stack",
    });
  }

  // --- Evening / bedtime doses ---------------------------------------------
  const lateHour = Math.min(23, Math.max(12, Math.round(rules.late_meal_hour)));
  const lateDose = stack.find((s) => s.times.some((t) => Number(t.split(":")[0]) >= lateHour - 1));
  if (lateDose && macros.lastMealHour != null && macros.lastMealHour >= lateHour) {
    out.push({
      id: "late-eating-vs-late-dose",
      title: "Pull your last meal earlier than your evening dose",
      detail: `Your ${fmtTime(
        lateDose.times.find((t) => Number(t.split(":")[0]) >= lateHour - 1) ?? "20:00",
      )} ${lateDose.name} lands around the same time as your last meal. Eating an hour or two earlier usually makes both sit better.`,
      because: `Late dose and meals after ${fmtTime(`${String(lateHour).padStart(2, "0")}:00`)}`,
    });
  }

  // --- Plain macro coaching, only when nothing protocol-specific fired ------
  if (out.length < 3 && macros.avgCalories != null && macros.calorieTarget != null) {
    const gap = Math.round(macros.avgCalories - macros.calorieTarget);
    if (Math.abs(gap) >= 150) {
      out.push({
        id: "calorie-gap",
        title:
          gap > 0
            ? "You're running above your calorie target"
            : "You're running under your calorie target",
        detail:
          gap > 0
            ? `About ${gap} kcal a day over. Trimming the meal you log latest is usually the least disruptive place to start.`
            : `About ${Math.abs(gap)} kcal a day under. Adding to your first meal is easier than forcing a big dinner.`,
        because: "Based on your recent logged days",
      });
    }
  }

  if (out.length === 0 && macros.firstMealHour != null) {
    out.push({
      id: "steady-window",
      title: "Keep your eating window steady",
      detail: `You usually start eating around ${fmtTime(`${String(macros.firstMealHour).padStart(2, "0")}:00`)}. Holding that steady makes dose timing and appetite easier to read week to week.`,
      because: "Based on your recent logged days",
    });
  }

  return out.slice(0, 5);
}
