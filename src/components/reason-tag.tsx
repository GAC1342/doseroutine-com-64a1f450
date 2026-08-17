import { createContext, useContext, type ReactNode } from "react";
import { REASON_TAG_DESCRIPTIONS, type ReasonTag } from "@/lib/reason-tags";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ReasonTagFilterCtx = {
  selected: ReasonTag[];
  onToggle: (tag: ReasonTag) => void;
};

const ReasonTagFilterContext = createContext<ReasonTagFilterCtx | null>(null);

/** Lets reason chips rendered inside cards drive the page-level reason filter. */
export function ReasonTagFilterProvider({
  selected,
  onToggle,
  children,
}: ReasonTagFilterCtx & { children: ReactNode }) {
  return (
    <ReasonTagFilterContext.Provider value={{ selected, onToggle }}>
      {children}
    </ReasonTagFilterContext.Provider>
  );
}

const chipBase =
  "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors";

/** Small chip showing why a pair interacts (e.g. "Absorption"). Clickable when filtering is available. */
export function ReasonTagChip({ tag }: { tag: ReasonTag }) {
  const ctx = useContext(ReasonTagFilterContext);
  const description = REASON_TAG_DESCRIPTIONS[tag];
  const active = ctx?.selected.includes(tag) ?? false;

  const trigger = ctx ? (
    <button
      type="button"
      data-reason-tag={tag}
      aria-pressed={active}
      aria-label={active ? `${tag} filter active, tap to remove` : `Filter by ${tag}`}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onToggle(tag);
      }}
      className={`${chipBase} ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-background/70 text-muted-foreground hover:text-foreground"
      }`}
    >
      {tag}
    </button>
  ) : (
    <span data-reason-tag={tag} className={`${chipBase} bg-background/70 text-muted-foreground`}>
      {tag}
    </span>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent className="max-w-[16rem] normal-case tracking-normal">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ReasonTags({ tags, className }: { tags: ReasonTag[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      {tags.map((t) => (
        <ReasonTagChip key={t} tag={t} />
      ))}
    </span>
  );
}
