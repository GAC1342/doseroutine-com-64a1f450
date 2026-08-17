/**
 * MuscleMap
 *
 * An inline-SVG anatomy diagram that highlights the muscles an exercise
 * works. Primary movers are painted solid in the app accent, secondary
 * muscles at lower opacity, everything else stays a muted anatomical body.
 *
 * Pure SVG on purpose: a few KB, theme-aware (uses design tokens, never a
 * hardcoded colour), crisp at any size, and no image hosting required.
 */

import { cn } from "@/lib/utils";

export type MuscleRegion =
  | "chest"
  | "abs"
  | "obliques"
  | "frontDelts"
  | "sideDelts"
  | "rearDelts"
  | "traps"
  | "lats"
  | "upperBack"
  | "lowerBack"
  | "biceps"
  | "triceps"
  | "forearms"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves"
  | "heart";

export const MUSCLE_LABELS: Record<MuscleRegion, string> = {
  chest: "Chest",
  abs: "Abs",
  obliques: "Obliques",
  frontDelts: "Front shoulders",
  sideDelts: "Side shoulders",
  rearDelts: "Rear shoulders",
  traps: "Traps",
  lats: "Lats",
  upperBack: "Upper back",
  lowerBack: "Lower back",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  heart: "Heart & lungs",
};

/** Which side of the body a region is drawn on. */
const REGION_VIEW: Record<MuscleRegion, "front" | "back"> = {
  chest: "front",
  abs: "front",
  obliques: "front",
  frontDelts: "front",
  sideDelts: "front",
  rearDelts: "back",
  traps: "back",
  lats: "back",
  upperBack: "back",
  lowerBack: "back",
  biceps: "front",
  triceps: "back",
  forearms: "front",
  glutes: "back",
  quads: "front",
  hamstrings: "back",
  calves: "back",
  heart: "front",
};

/** Mirrors a path drawn on the left half of the 100-wide viewBox. */
const MIRROR = "translate(100,0) scale(-1,1)";

type RegionPaths = { d: string; mirrored?: boolean }[];

/**
 * Region geometry inside a 100 x 200 viewBox figure.
 * Left-side shapes are drawn once and mirrored for the right side.
 */
