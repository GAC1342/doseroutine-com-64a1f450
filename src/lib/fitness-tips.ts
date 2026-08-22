/**
 * Contextual tips for the Fitness tabs.
 *
 * The rule: only say something when something is actually missing. A user with
 * logs, a weekly plan and body data should see a quiet page, not a wall of
 * onboarding. Each tip carries one suggested action so the fix is a single tap.
 */

export type FitnessTab = "workout" | "routine" | "exercises" | "body";

export type FitnessTip = {
  id: string;
  title: string;
  body: string;
  /** Suggested next step: either another tab, or an in-page action. */
  action: { label: string; tab?: FitnessTab; kind?: "log" | "plan-day" | "browse" };
};

export type FitnessSignals = {
  hasLoggedWorkout: boolean;
  loggedThisWeek: number;
  hasWeeklyPlan: boolean;
  plannedDays: number;
  hasSavedExercises: boolean;
  hasRoutines: boolean;
  hasBodyMetrics: boolean;
  hasRecentBodyEntry: boolean;
};

/**
 * Tips for one tab, most useful first. Empty array means "nothing missing".
 */
export function fitnessTips(tab: FitnessTab, s: FitnessSignals): FitnessTip[] {
  const tips: FitnessTip[] = [];

  if (tab === "workout") {
    if (!s.hasLoggedWorkout) {
      tips.push({
        id: "log-first",
        title: "Log your first workout",
        body: "One session is enough to start your streak and fill in the calendar.",
        action: { label: "Log a workout", kind: "log" },
      });
    } else if (s.loggedThisWeek === 0) {
      tips.push({
        id: "log-this-week",
        title: "Nothing logged this week yet",
        body: "Log today's session — even a short one keeps your streak and trends honest.",
        action: { label: "Log a workout", kind: "log" },
      });
    }
    if (s.hasLoggedWorkout && !s.hasWeeklyPlan) {
      tips.push({
        id: "plan-from-log",
        title: "Turn this into a routine",
        body: "Set the days you train so reminders and your calendar stay ahead of you.",
        action: { label: "Weekly plan", tab: "routine" },
      });
    }
  }

  if (tab === "routine") {
    if (!s.hasWeeklyPlan) {
      tips.push({
        id: "plan-empty",
        title: "Plan your first training day",
        body: "Pick a day, choose exercises and a start time — it saves to your week in one step.",
        action: { label: "Plan a day", kind: "plan-day" },
      });
    } else if (s.plannedDays < 2) {
      tips.push({
        id: "plan-more-days",
        title: "Only one day planned",
        body: "Most routines run two to four days a week. Add another day to spread the load.",
        action: { label: "Plan a day", kind: "plan-day" },
      });
    }
    if (s.hasWeeklyPlan && !s.hasRoutines) {
      tips.push({
        id: "plan-needs-exercises",
        title: "Your sessions have no exercises yet",
        body: "Save a routine from the library so each planned day knows what you're doing.",
        action: { label: "Browse exercises", tab: "exercises" },
      });
    }
  }

  if (tab === "exercises") {
    if (!s.hasSavedExercises) {
      tips.push({
        id: "exercises-first-pick",
        title: "Pick a few favourites",
        body: "Tap exercises to select them, then add the whole batch to a routine or a day.",
        action: { label: "Browse exercises", kind: "browse" },
      });
    }
    if (s.hasSavedExercises && !s.hasWeeklyPlan) {
      tips.push({
        id: "exercises-to-plan",
        title: "Put your picks on the calendar",
        body: "Adding them to a weekday sets a start time and repeats it every week.",
        action: { label: "Weekly plan", tab: "routine" },
      });
    }
  }

  if (tab === "body") {
    if (!s.hasBodyMetrics) {
      tips.push({
        id: "body-first-entry",
        title: "Add a starting point",
        body: "One weight or measurement entry gives every later trend something to compare to.",
        action: { label: "Add an entry", kind: "log" },
      });
    } else if (!s.hasRecentBodyEntry) {
      tips.push({
        id: "body-stale",
        title: "It's been a while",
        body: "Log a fresh weight or measurement so your trend lines stay useful.",
        action: { label: "Add an entry", kind: "log" },
      });
    }
    if (s.hasBodyMetrics && !s.hasLoggedWorkout) {
      tips.push({
        id: "body-needs-training",
        title: "Training data makes this richer",
        body: "Log workouts too and you can see body changes next to what you actually did.",
        action: { label: "Log a workout", tab: "workout" },
      });
    }
  }

  return tips.slice(0, 2);
}

/** True when the numbered first-run guide is still worth showing. */
export function shouldShowFirstRunGuide(s: FitnessSignals, guideComplete: boolean): boolean {
  if (guideComplete) return false;
  return !(s.hasLoggedWorkout && s.hasWeeklyPlan && s.hasSavedExercises);
}
