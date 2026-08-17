/**
 * Body-position pictograms for exercises.
 *
 * Each pose is drawn in a shared 100 x 100 viewBox as a set of tapered,
 * rounded segments (torso, upper arm, forearm, thigh, shin, foot) so the
 * figures read like a printed gym chart rather than a stick drawing.
 *
 * Proportion contract (standing figure, floor line at y = 88):
 *   head radius        6
 *   shoulders          y = 31      hip y = 54      torso mass 12
 *   upper arm 12 / forearm 11      thigh 16 / shin 17
 *
 * Segment masses taper from torso -> limb -> extremity so joints stay
 * readable instead of merging into a blob. Equipment is drawn thin and
 * faint, always clear of the body mass.
 */

export type PoseId =
  | "benchLying"
  | "inclineBench"
  | "standingPress"
  | "standingCurl"
  | "standingHinge"
  | "seatedRow"
  | "squat"
  | "hang"
  | "lunge"
  | "plank"
  | "sidePlank"
  | "cableStand"
  | "machineSeated"
  | "floorLying"
  | "hipThrust"
  | "pushupFloor"
  | "dipBars"
  | "calfRaise"
  | "run"
  | "bike"
  | "rope"
  | "rowErg";

/** One body segment: a stroked path whose width gives it mass. */
export type PosePart = { d: string; w: number };

export type Pose = {
  /** Short description of the setup, shown under the figure. */
  label: string;
  /** Head circle: [cx, cy, r]. */
  head: [number, number, number];
  /** Near-side body segments, drawn solid (torso first). */
  parts: PosePart[];
  /** Far-side limbs, drawn at reduced opacity behind the body. */
  farParts?: PosePart[];
  /** Equipment strokes, drawn thin and faint. */
  gear?: string[];
  /** Draw a floor line. */
  ground?: boolean;
};

/** Segment masses, largest to smallest. */
const TORSO = 12;
const THIGH = 8.5;
const UPPER_ARM = 6;
const SHIN = 6.5;
const FOREARM = 5;
const FOOT = 4.5;

