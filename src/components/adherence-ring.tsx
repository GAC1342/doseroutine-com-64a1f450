import { scoreBand } from "@/lib/adherence";
import { cn } from "@/lib/utils";

/**
 * Circular adherence gauge. Renders "no data yet" as an empty dashed ring
 * rather than 0%, so a brand-new user isn't told they failed.
 */
export function AdherenceRing({
  score,
  size = 88,
  strokeWidth = 8,
  label,
  className,
}: {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  const band = scoreBand(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circumference;

  // Severity tokens stay reserved for clinical warnings; adherence uses the
  // brand ramp so a theme swap doesn't repaint the ring like a safety alert.
  const stroke =
    band === "great" || band === "good"
      ? "var(--primary)"
      : band === "fair"
        ? "var(--accent-warm)"
        : "var(--muted-foreground)";

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          score == null
            ? "Adherence score: not enough data yet"
            : `Adherence score ${score} percent${label ? ` ${label}` : ""}`
        }
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeDasharray={score == null ? "4 6" : undefined}
        />
        {score != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-xl font-bold tabular-nums">
          {score == null ? "—" : `${score}%`}
        </span>
        {label && <span className="mt-0.5 text-[10px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
