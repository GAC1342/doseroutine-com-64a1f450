/**
 * Exercises grouped by body part, ranked best → solid.
 *
 * Powers the visual "pick by muscle group" picker in the workout sheet, so a
 * user can tap a body part and add a well-known movement without typing.
 * Ranks follow common strength-coaching guidance (compound first, then
 * accessories); they are suggestions, not prescriptions.
 *
 * Each exercise also carries the muscles it works, so the picker can show a
 * body map with those muscles highlighted, plus a couple of short form cues.
 */

import type { MuscleRegion } from "@/components/muscle-map";
import type { PoseId } from "@/lib/muscle-poses";

export type MuscleGroupKey =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "glutes"
  | "abs"
  | "calves"
  | "cardio";

export type MuscleGroupExercise = {
  name: string;
  note: string;
  /** Prime movers, painted solid on the body map. */
  primary: MuscleRegion[];
  /** Supporting muscles, painted faded. */
  secondary?: MuscleRegion[];
  /** Force a body view; defaults to whichever side shows the prime movers. */
  view?: "front" | "back";
  /** Body position figure shown next to the anatomy map. */
  pose: PoseId;
  /** Optional override for the setup line under the pose figure. */
  setup?: string;
  /** Two or three short form cues shown in the enlarged view. */
  cues: string[];
};

