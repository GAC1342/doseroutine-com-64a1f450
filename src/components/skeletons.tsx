import { Skeleton } from "@/components/ui/skeleton";

/**
 * Vertical stack of card-shaped skeletons. Use as a placeholder for lists
 * where the eventual item is roughly card-sized (e.g. warning cards, check-in
 * rows, reminder rows). Height/rounding matches our card conventions so the
 * layout doesn't jump when real data arrives.
 */
export function CardListSkeleton({
  count = 4,
  className = "",
  itemClassName = "h-20 w-full rounded-2xl",
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={"space-y-3 " + className} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
}

/**
 * Compact single-line placeholder used inside forms, side panels, or headers.
 */
export function LineSkeleton({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={"space-y-2 " + className} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 rounded" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

/**
 * Screen-reader announcement for a loading region. Skeletons themselves are
 * `aria-hidden`, so pair them with this so assistive tech hears that content
 * is on its way instead of landing on an empty region.
 *
 * `aria-label` on a plain wrapper div is not reliably exposed — always render
 * this alongside the placeholders rather than labeling the wrapper.
 */
export function LoadingStatus({
  label,
  className = "sr-only",
}: {
  label: string;
  className?: string;
}) {
  return (
    <p role="status" aria-live="polite" className={className}>
      {label}
    </p>
  );
}