export const POSES: Record<PoseId, Pose> = {
  benchLying: {
    label: "Lying flat on a bench, feet planted",
    head: [23, 56, 6],
    parts: [
      { d: "M30 56 H58", w: TORSO },
      { d: "M33 53 L35 42", w: UPPER_ARM },
      { d: "M35 42 L37 33", w: FOREARM },
      { d: "M58 57 L70 66", w: THIGH },
      { d: "M70 66 L72 85", w: SHIN },
      { d: "M70 86 H76", w: FOOT },
    ],
    farParts: [
      { d: "M36 55 L38 45", w: UPPER_ARM },
      { d: "M38 45 L40 36", w: FOREARM },
      { d: "M58 59 L66 68", w: THIGH },
      { d: "M66 68 L67 85", w: SHIN },
    ],
    gear: ["M18 63 H64", "M24 63 V87", "M58 63 V87", "M28 31 H50", "M30 27 v8", "M48 27 v8"],
    ground: true,
  },
  inclineBench: {
    label: "Seated on an incline bench, pressing up",
    head: [59, 32, 6],
    parts: [
      { d: "M56 38 L44 58", w: TORSO },
      { d: "M53 40 L55 29", w: UPPER_ARM },
      { d: "M55 29 L57 20", w: FOREARM },
      { d: "M46 62 L64 68", w: THIGH },
      { d: "M64 68 L67 84", w: SHIN },
      { d: "M65 86 H72", w: FOOT },
    ],
    farParts: [
      { d: "M50 45 L52 33", w: UPPER_ARM },
      { d: "M52 33 L54 24", w: FOREARM },
      { d: "M46 64 L60 70", w: THIGH },
      { d: "M60 70 L62 85", w: SHIN },
    ],
    gear: ["M30 86 L64 42", "M30 86 H62", "M46 17 H70", "M48 13 v8", "M68 13 v8"],
    ground: true,
  },
  standingPress: {
    label: "Standing tall, pressing overhead",
    head: [50, 20, 6],
    parts: [
      { d: "M50 28 V54", w: TORSO },
      { d: "M45 32 L41 22", w: UPPER_ARM },
      { d: "M41 22 L43 14", w: FOREARM },
      { d: "M55 32 L59 22", w: UPPER_ARM },
      { d: "M59 22 L57 14", w: FOREARM },
      { d: "M47 55 L45 70", w: THIGH },
      { d: "M45 70 L45 86", w: SHIN },
      { d: "M43 87 H49", w: FOOT },
      { d: "M53 55 L55 70", w: THIGH },
      { d: "M55 70 L55 86", w: SHIN },
      { d: "M53 87 H59", w: FOOT },
    ],
    gear: ["M32 12 H68", "M34 8 v8", "M66 8 v8"],
    ground: true,
  },
  standingCurl: {
    label: "Standing, elbows pinned to your sides",
    head: [50, 20, 6],
    parts: [
      { d: "M50 28 V54", w: TORSO },
      { d: "M45 32 L43 44", w: UPPER_ARM },
      { d: "M43 44 L49 39", w: FOREARM },
      { d: "M55 32 L57 44", w: UPPER_ARM },
      { d: "M57 44 L51 39", w: FOREARM },
      { d: "M47 55 L45 70", w: THIGH },
      { d: "M45 70 L45 86", w: SHIN },
      { d: "M43 87 H49", w: FOOT },
      { d: "M53 55 L55 70", w: THIGH },
      { d: "M55 70 L55 86", w: SHIN },
      { d: "M53 87 H59", w: FOOT },
    ],
    gear: ["M44 35 v5", "M56 35 v5"],
    ground: true,
  },
  standingHinge: {
    label: "Hips pushed back, flat back over the bar",
    head: [28, 42, 6],
    parts: [
      { d: "M34 44 L58 50", w: TORSO },
      { d: "M37 47 L36 58", w: UPPER_ARM },
      { d: "M36 58 L36 68", w: FOREARM },
      { d: "M60 52 L60 70", w: THIGH },
      { d: "M60 70 L58 86", w: SHIN },
      { d: "M55 87 H63", w: FOOT },
    ],
    farParts: [
      { d: "M41 49 L40 58", w: UPPER_ARM },
      { d: "M40 58 L40 68", w: FOREARM },
      { d: "M60 54 L65 70", w: THIGH },
      { d: "M65 70 L64 86", w: SHIN },
    ],
    gear: ["M26 71 H50", "M28 67 v8", "M48 67 v8"],
    ground: true,
  },
  seatedRow: {
    label: "Seated tall, pulling to the lower ribs",
    head: [32, 35, 6],
    parts: [
      { d: "M35 42 L41 61", w: TORSO },
      { d: "M38 47 L50 51", w: UPPER_ARM },
      { d: "M50 51 L62 54", w: FOREARM },
      { d: "M44 65 L64 66", w: THIGH },
      { d: "M64 66 L72 76", w: SHIN },
    ],
    farParts: [
      { d: "M40 51 L51 55", w: UPPER_ARM },
      { d: "M51 55 L62 57", w: FOREARM },
    ],
    gear: ["M28 71 H52", "M80 46 V82", "M63 54 H80"],
    ground: true,
  },
  squat: {
    label: "Bar on the back, hips below parallel",
    head: [44, 26, 6],
    parts: [
      { d: "M46 33 L47 52", w: TORSO },
      { d: "M42 35 L34 34", w: UPPER_ARM },
      { d: "M51 35 L59 34", w: UPPER_ARM },
      { d: "M50 55 L63 63", w: THIGH },
      { d: "M63 63 L56 79", w: SHIN },
      { d: "M53 86 H62", w: FOOT },
      { d: "M56 79 L58 85", w: SHIN },
    ],
    farParts: [
      { d: "M50 57 L59 65", w: THIGH },
      { d: "M59 65 L52 84", w: SHIN },
    ],
    gear: ["M28 32 H66", "M30 28 v8", "M64 28 v8"],
    ground: true,
  },
  hang: {
    label: "Full hang from the bar, no swinging",
    head: [50, 31, 6],
    parts: [
      { d: "M50 38 V58", w: TORSO },
      { d: "M46 36 L44 25", w: UPPER_ARM },
      { d: "M44 25 L43 16", w: FOREARM },
      { d: "M54 36 L56 25", w: UPPER_ARM },
      { d: "M56 25 L57 16", w: FOREARM },
      { d: "M48 59 L46 73", w: THIGH },
      { d: "M46 73 L47 86", w: SHIN },
      { d: "M52 59 L54 73", w: THIGH },
      { d: "M54 73 L53 86", w: SHIN },
    ],
    gear: ["M22 14 H78", "M28 14 V6", "M72 14 V6"],
  },
  lunge: {
    label: "Long step, chest tall, back knee low",
    head: [43, 24, 6],
    parts: [
      { d: "M44 31 L45 52", w: TORSO },
      { d: "M41 35 L40 46", w: UPPER_ARM },
      { d: "M40 46 L40 56", w: FOREARM },
      { d: "M47 54 L62 65", w: THIGH },
      { d: "M62 65 L63 84", w: SHIN },
      { d: "M60 86 H68", w: FOOT },
    ],
    farParts: [
      { d: "M48 36 L50 47", w: UPPER_ARM },
      { d: "M44 54 L33 67", w: THIGH },
      { d: "M33 67 L26 83", w: SHIN },
    ],
    ground: true,
  },
  plank: {
    label: "Forearms down, straight line head to heels",
    head: [23, 58, 6],
    parts: [
      { d: "M30 61 L56 68", w: TORSO },
      { d: "M58 69 L72 76", w: THIGH },
      { d: "M72 76 L82 83", w: SHIN },
      { d: "M30 64 L28 74", w: UPPER_ARM },
      { d: "M28 74 L40 78", w: FOREARM },
    ],
    farParts: [
      { d: "M58 71 L70 79", w: THIGH },
      { d: "M70 79 L79 85", w: SHIN },
    ],
    ground: true,
  },
  sidePlank: {
    label: "On one forearm, hips stacked and high",
    head: [23, 45, 6],
    parts: [
      { d: "M30 49 L56 62", w: TORSO },
      { d: "M58 64 L72 72", w: THIGH },
      { d: "M72 72 L82 79", w: SHIN },
      { d: "M30 52 L28 68", w: UPPER_ARM },
      { d: "M28 68 L40 76", w: FOREARM },
      { d: "M31 45 L33 33", w: UPPER_ARM },
      { d: "M33 33 L34 23", w: FOREARM },
    ],
    ground: true,
  },
  cableStand: {
    label: "Standing at the cable stack, torso still",
    head: [38, 21, 6],
    parts: [
      { d: "M38 28 V53", w: TORSO },
      { d: "M43 32 L54 37", w: UPPER_ARM },
      { d: "M54 37 L64 41", w: FOREARM },
      { d: "M35 54 L34 70", w: THIGH },
      { d: "M34 70 L34 86", w: SHIN },
      { d: "M32 87 H38", w: FOOT },
      { d: "M41 54 L44 70", w: THIGH },
      { d: "M44 70 L45 86", w: SHIN },
      { d: "M43 87 H49", w: FOOT },
    ],
    farParts: [
      { d: "M42 36 L53 40", w: UPPER_ARM },
      { d: "M53 40 L63 43", w: FOREARM },
    ],
    gear: ["M86 12 V86", "M86 33 L65 41", "M80 16 H92"],
    ground: true,
  },
  machineSeated: {
    label: "Seated in the machine, back on the pad",
    head: [29, 40, 6],
    parts: [
      { d: "M31 47 L37 63", w: TORSO },
      { d: "M34 51 L46 55", w: UPPER_ARM },
      { d: "M46 55 L58 58", w: FOREARM },
      { d: "M40 66 L60 64", w: THIGH },
      { d: "M60 64 L71 58", w: SHIN },
    ],
    farParts: [
      { d: "M36 55 L47 59", w: UPPER_ARM },
      { d: "M47 59 L58 61", w: FOREARM },
    ],
    gear: ["M23 42 V72", "M21 72 H48", "M76 46 V70", "M72 52 H82"],
    ground: true,
  },
  floorLying: {
    label: "On your back on the floor, low back flat",
    head: [23, 74, 6],
    parts: [
      { d: "M30 76 H52", w: TORSO },
      { d: "M54 77 L66 65", w: THIGH },
      { d: "M66 65 L77 76", w: SHIN },
      { d: "M33 72 L39 63", w: UPPER_ARM },
      { d: "M39 63 L43 56", w: FOREARM },
    ],
    farParts: [
      { d: "M54 79 L64 68", w: THIGH },
      { d: "M64 68 L74 79", w: SHIN },
    ],
    ground: true,
  },
  hipThrust: {
    label: "Shoulders on a bench, hips driven up",
    head: [25, 52, 6],
    parts: [
      { d: "M31 55 L52 60", w: TORSO },
      { d: "M54 62 L64 73", w: THIGH },
      { d: "M64 73 L68 85", w: SHIN },
      { d: "M65 87 H73", w: FOOT },
      { d: "M33 57 L43 61", w: UPPER_ARM },
    ],
    farParts: [
      { d: "M54 64 L61 75", w: THIGH },
      { d: "M61 75 L64 86", w: SHIN },
    ],
    gear: ["M16 60 H40", "M20 60 V87", "M44 57 H66", "M46 53 v8", "M64 53 v8"],
    ground: true,
  },
  pushupFloor: {
    label: "Hands under the chest, body in one line",
    head: [23, 60, 6],
    parts: [
      { d: "M30 63 L56 70", w: TORSO },
      { d: "M58 71 L72 77", w: THIGH },
      { d: "M72 77 L82 84", w: SHIN },
      { d: "M31 66 L31 75", w: UPPER_ARM },
      { d: "M31 75 L31 85", w: FOREARM },
    ],
    farParts: [
      { d: "M58 73 L70 80", w: THIGH },
      { d: "M70 80 L79 86", w: SHIN },
    ],
    ground: true,
  },
  dipBars: {
    label: "Supported on parallel bars, elbows back",
    head: [50, 24, 6],
    parts: [
      { d: "M50 31 V53", w: TORSO },
      { d: "M45 34 L41 43", w: UPPER_ARM },
      { d: "M41 43 L39 51", w: FOREARM },
      { d: "M55 34 L59 43", w: UPPER_ARM },
      { d: "M59 43 L61 51", w: FOREARM },
      { d: "M51 55 L55 67", w: THIGH },
      { d: "M55 67 L49 77", w: SHIN },
    ],
    farParts: [
      { d: "M50 57 L51 68", w: THIGH },
      { d: "M51 68 L45 77", w: SHIN },
    ],
    gear: ["M26 52 H38", "M62 52 H74", "M31 52 V87", "M69 52 V87"],
    ground: true,
  },
  calfRaise: {
    label: "Standing tall, rising onto the balls of the feet",
    head: [50, 20, 6],
    parts: [
      { d: "M50 28 V54", w: TORSO },
      { d: "M45 32 L43 44", w: UPPER_ARM },
      { d: "M43 44 L43 58", w: FOREARM },
      { d: "M55 32 L57 44", w: UPPER_ARM },
      { d: "M57 44 L57 58", w: FOREARM },
      { d: "M47 55 L47 72", w: THIGH },
      { d: "M47 72 L47 82", w: SHIN },
      { d: "M43 88 L47 82", w: FOOT },
      { d: "M53 55 L53 72", w: THIGH },
      { d: "M53 72 L53 82", w: SHIN },
      { d: "M53 82 L57 88", w: FOOT },
    ],
    gear: ["M40 58 v4", "M46 58 v4", "M54 58 v4", "M60 58 v4"],
    ground: true,
  },
  run: {
    label: "Sprint posture — tall, relaxed shoulders",
    head: [52, 20, 6],
    parts: [
      { d: "M51 27 L49 50", w: TORSO },
      { d: "M53 31 L61 26", w: UPPER_ARM },
      { d: "M61 26 L65 34", w: FOREARM },
      { d: "M52 52 L63 63", w: THIGH },
      { d: "M63 63 L68 79", w: SHIN },
      { d: "M66 85 H74", w: FOOT },
      { d: "M68 79 L70 84", w: SHIN },
    ],
    farParts: [
      { d: "M47 31 L39 39", w: UPPER_ARM },
      { d: "M39 39 L41 29", w: FOREARM },
      { d: "M49 52 L38 61", w: THIGH },
      { d: "M38 61 L42 75", w: SHIN },
    ],
    ground: true,
  },
  bike: {
    label: "Seated on the bike, pushing and pulling",
    head: [37, 27, 6],
    parts: [
      { d: "M39 34 L44 52", w: TORSO },
      { d: "M42 37 L52 36", w: UPPER_ARM },
      { d: "M52 36 L61 34", w: FOREARM },
      { d: "M46 55 L59 63", w: THIGH },
      { d: "M59 63 L57 74", w: SHIN },
    ],
    farParts: [
      { d: "M46 57 L55 66", w: THIGH },
      { d: "M55 66 L54 73", w: SHIN },
    ],
    gear: [
      "M64 20 V63",
      "M57 34 H70",
      "M34 58 H50",
      "M58 76 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0",
    ],
    ground: true,
  },
  rope: {
    label: "Small hops, wrists turning the rope",
    head: [50, 21, 6],
    parts: [
      { d: "M50 28 V51", w: TORSO },
      { d: "M45 32 L42 42", w: UPPER_ARM },
      { d: "M42 42 L44 49", w: FOREARM },
      { d: "M55 32 L58 42", w: UPPER_ARM },
      { d: "M58 42 L56 49", w: FOREARM },
      { d: "M47 53 L46 67", w: THIGH },
      { d: "M46 67 L47 79", w: SHIN },
      { d: "M53 53 L54 67", w: THIGH },
      { d: "M54 67 L53 79", w: SHIN },
    ],
    gear: ["M44 50 Q16 76 50 86 Q84 76 56 50"],
    ground: true,
  },
  rowErg: {
    label: "On the erg — legs, back, then arms",
    head: [32, 37, 6],
    parts: [
      { d: "M35 43 L42 59", w: TORSO },
      { d: "M38 47 L50 52", w: UPPER_ARM },
      { d: "M50 52 L61 55", w: FOREARM },
      { d: "M45 63 L64 64", w: THIGH },
      { d: "M64 64 L76 70", w: SHIN },
    ],
    farParts: [
      { d: "M40 51 L51 56", w: UPPER_ARM },
      { d: "M51 56 L61 58", w: FOREARM },
    ],
    gear: ["M18 72 H86", "M28 68 H52", "M62 55 H82", "M86 48 V74"],
    ground: true,
  },
};

export function pose(id: PoseId): Pose {
  return POSES[id];
}