export type MuscleGroup = {
  key: MuscleGroupKey;
  label: string;
  /** Short reason this body part matters, shown under the label. */
  blurb: string;
  exercises: MuscleGroupExercise[];
};

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  {
    key: "chest",
    label: "Chest",
    blurb: "Upper body strength & mass",
    exercises: [
      {
        name: "Bench press",
        note: "Overall mass builder",
        pose: "benchLying",
        primary: ["chest"],
        secondary: ["frontDelts", "triceps"],
        cues: [
          "Shoulder blades pulled back and down",
          "Lower to mid-chest, elbows about 45°",
          "Press up and slightly back, feet planted",
        ],
      },
      {
        name: "Incline dumbbell press",
        note: "Targets upper chest",
        pose: "inclineBench",
        primary: ["chest", "frontDelts"],
        secondary: ["triceps"],
        cues: ["Bench at 30–45°", "Wrists stacked over elbows", "Stop just short of locking out"],
      },
      {
        name: "Push-up",
        note: "Strength & definition",
        pose: "pushupFloor",
        primary: ["chest"],
        secondary: ["frontDelts", "triceps", "abs"],
        cues: ["Body in one straight line", "Hands slightly wider than shoulders", "Chest to floor, then push away"],
      },
      {
        name: "Cable fly",
        note: "Stretch and squeeze",
        pose: "cableStand",
        primary: ["chest"],
        secondary: ["frontDelts"],
        cues: ["Soft bend in the elbows", "Hug the arms together, don't press", "Slow on the stretch"],
      },
      {
        name: "Dip",
        note: "Lower chest & triceps",
        pose: "dipBars",
        primary: ["chest", "triceps"],
        secondary: ["frontDelts"],
        cues: ["Lean the torso forward for chest", "Lower until upper arms are parallel", "Keep shoulders down"],
      },
    ],
  },
  {
    key: "back",
    label: "Back",
    blurb: "Width, thickness, posture",
    exercises: [
      {
        name: "Pull-up",
        note: "Best for width",
        pose: "hang",
        primary: ["lats"],
        secondary: ["biceps", "upperBack", "rearDelts", "forearms"],
        cues: ["Start from a full hang", "Drive elbows down to the ribs", "Chest to the bar, no swinging"],
      },
      {
        name: "Barbell row",
        note: "Builds thickness",
        pose: "standingHinge",
        primary: ["upperBack", "lats"],
        secondary: ["rearDelts", "biceps", "lowerBack", "forearms", "traps"],
        cues: ["Hinge to about 45°, flat back", "Pull to the belly button", "Control it back down"],
      },
      {
        name: "Lat pulldown",
        note: "Targets lats",
        pose: "machineSeated",
        primary: ["lats"],
        secondary: ["biceps", "upperBack", "rearDelts", "forearms"],
        cues: ["Slight lean back, chest tall", "Bar to the collarbone", "Let the shoulders stretch up at the top"],
      },
      {
        name: "Seated cable row",
        note: "Mid-back detail",
        pose: "seatedRow",
        primary: ["upperBack"],
        secondary: ["lats", "rearDelts", "biceps", "traps", "forearms"],
        cues: ["Sit tall, no rocking", "Squeeze the shoulder blades", "Handle to the lower ribs"],
      },
      {
        name: "Deadlift",
        note: "Whole posterior chain",
        pose: "standingHinge",
        primary: ["lowerBack", "hamstrings", "glutes"],
        secondary: ["upperBack", "traps", "forearms", "quads"],
        cues: ["Bar over mid-foot, back flat", "Push the floor away", "Lock out with the glutes, not the spine"],
      },
    ],
  },
  {
    key: "shoulders",
    label: "Shoulders",
    blurb: "Round, defined delts",
    exercises: [
      {
        name: "Overhead press",
        note: "Best overall builder",
        pose: "standingPress",
        primary: ["frontDelts", "sideDelts"],
        secondary: ["triceps", "abs", "traps", "upperBack"],
        cues: ["Squeeze the glutes, ribs down", "Press straight up past the forehead", "Finish with biceps by the ears"],
      },
      {
        name: "Lateral raise",
        note: "Targets side delts",
        pose: "standingCurl",
        primary: ["sideDelts"],
        secondary: ["traps"],
        cues: ["Lead with the elbows", "Stop at shoulder height", "Light weight, no swinging"],
      },
      {
        name: "Face pull",
        note: "Rear delts & health",
        pose: "cableStand",
        primary: ["rearDelts"],
        secondary: ["upperBack", "traps"],
        cues: ["Rope to the forehead", "Pull elbows high and wide", "Pause and squeeze"],
      },
      {
        name: "Incline dumbbell press",
        note: "Front delt carryover",
        pose: "inclineBench",
        primary: ["frontDelts", "chest"],
        secondary: ["triceps"],
        cues: ["Bench at 30–45°", "Elbows under the wrists", "Control the lowering"],
      },
    ],
  },
  {
    key: "arms",
    label: "Arms",
    blurb: "Biceps & triceps",
    exercises: [
      {
        name: "Bicep curl",
        note: "Best for bicep mass",
        pose: "standingCurl",
        primary: ["biceps"],
        secondary: ["forearms"],
        cues: ["Elbows pinned to the sides", "No swinging the torso", "Lower slowly, full stretch"],
      },
      {
        name: "Triceps pushdown",
        note: "Tricep growth",
        pose: "cableStand",
        primary: ["triceps"],
        secondary: ["forearms"],
        cues: ["Elbows tight to the ribs", "Straighten fully, squeeze", "Only the forearms move"],
      },
      {
        name: "Chin-up",
        note: "Loaded bicep compound",
        pose: "hang",
        primary: ["biceps", "lats"],
        secondary: ["upperBack", "forearms"],
        cues: ["Underhand, shoulder-width grip", "Pull the chest to the bar", "Lower under control"],
      },
      {
        name: "Dip",
        note: "Heavy tricep work",
        pose: "dipBars",
        primary: ["triceps"],
        secondary: ["chest", "frontDelts"],
        cues: ["Torso upright for triceps", "Elbows tracking back", "Lock out at the top"],
      },
    ],
  },
  {
    key: "legs",
    label: "Legs",
    blurb: "Quads & hamstrings",
    exercises: [
      {
        name: "Back squat",
        note: "King of leg work",
        pose: "squat",
        primary: ["quads", "glutes"],
        secondary: ["hamstrings", "abs", "lowerBack"],
        cues: ["Brace hard before you descend", "Knees track over the toes", "Hips and chest rise together"],
      },
      {
        name: "Romanian deadlift",
        note: "Hamstrings & glutes",
        pose: "standingHinge",
        primary: ["hamstrings", "glutes"],
        secondary: ["lowerBack", "forearms"],
        cues: ["Push the hips back, soft knees", "Bar stays close to the legs", "Stop when the hamstrings stop stretching"],
      },
      {
        name: "Leg press",
        note: "Size with less fatigue",
        pose: "machineSeated",
        primary: ["quads"],
        secondary: ["glutes", "hamstrings", "calves"],
        cues: ["Lower until the knees hit 90°", "Keep the lower back on the pad", "Don't slam the lockout"],
      },
      {
        name: "Lunge",
        note: "Single-leg balance",
        pose: "lunge",
        primary: ["quads", "glutes"],
        secondary: ["hamstrings", "calves"],
        cues: ["Long step, tall chest", "Back knee close to the floor", "Drive through the front heel"],
      },
      {
        name: "Leg curl",
        note: "Direct hamstrings",
        pose: "machineSeated",
        primary: ["hamstrings"],
        secondary: ["calves"],
        cues: ["Hips flat on the pad", "Curl all the way in", "Slow three-count on the way back"],
      },
      {
        name: "Leg extension",
        note: "Direct quads",
        pose: "machineSeated",
        primary: ["quads"],
        cues: ["Knees in line with the pivot", "Pause at the top", "No bouncing out of the bottom"],
      },
    ],
  },
  {
    key: "glutes",
    label: "Glutes",
    blurb: "Shape, strength, power",
    exercises: [
      {
        name: "Hip thrust",
        note: "Most effective for growth",
        pose: "hipThrust",
        primary: ["glutes"],
        secondary: ["hamstrings", "abs", "quads"],
        cues: ["Chin tucked, ribs down", "Drive through the heels", "Squeeze hard at lockout"],
      },
      {
        name: "Glute bridge",
        note: "Great for activation",
        pose: "floorLying",
        primary: ["glutes"],
        secondary: ["hamstrings", "abs"],
        cues: ["Feet close to the hips", "Lift until hips are level", "Pause two seconds at the top"],
      },
      {
        name: "Bulgarian split squat",
        note: "Strength & symmetry",
        pose: "lunge",
        primary: ["glutes", "quads"],
        secondary: ["hamstrings", "abs", "calves"],
        cues: ["Lean forward slightly for glutes", "Front shin near vertical", "Control the descent"],
      },
      {
        name: "Romanian deadlift",
        note: "Stretch under load",
        pose: "standingHinge",
        primary: ["glutes", "hamstrings"],
        secondary: ["lowerBack"],
        cues: ["Hips back, not down", "Flat back throughout", "Finish by squeezing the glutes"],
      },
    ],
  },
  {
    key: "abs",
    label: "Abs & core",
    blurb: "Core strength",
    exercises: [
      {
        name: "Hanging leg raise",
        note: "Best for lower abs",
        pose: "hang",
        primary: ["abs"],
        secondary: ["obliques", "forearms"],
        cues: ["No swinging — start dead still", "Curl the pelvis up, not just the legs", "Lower slowly"],
      },
      {
        name: "Plank",
        note: "Stability & endurance",
        pose: "plank",
        primary: ["abs"],
        secondary: ["obliques", "frontDelts", "glutes"],
        cues: ["Elbows under shoulders", "Squeeze glutes, tuck the ribs", "Straight line head to heels"],
      },
      {
        name: "Hollow hold",
        note: "Full-core tension",
        pose: "floorLying",
        primary: ["abs"],
        secondary: ["obliques"],
        cues: ["Lower back pressed into the floor", "Arms and legs long", "Lower them only as far as you can hold"],
      },
      {
        name: "Side plank",
        note: "Obliques",
        pose: "sidePlank",
        primary: ["obliques"],
        secondary: ["abs", "sideDelts"],
        cues: ["Stack the feet and hips", "Push the floor away", "Hips high, don't sag"],
      },
      {
        name: "Dead bug",
        note: "Beginner-friendly, back-safe",
        pose: "floorLying",
        primary: ["abs"],
        secondary: ["obliques"],
        cues: [
          "Press the lower back flat into the floor",
          "Extend opposite arm and leg slowly",
          "Breathe out as you reach",
        ],
      },
      {
        name: "Bird dog",
        note: "Core + lower-back stability",
        pose: "plank",
        primary: ["abs"],
        secondary: ["lowerBack", "glutes"],
        cues: [
          "Start on hands and knees, spine neutral",
          "Reach opposite arm and leg long, not high",
          "Keep the hips level — no rotation",
        ],
      },
      {
        name: "Bicycle crunch",
        note: "Obliques with rotation",
        pose: "floorLying",
        primary: ["obliques"],
        secondary: ["abs"],
        cues: ["Rotate from the ribs, not the elbows", "Keep the lower back down", "Slow and controlled"],
      },
      {
        name: "Russian twist",
        note: "Rotational strength",
        pose: "floorLying",
        primary: ["obliques"],
        secondary: ["abs"],
        cues: ["Lean back until you feel the core switch on", "Turn the shoulders, not just the arms", "Chest tall"],
      },
      {
        name: "Reverse crunch",
        note: "Lower abs",
        pose: "floorLying",
        primary: ["abs"],
        secondary: ["obliques"],
        cues: ["Curl the hips off the floor", "Stop swinging the legs", "Lower one vertebra at a time"],
      },
      {
        name: "Flutter kicks",
        note: "Lower-ab endurance",
        pose: "floorLying",
        primary: ["abs"],
        secondary: ["quads"],
        cues: ["Hands under the hips", "Small, fast kicks", "Stop if the lower back arches"],
      },
      {
        name: "V-up",
        note: "Full-core power",
        pose: "floorLying",
        primary: ["abs"],
        secondary: ["obliques", "quads"],
        cues: ["Reach hands to toes", "Keep the legs straight", "Lower under control"],
      },
      {
        name: "Superman hold",
        note: "Lower back & glutes",
        pose: "floorLying",
        primary: ["lowerBack"],
        secondary: ["glutes", "abs"],
        cues: ["Lift arms and legs a few inches only", "Lengthen, don't crunch the spine", "Look at the floor"],
      },
      {
        name: "Bear crawl hold",
        note: "Deep-core bracing",
        pose: "plank",
        primary: ["abs"],
        secondary: ["frontDelts", "quads"],
        cues: ["Knees an inch off the floor", "Flat back, hips low", "Breathe steadily"],
      },
      {
        name: "Ab wheel rollout",
        note: "Advanced anti-extension",
        pose: "plank",
        primary: ["abs"],
        secondary: ["lats", "frontDelts"],
        cues: ["Start from the knees", "Ribs down, glutes squeezed", "Only roll as far as you can hold the back flat"],
      },
      {
        name: "Pallof press",
        note: "Anti-rotation",
        pose: "cableStand",
        primary: ["obliques"],
        secondary: ["abs", "frontDelts"],
        cues: ["Stand side-on to the cable", "Press straight out and resist the twist", "Hold two seconds"],
      },
    ],
  },
  {
    key: "calves",
    label: "Calves",
    blurb: "Lower leg development",
    exercises: [
      {
        name: "Calf raise",
        note: "Best for overall growth",
        pose: "calfRaise",
        primary: ["calves"],
        cues: ["Full stretch at the bottom", "Rise all the way onto the toes", "Pause one second at the top"],
      },
      {
        name: "Jump rope",
        note: "Endurance & springiness",
        pose: "rope",
        primary: ["calves"],
        secondary: ["heart", "forearms"],
        cues: ["Small hops, stay on the balls of the feet", "Turn the rope with the wrists", "Soft knees on landing"],
      },
    ],
  },
  {
    key: "cardio",
    label: "Cardio",
    blurb: "Heart health & conditioning",
    exercises: [
      {
        name: "Sprint interval",
        note: "Fat loss & performance",
        pose: "run",
        primary: ["heart"],
        secondary: ["quads", "hamstrings", "glutes", "calves", "abs"],
        cues: ["Warm up properly first", "Hard effort, then full recovery", "Tall posture, relaxed shoulders"],
      },
      {
        name: "Rowing intervals",
        note: "Full-body conditioning",
        pose: "rowErg",
        primary: ["heart"],
        secondary: ["lats", "quads", "upperBack", "glutes", "hamstrings", "biceps"],
        cues: ["Legs, then back, then arms", "Reverse the order on the return", "Keep the chain level"],
      },
      {
        name: "Assault bike",
        note: "Low impact, high burn",
        pose: "bike",
        primary: ["heart"],
        secondary: ["quads", "hamstrings", "frontDelts", "upperBack"],
        cues: ["Push and pull with the arms", "Steady seat height", "Pace it — it bites back"],
      },
      {
        name: "Jump rope",
        note: "Simple and effective",
        pose: "rope",
        primary: ["heart"],
        secondary: ["calves"],
        cues: ["Small hops", "Wrists do the work", "Land softly"],
      },
      {
        name: "Burpee",
        note: "No equipment needed",
        pose: "pushupFloor",
        primary: ["heart"],
        secondary: ["chest", "frontDelts", "triceps", "quads", "glutes", "abs"],
        cues: ["Chest to floor each rep", "Jump the feet in, not out", "Stand tall at the top"],
      },
    ],
  },
];

export function muscleGroup(key: MuscleGroupKey): MuscleGroup | undefined {
  return MUSCLE_GROUPS.find((g) => g.key === key);
}