const REGION_SHAPES: Record<MuscleRegion, RegionPaths> = {
  // ---- front ----
  chest: [
    { d: "M38.5 45.5 Q46 44 48.8 48.5 L48.8 57 Q42 60 37.5 56 Q35.5 50 38.5 45.5 Z" },
    { d: "M38.5 45.5 Q46 44 48.8 48.5 L48.8 57 Q42 60 37.5 56 Q35.5 50 38.5 45.5 Z", mirrored: true },
  ],
  frontDelts: [
    { d: "M30.5 42 Q36.5 40 38.5 45.5 Q38 51.5 33.5 52.5 Q29 50 30.5 42 Z" },
    { d: "M30.5 42 Q36.5 40 38.5 45.5 Q38 51.5 33.5 52.5 Q29 50 30.5 42 Z", mirrored: true },
  ],
  sideDelts: [
    { d: "M27.5 44 Q31 41.5 32 48 Q31 53.5 27 51.5 Q25.8 47.5 27.5 44 Z" },
    { d: "M27.5 44 Q31 41.5 32 48 Q31 53.5 27 51.5 Q25.8 47.5 27.5 44 Z", mirrored: true },
  ],
  abs: [
    { d: "M45.2 61.5 h4.1 v6 h-4.1 z" },
    { d: "M45.2 61.5 h4.1 v6 h-4.1 z", mirrored: true },
    { d: "M45.2 68.8 h4.1 v6 h-4.1 z" },
    { d: "M45.2 68.8 h4.1 v6 h-4.1 z", mirrored: true },
    { d: "M45.4 76.1 h3.9 v6 h-3.9 z" },
    { d: "M45.4 76.1 h3.9 v6 h-3.9 z", mirrored: true },
    { d: "M45.8 83.4 q3.4 0 3.5 3 Q49 90.5 46.4 90 Q45.4 87 45.8 83.4 z" },
    { d: "M45.8 83.4 q3.4 0 3.5 3 Q49 90.5 46.4 90 Q45.4 87 45.8 83.4 z", mirrored: true },
  ],
  obliques: [
    { d: "M39.5 62 Q43.5 63 43.8 70 Q43 80 40 85 Q37.5 76 38.2 66 Z" },
    { d: "M39.5 62 Q43.5 63 43.8 70 Q43 80 40 85 Q37.5 76 38.2 66 Z", mirrored: true },
  ],
  biceps: [
    { d: "M29.4 54 Q33.2 54.5 33.4 62 Q32.6 70 29.4 70.5 Q26.6 63 29.4 54 Z" },
    { d: "M29.4 54 Q33.2 54.5 33.4 62 Q32.6 70 29.4 70.5 Q26.6 63 29.4 54 Z", mirrored: true },
  ],
  forearms: [
    { d: "M25.6 72.5 Q29.4 73 29.4 82 Q28.4 91.5 25.2 91 Q23.4 81 25.6 72.5 Z" },
    { d: "M25.6 72.5 Q29.4 73 29.4 82 Q28.4 91.5 25.2 91 Q23.4 81 25.6 72.5 Z", mirrored: true },
  ],
  quads: [
    { d: "M40 103 Q47 102.5 47.4 116 Q46.8 133 42.6 139 Q37.4 130 37.8 116 Z" },
    { d: "M40 103 Q47 102.5 47.4 116 Q46.8 133 42.6 139 Q37.4 130 37.8 116 Z", mirrored: true },
  ],
  heart: [{ d: "M43 50 Q50 46 57 50 Q58 60 50 65 Q42 60 43 50 Z" }],

  // ---- back ----
  traps: [
    { d: "M41.5 37.5 Q50 35.5 58.5 37.5 Q57 48 50 51 Q43 48 41.5 37.5 Z" },
  ],
  rearDelts: [
    { d: "M29.5 42.5 Q36 40.5 38 46 Q37.5 52.5 32.5 53.5 Q27.8 50.5 29.5 42.5 Z" },
    { d: "M29.5 42.5 Q36 40.5 38 46 Q37.5 52.5 32.5 53.5 Q27.8 50.5 29.5 42.5 Z", mirrored: true },
  ],
  upperBack: [
    { d: "M40.5 49 Q50 47 59.5 49 Q57.5 59 50 61.5 Q42.5 59 40.5 49 Z" },
  ],
  lats: [
    { d: "M36 50.5 Q44.5 53 46 61 Q46 72 40.5 79 Q34 71 34.2 58 Z" },
    { d: "M36 50.5 Q44.5 53 46 61 Q46 72 40.5 79 Q34 71 34.2 58 Z", mirrored: true },
  ],
  lowerBack: [
    { d: "M43.5 73 Q50 71 56.5 73 Q56.5 85 50 89 Q43.5 85 43.5 73 Z" },
  ],
  triceps: [
    { d: "M29 54 Q33 54.5 33.2 63 Q32.4 71 29 71.5 Q26.2 63 29 54 Z" },
    { d: "M29 54 Q33 54.5 33.2 63 Q32.4 71 29 71.5 Q26.2 63 29 54 Z", mirrored: true },
  ],
  glutes: [
    { d: "M38.8 89.5 Q46 87.5 48.8 94 Q48.4 103 43 104.5 Q37.6 99.5 38.8 89.5 Z" },
    { d: "M38.8 89.5 Q46 87.5 48.8 94 Q48.4 103 43 104.5 Q37.6 99.5 38.8 89.5 Z", mirrored: true },
  ],
  hamstrings: [
    { d: "M39.6 106 Q46.8 105.5 47.2 118 Q46.6 133 42.6 138 Q37.6 129 37.6 117 Z" },
    { d: "M39.6 106 Q46.8 105.5 47.2 118 Q46.6 133 42.6 138 Q37.6 129 37.6 117 Z", mirrored: true },
  ],
  calves: [
    { d: "M39.8 143 Q45.8 143.5 46 154 Q45.2 166 42 166.5 Q38 157 39.8 143 Z" },
    { d: "M39.8 143 Q45.8 143.5 46 154 Q45.2 166 42 166.5 Q38 157 39.8 143 Z", mirrored: true },
  ],
};

/** Shared muscular body parts (work for both views). */
const TORSO =
  "M50 32.5 Q40 33 35.5 39 Q34 48 35 58 Q36.5 70 37.5 82 " +
  "Q37.5 92 39 100 Q38.5 105.5 50 106.5 Q61.5 105.5 61 100 " +
  "Q62.5 92 62.5 82 Q63.5 70 65 58 Q66 48 64.5 39 Q60 33 50 32.5 Z";

const ARM =
  "M34.6 40 Q29 42 27 48.5 Q25.6 58 25 68 Q24.2 78 23.4 88 " +
  "Q23 93 25.2 93.5 Q27.4 93 27.9 88 Q29 78 30.4 68 " +
  "Q31.8 58 33.4 50 Q34 44 34.6 40 Z";

