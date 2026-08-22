import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared look for every segmented control / tab strip in the app.
 *
 * The track sits on `--surface-track`, which is always kept clearly darker
 * than the page background, and the selected tab is signalled by *three*
 * cues at once (card surface + border/shadow, semibold weight, primary text)
 * so it never depends on color alone.
 */
export const segmentedTrackClass =
  "flex items-center gap-1 rounded-full border border-border bg-surface-track p-1";

export function segmentedTabClass(active: boolean, className?: string) {
  return cn(
    "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
    "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    active
      ? "segmented-tab-active border border-border bg-card font-semibold text-primary shadow-sm"
      : "border border-transparent text-foreground/75 hover:border-border hover:bg-card/70 hover:text-foreground",
    className,
  );
}

export function SegmentedCount({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70",
      )}
    >
      {children}
    </span>
  );
}

type SegmentedTabsProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ id: T; label: string; count?: number }>;
  className?: string;
};

export function SegmentedTabs<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn(segmentedTrackClass, className)}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={segmentedTabClass(active)}
          >
            {option.label}
            {option.count != null && option.count > 0 && (
              <SegmentedCount active={active}>{option.count}</SegmentedCount>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Pill-shaped filter chip (single-select rows that aren't full tab strips). */
export function chipClass(active: boolean, className?: string) {
  return cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium",
    "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground",
    className,
  );
}
