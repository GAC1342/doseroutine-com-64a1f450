/**
 * QA gate: every exercise must be paired with a pose figure that actually
 * depicts the movement (the "calf raise showed a standing press" class of bug).
 *
 * Two independent checks:
 *  1. Name-level: each exercise name has an explicitly approved pose set.
 *  2. Anatomy-level: each pose implies muscles the exercise must be working.
 */

import { describe, expect, it } from "vitest";
import type { MuscleRegion } from "@/components/muscle-map";
import { MUSCLE_GROUPS } from "@/lib/muscle-groups";
import { POSES, type PoseId } from "@/lib/muscle-poses";

/** Exercise name (lowercased) → poses that correctly depict it. */
const APPROVED_POSES: Record<string, PoseId[]> = {
  "bench press": ["benchLying"],
  "incline dumbbell press": ["inclineBench"],
  "push-up": ["pushupFloor"],
  "cable fly": ["cableStand"],
  dip: ["dipBars"],
  "pull-up": ["hang"],
  "chin-up": ["hang"],
  "barbell row": ["standingHinge", "seatedRow"],
  "lat pulldown": ["machineSeated"],
  "seated cable row": ["seatedRow", "machineSeated"],
  deadlift: ["standingHinge"],
  "romanian deadlift": ["standingHinge"],
  "overhead press": ["standingPress"],
  "lateral raise": ["standingCurl", "cableStand"],
  "face pull": ["cableStand"],
  "bicep curl": ["standingCurl"],
  "triceps pushdown": ["cableStand"],
  "back squat": ["squat"],
  "leg press": ["machineSeated"],
  lunge: ["lunge"],
  "bulgarian split squat": ["lunge"],
  "leg curl": ["machineSeated"],
  "leg extension": ["machineSeated"],
  "hip thrust": ["hipThrust"],
  "glute bridge": ["floorLying", "hipThrust"],
  "hanging leg raise": ["hang"],
  plank: ["plank"],
  "side plank": ["sidePlank"],
  "hollow hold": ["floorLying"],
  "calf raise": ["calfRaise"],
  "jump rope": ["rope"],
  "sprint interval": ["run"],
  "rowing intervals": ["rowErg"],
  "assault bike": ["bike"],
  burpee: ["pushupFloor", "squat"],
  "dead bug": ["floorLying"],
  "bird dog": ["plank"],
  "bicycle crunch": ["floorLying"],
  "russian twist": ["floorLying"],
  "reverse crunch": ["floorLying"],
  "flutter kicks": ["floorLying"],
  "v-up": ["floorLying"],
  "superman hold": ["floorLying"],
  "bear crawl hold": ["plank"],
  "ab wheel rollout": ["plank"],
  "pallof press": ["cableStand"],
  "dumbbell bench press": ["benchLying"],
  "machine chest press": ["machineSeated"],
  "decline push-up": ["pushupFloor"],
  "dumbbell floor press": ["floorLying"],
  "chest-supported row": ["machineSeated"],
  "single-arm dumbbell row": ["seatedRow"],
  "t-bar row": ["standingHinge"],
  "straight-arm pulldown": ["cableStand"],
  "rack pull": ["standingHinge"],
  "dumbbell shoulder press": ["machineSeated"],
  "arnold press": ["machineSeated"],
  "cable lateral raise": ["cableStand"],
  "rear delt fly": ["machineSeated"],
  "upright row": ["standingPress"],
  "barbell shrug": ["standingPress"],
  "hammer curl": ["standingCurl"],
  "incline dumbbell curl": ["inclineBench"],
  "preacher curl": ["machineSeated"],
  "skull crusher": ["benchLying"],
  "overhead cable extension": ["cableStand"],
  "close-grip bench press": ["benchLying"],
  "reverse curl": ["standingCurl"],
};

/**
 * Pose → at least one of these muscles must be primary or secondary.
 * Catches a pose being reused on a movement it cannot possibly depict.
 */
const POSE_MUSCLE_EXPECTATIONS: Partial<Record<PoseId, MuscleRegion[]>> = {
  benchLying: ["chest", "triceps"],
  inclineBench: ["chest", "frontDelts", "biceps"],
  pushupFloor: ["chest", "triceps", "abs", "heart"],
  dipBars: ["chest", "triceps"],
  cableStand: [
    "chest",
    "triceps",
    "rearDelts",
    "sideDelts",
    "upperBack",
    "biceps",
    "abs",
    "obliques",
  ],
  standingPress: ["frontDelts", "sideDelts", "triceps", "traps"],
  standingCurl: ["biceps", "sideDelts", "forearms"],
  standingHinge: ["lats", "upperBack", "lowerBack", "hamstrings", "glutes"],
  seatedRow: ["lats", "upperBack", "rearDelts"],
  machineSeated: [
    "lats",
    "quads",
    "hamstrings",
    "upperBack",
    "chest",
    "frontDelts",
    "rearDelts",
    "biceps",
  ],
  squat: ["quads", "glutes", "heart"],
  lunge: ["quads", "glutes", "hamstrings"],
  hipThrust: ["glutes", "hamstrings"],
  floorLying: ["abs", "glutes", "obliques", "chest", "triceps"],
  plank: ["abs", "obliques"],
  sidePlank: ["obliques", "abs"],
  hang: ["lats", "abs", "biceps"],
  calfRaise: ["calves"],
  run: ["heart", "quads", "calves"],
  bike: ["heart", "quads"],
  rope: ["calves", "heart"],
  rowErg: ["heart", "lats", "upperBack"],
};

const allExercises = MUSCLE_GROUPS.flatMap((g) => g.exercises.map((e) => ({ group: g.key, ...e })));

describe("exercise → pose figure mapping", () => {
  it("gives every exercise an approved pose", () => {
    const wrong = allExercises
      .filter((e) => {
        const approved = APPROVED_POSES[e.name.toLowerCase()];
        return !approved || !approved.includes(e.pose);
      })
      .map((e) => `${e.group}/${e.name} → ${e.pose}`);
    expect(
      wrong,
      "Unapproved or missing pose mapping. Add the exercise to APPROVED_POSES with the pose that depicts the movement.",
    ).toEqual([]);
  });

  it("has no stale entries in the approved list", () => {
    const names = new Set(allExercises.map((e) => e.name.toLowerCase()));
    const stale = Object.keys(APPROVED_POSES).filter((n) => !names.has(n));
    expect(stale).toEqual([]);
  });

  it("uses poses whose anatomy matches the muscles worked", () => {
    const mismatches: string[] = [];
    for (const e of allExercises) {
      const expected = POSE_MUSCLE_EXPECTATIONS[e.pose];
      if (!expected) continue;
      const worked = new Set<MuscleRegion>([...e.primary, ...(e.secondary ?? [])]);
      if (!expected.some((m) => worked.has(m))) {
        mismatches.push(
          `${e.group}/${e.name} uses pose "${e.pose}" but works ${[...worked].join(", ")}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("references only defined poses, and every pose is drawable", () => {
    for (const e of allExercises) {
      const p = POSES[e.pose];
      expect(p, `pose "${e.pose}" is not defined`).toBeTruthy();
      expect(p.parts.length, `pose "${e.pose}" has no body parts`).toBeGreaterThan(0);
    }
  });

  it("every declared pose is covered by the anatomy expectations", () => {
    const missing = (Object.keys(POSES) as PoseId[]).filter((p) => !POSE_MUSCLE_EXPECTATIONS[p]);
    expect(missing, "Add anatomy expectations for new poses").toEqual([]);
  });
});
