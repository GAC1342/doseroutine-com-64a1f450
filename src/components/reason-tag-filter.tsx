import { X } from "lucide-react";
import { REASON_TAG_DESCRIPTIONS, type ReasonTag } from "@/lib/reason-tags";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

/**
 * Multi-select chips for narrowing interaction cards by reason.
 * Selecting several tags widens the result set (matches any selected reason).
 */
export type TagMatchMode = "any" | "all";

export function ReasonTagFilter({
  counts,
  selected,
  onToggle,
  onClear,
  mode = "any",
  onModeChange,
}: {
  counts: Array<{ tag: ReasonTag; count: number }>;
  selected: ReasonTag[];
  onToggle: (tag: ReasonTag) => void;
  onClear: () => void;
  mode?: TagMatchMode;
  onModeChange?: (mode: TagMatchMode) => void;
}) {
  if (counts.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="reason-tag-filter">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Filter by reason
        </span>
        {selected.length > 1 && onModeChange && (
          <div
            role="group"
            aria-label="Reason match mode"
            className="ml-auto inline-flex overflow-hidden rounded-full border border-border"
          >
            {(["any", "all"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                aria-label={
                  m === "any" ? "Match any selected reason" : "Match all selected reasons"
                }
                onClick={() => onModeChange(m)}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "any" ? "Match any" : "Match all"}
              </button>
            ))}
          </div>
        )}
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            aria-label={`Clear ${selected.length} selected reason filter${selected.length === 1 ? "" : "s"}`}
            className="h-7 gap-1 rounded-full px-2 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
            Clear reasons
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] tabular-nums text-primary">
              {selected.length}
            </span>
          </Button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {selected.length === 0
          ? "No reason filters selected"
          : `${selected.length} reason filter${selected.length === 1 ? "" : "s"} selected: ${selected.join(", ")}. Matching ${mode === "all" ? "all" : "any"} selected reason${selected.length === 1 ? "" : "s"}.`}
      </p>
      <div role="group" aria-label="Filter by reason" className="flex flex-wrap gap-2">
        {counts.map(({ tag, count }) => {
          const active = selected.includes(tag);
          return (
            <TooltipProvider key={tag} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={`${tag}, ${count} card${count === 1 ? "" : "s"}${active ? ", filter active" : ""}`}
                    onClick={() => onToggle(tag)}
                    className={`tap-target inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tag}
                    <span className={active ? "opacity-80" : "opacity-70"}>{count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[16rem]">
                  {REASON_TAG_DESCRIPTIONS[tag]}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
