/**
 * PoseFigure — a solid silhouette figure showing the body position for an
 * exercise (thick rounded limbs, not a thin stick figure).
 *
 * Inline SVG, theme-aware (design tokens only), and sized by the caller.
 */

import { cn } from "@/lib/utils";
import { POSES, type PoseId } from "@/lib/muscle-poses";

export function PoseFigure({
  id,
  className,
  label,
}: {
  id: PoseId;
  className?: string;
  /** Accessible label; defaults to the pose description. */
  label?: string;
}) {
  const p = POSES[id];
  const [cx, cy, r] = p.head;

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={label ?? p.label}
      className={cn("block", className)}
    >
      {p.ground && (
        <line
          x1="8"
          y1="88"
          x2="92"
          y2="88"
          className="stroke-muted-foreground/35"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
      {p.gear && (
        <g
          className="stroke-muted-foreground/45"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {p.gear.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      )}

      {/* Body: far-side limbs behind, then a soft halo, then the silhouette. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {p.farParts && (
          <g className="stroke-primary" opacity="0.4">
            {p.farParts.map((part) => (
              <path key={`f-${part.d}`} d={part.d} strokeWidth={part.w} />
            ))}
          </g>
        )}
        <g className="stroke-background" opacity="0.9">
          {p.parts.map((part) => (
            <path key={`o-${part.d}`} d={part.d} strokeWidth={part.w + 3} />
          ))}
        </g>
        <g className="stroke-primary">
          {p.parts.map((part) => (
            <path key={part.d} d={part.d} strokeWidth={part.w} />
          ))}
        </g>
      </g>

      <circle cx={cx} cy={cy} r={r + 1.5} className="fill-background" opacity="0.9" />
      <circle cx={cx} cy={cy} r={r} className="fill-primary" />
    </svg>
  );
}