const LEG =
  "M39.4 106 Q37.4 118 38.2 130 Q39 142 40.2 152 Q40.8 164 41.2 174 " +
  "Q41.4 179.5 43.8 179.5 Q46.2 179.5 46.4 174 Q47.2 162 47.8 150 " +
  "Q48.6 136 49.3 122 L49.3 106 Z";


/** Thin separation lines that make the body read as an anatomy chart. */
const FRONT_DETAIL = [
  "M50 44 V96",
  "M38.5 45.5 Q46 44 48.8 48.5",
  "M61.5 45.5 Q54 44 51.2 48.5",
  "M44.6 61.5 H55.4",
  "M44.6 68.8 H55.4",
  "M44.8 76.1 H55.2",
  "M38.6 62 Q43 70 42 86",
  "M61.4 62 Q57 70 58 86",
  "M40 103 Q44 120 42.6 139",
  "M60 103 Q56 120 57.4 139",
];

const BACK_DETAIL = [
  "M50 36 V96",
  "M41.5 37.5 Q50 35.5 58.5 37.5",
  "M40.5 49 Q50 47 59.5 49",
  "M36 50.5 Q44.5 60 40.5 79",
  "M64 50.5 Q55.5 60 59.5 79",
  "M38.8 89.5 Q46 96 43 104.5",
  "M61.2 89.5 Q54 96 57 104.5",
  "M39.6 106 Q44 120 42.6 138",
  "M60.4 106 Q56 120 57.4 138",
  "M39.8 143 Q43 154 42 166.5",
  "M60.2 143 Q57 154 58 166.5",
];

function Body({ side, detail: showDetail }: { side: "front" | "back"; detail: boolean }) {
  const detail = side === "front" ? FRONT_DETAIL : BACK_DETAIL;
  return (
    <>
      <g className="fill-muted-foreground/25">
        {/* head + neck */}
        <ellipse cx="50" cy="16" rx="8.6" ry="10" />
        <path d="M45.6 24 h8.8 v7 q-4.4 3 -8.8 0 z" />
        <path d={TORSO} />
        <path d={ARM} />
        <path d={ARM} transform={MIRROR} />
        <path d={LEG} />
        <path d={LEG} transform={MIRROR} />

      </g>
      {showDetail && (
        <g
          className="stroke-muted-foreground/30"
          fill="none"
          strokeWidth="0.7"
          strokeLinecap="round"
        >
          {detail.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      )}
    </>
  );
}

export function MuscleMap({
  primary,
  secondary = [],
  view = "auto",
  className,
  title,
  detail = "full",
  svgRef,
}: {
  primary: readonly MuscleRegion[];
  secondary?: readonly MuscleRegion[];
  /** Force a side; "auto" picks whichever side shows the primary movers. */
  view?: "front" | "back" | "auto";
  className?: string;
  /** Accessible label; falls back to a muscle list. */
  title?: string;
  /**
   * "simple" drops the hairline anatomy lines and outlines the highlighted
   * regions instead, so the figure stays readable at thumbnail size.
   */
  detail?: "full" | "simple";
  /** Access to the underlying <svg>, e.g. for downloading it. */
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  const side =
    view === "auto"
      ? primary.find((m) => REGION_VIEW[m] === "back") &&
        !primary.some((m) => REGION_VIEW[m] === "front")
        ? "back"
        : "front"
      : view;

  const visible = (regions: readonly MuscleRegion[]) =>
    regions.filter((m) => REGION_VIEW[m] === side);

  const label = title ?? `Muscles worked: ${primary.map((m) => MUSCLE_LABELS[m]).join(", ")}`;
  const simple = detail === "simple";

  const render = (regions: readonly MuscleRegion[], cls: string) =>
    regions.flatMap((region) =>
      (REGION_SHAPES[region] ?? []).map((shape, i) => (
        <path
          key={`${region}-${i}`}
          d={shape.d}
          className={cls}
          transform={shape.mirrored ? MIRROR : undefined}
        />
      )),
    );

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 200"
      role="img"
      aria-label={label}
      className={cn("block", className)}
    >
      <Body side={side} detail={!simple} />
      {render(visible(secondary), "fill-primary/35")}
      {render(
        visible(primary),
        simple ? "fill-primary stroke-background [stroke-width:0.9]" : "fill-primary",
      )}
    </svg>
  );
}


/** Human-readable side label, e.g. for a caption under the enlarged map. */
export function muscleMapSide(primary: readonly MuscleRegion[]): "Front view" | "Back view" {
  return primary.some((m) => REGION_VIEW[m] === "front") ? "Front view" : "Back view";
}
