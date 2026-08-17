/**
 * Built-in starter templates.
 *
 * These cover the newer activity families (cardio, mind & body, sport) so a
 * brand-new account can log a run, ride, flow or swim in one tap instead of
 * building a template from scratch. They are copied into the user's own
 * templates on demand — nothing here is read at log time.
 */

import type { TemplateInput } from "@/lib/workout-templates";
import { METRES_PER_MILE, type WorkoutFamily, type WorkoutType } from "@/lib/workout-types";

export type StarterTemplate = {
  key: string;
  family: WorkoutFamily;
  /** One-line pitch shown next to the name in the picker. */
  blurb: string;
  input: TemplateInput;
};

function template(
  key: string,
  family: WorkoutFamily,
  blurb: string,
  name: string,
  workoutType: WorkoutType,
  partial: Partial<TemplateInput>,
): StarterTemplate {
  return {
    key,
    family,
    blurb,
    input: {
      name,
      workoutType,
      durationMin: null,
      rpe: null,
      calories: null,
      distanceM: null,
      targetPaceS: null,
      targetHr: null,
      notes: null,
      exercises: [],
      ...partial,
    },
  };
}

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  template(
    "running-intervals",
    "cardio",
    "8 × 400m hard with equal jog recovery.",
    "Running intervals",
    "run",
    {
      durationMin: 45,
      rpe: 8,
      distanceM: Math.round(6 * METRES_PER_MILE),
      targetPaceS: 7 * 60 + 30,
      notes: "15 min easy warm-up · 8 × 400m hard / 400m jog · 10 min cool down.",
      exercises: [
        {
          exercise: "Warm-up jog",
          sets: 1,
          reps: null,
          weightKg: null,
          restSeconds: null,
          tempo: null,
        },
        {
          exercise: "400m repeats",
          sets: 8,
          reps: null,
          weightKg: null,
          restSeconds: 120,
          tempo: null,
        },
        {
          exercise: "Cool down",
          sets: 1,
          reps: null,
          weightKg: null,
          restSeconds: null,
          tempo: null,
        },
      ],
    },
  ),
  template("easy-run", "cardio", "Conversational-pace aerobic base run.", "Easy run", "run", {
    durationMin: 40,
    rpe: 4,
    distanceM: Math.round(4 * METRES_PER_MILE),
    targetPaceS: 10 * 60,
    notes: "Nose-breathing pace. Should feel easy the whole way.",
  }),
  template(
    "cycling-steady",
    "cardio",
    "Steady zone-2 ride, flat to rolling.",
    "Cycling steady",
    "bike",
    {
      durationMin: 60,
      rpe: 5,
      distanceM: Math.round(18 * METRES_PER_MILE),
      targetHr: 135,
      notes: "Hold a steady cadence around 85–90 rpm. Zone 2 heart rate.",
    },
  ),
  template(
    "bike-intervals",
    "cardio",
    "5 × 4 min threshold efforts.",
    "Cycling intervals",
    "bike",
    {
      durationMin: 50,
      rpe: 8,
      notes: "10 min spin up · 5 × 4 min hard / 3 min easy · 10 min spin down.",
    },
  ),
  template("row-2k", "cardio", "Classic 2,000m rowing test piece.", "Rowing 2k test", "row", {
    durationMin: 20,
    rpe: 9,
    distanceM: 2000,
    notes: "Warm up 10 min, then all-out 2,000m. Log the split as pace.",
  }),
  template("swim-technique", "cardio", "Drill-focused pool session.", "Swim technique", "swim", {
    durationMin: 45,
    rpe: 5,
    distanceM: 1500,
    notes: "200m easy · 4 × 50m drill · 8 × 100m steady · 200m cool down.",
    exercises: [
      {
        exercise: "Catch-up drill",
        sets: 4,
        reps: 50,
        weightKg: null,
        restSeconds: 20,
        tempo: null,
      },
      {
        exercise: "Freestyle steady",
        sets: 8,
        reps: 100,
        weightKg: null,
        restSeconds: 20,
        tempo: null,
      },
    ],
  }),
  template(
    "walk-recovery",
    "cardio",
    "Easy recovery walk between hard days.",
    "Recovery walk",
    "walk",
    {
      durationMin: 30,
      rpe: 2,
      distanceM: Math.round(1.5 * METRES_PER_MILE),
    },
  ),
  template("yoga-flow", "mindbody", "Vinyasa flow with a mobility finish.", "Yoga flow", "yoga", {
    durationMin: 40,
    rpe: 3,
    notes: "Sun salutations · standing sequence · hip openers · savasana.",
    exercises: [
      {
        exercise: "Sun salutations",
        sets: 5,
        reps: null,
        weightKg: null,
        restSeconds: null,
        tempo: null,
      },
      {
        exercise: "Hip openers",
        sets: 1,
        reps: null,
        weightKg: null,
        restSeconds: null,
        tempo: null,
      },
      {
        exercise: "Restorative",
        sets: 1,
        reps: null,
        weightKg: null,
        restSeconds: null,
        tempo: null,
      },
    ],
  }),
  template(
    "yoga-beginner-flow",
    "mindbody",
    "Gentle 20-minute flow — no inversions, all standing and floor basics.",
    "Beginner yoga flow",
    "yoga",
    {
      durationMin: 20,
      rpe: 2,
      notes:
        "Breathe through the nose · hold each shape 5 breaths · come out of anything that pinches.",
      exercises: [
        "Mountain pose",
        "Standing forward fold",
        "Low lunge",
        "Downward dog",
        "Cat-cow",
        "Cobra pose",
        "Bridge pose",
        "Butterfly pose",
        "Corpse pose",
      ].map((exercise) => ({
        exercise,
        sets: 1,
        reps: null,
        weightKg: null,
        restSeconds: null,
        tempo: null,
      })),
    },
  ),
  template(
    "yoga-intermediate-vinyasa",
    "mindbody",
    "35-minute vinyasa: sun salutations into a standing balance sequence.",
    "Intermediate vinyasa",
    "yoga",
    {
      durationMin: 35,
      rpe: 4,
      notes: "3 rounds of the standing sequence on each side, linking breath to movement.",
      exercises: [
        { name: "Sun salutations", sets: 5 },
        { name: "Warrior I", sets: 2 },
        { name: "Warrior II", sets: 2 },
        { name: "Extended side angle", sets: 2 },
        { name: "Triangle pose", sets: 2 },
        { name: "Chaturanga", sets: 3 },
        { name: "Upward dog", sets: 3 },
        { name: "Tree pose", sets: 2 },
        { name: "Seated twist", sets: 2 },
        { name: "Corpse pose", sets: 1 },
      ].map(({ name, sets }) => ({
        exercise: name,
        sets,
        reps: null,
        weightKg: null,
        restSeconds: null,
        tempo: null,
      })),
    },
  ),
  template(
    "yoga-advanced-power",
    "mindbody",
    "50-minute power flow with arm balances, backbends and an inversion.",
    "Advanced power yoga",
    "yoga",
    {
      durationMin: 50,
      rpe: 6,
      notes:
        "Warm thoroughly before the backbends · only take headstand against a wall if it is new.",
      exercises: [
        { name: "Sun salutations", sets: 8 },
        { name: "Warrior III", sets: 2 },
        { name: "Half moon pose", sets: 2 },
        { name: "Dancer pose", sets: 2 },
        { name: "Eagle pose", sets: 2 },
        { name: "Crow pose", sets: 3 },
        { name: "Headstand", sets: 1 },
        { name: "Camel pose", sets: 2 },
        { name: "Wheel pose", sets: 3 },
        { name: "Boat pose", sets: 3 },
        { name: "Legs up the wall", sets: 1 },
        { name: "Corpse pose", sets: 1 },
      ].map(({ name, sets }) => ({
        exercise: name,
        sets,
        reps: null,
        weightKg: null,
        restSeconds: null,
        tempo: null,
      })),
    },
  ),
  template(
    "mobility-reset",
    "mindbody",
    "15-minute joint-by-joint reset.",
    "Mobility reset",
    "mobility",
    {
      durationMin: 15,
      rpe: 2,
      exercises: [
        {
          exercise: "Hip mobility",
          sets: 1,
          reps: null,
          weightKg: null,
          restSeconds: null,
          tempo: null,
        },
        {
          exercise: "Thoracic rotations",
          sets: 1,
          reps: 10,
          weightKg: null,
          restSeconds: null,
          tempo: null,
        },
        {
          exercise: "Ankle mobility",
          sets: 1,
          reps: 10,
          weightKg: null,
          restSeconds: null,
          tempo: null,
        },
      ],
    },
  ),
  template(
    "boxing-rounds",
    "sport",
    "Bag and pad rounds, 3 min on / 1 off.",
    "Boxing rounds",
    "boxing",
    {
      durationMin: 45,
      rpe: 8,
      exercises: [
        {
          exercise: "Shadow boxing",
          sets: 3,
          reps: null,
          weightKg: null,
          restSeconds: 60,
          tempo: null,
        },
        {
          exercise: "Heavy bag",
          sets: 6,
          reps: null,
          weightKg: null,
          restSeconds: 60,
          tempo: null,
        },
      ],
    },
  ),
  template(
    "climbing-session",
    "sport",
    "Bouldering with a hangboard finish.",
    "Climbing session",
    "climbing",
    {
      durationMin: 75,
      rpe: 7,
      exercises: [
        {
          exercise: "Traversing",
          sets: 3,
          reps: null,
          weightKg: null,
          restSeconds: 90,
          tempo: null,
        },
        {
          exercise: "Bouldering",
          sets: 8,
          reps: null,
          weightKg: null,
          restSeconds: 180,
          tempo: null,
        },
      ],
    },
  ),
  template(
    "full-body-strength",
    "strength",
    "Three big lifts plus accessories.",
    "Full-body strength",
    "strength",
    {
      durationMin: 60,
      rpe: 7,
      exercises: [
        {
          exercise: "Back squat",
          sets: 4,
          reps: 6,
          weightKg: null,
          restSeconds: 150,
          tempo: "3-1-1",
        },
        {
          exercise: "Bench press",
          sets: 4,
          reps: 6,
          weightKg: null,
          restSeconds: 150,
          tempo: "3-1-1",
        },
        {
          exercise: "Barbell row",
          sets: 3,
          reps: 8,
          weightKg: null,
          restSeconds: 120,
          tempo: null,
        },
        { exercise: "Plank", sets: 3, reps: null, weightKg: null, restSeconds: 60, tempo: null },
      ],
    },
  ),
];

/** Starter templates for one family, or all of them. */
export function starterTemplatesFor(family: WorkoutFamily | "all"): StarterTemplate[] {
  if (family === "all") return [...STARTER_TEMPLATES];
  return STARTER_TEMPLATES.filter((t) => t.family === family);
}

/** Starters the user hasn't already copied (matched on name, case-insensitive). */
export function unusedStarters(
  existingNames: readonly string[],
  family: WorkoutFamily | "all" = "all",
): StarterTemplate[] {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  return starterTemplatesFor(family).filter((t) => !taken.has(t.input.name.toLowerCase()));
}
