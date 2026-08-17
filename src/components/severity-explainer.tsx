import { useId, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Severity } from "@/lib/interactions";
import { severityStyles } from "@/components/severity-badge";

export const SEVERITY_INFO: Record<
  Severity,
  { headline: string; meaning: string; why: string; rank: number }
> = {
  avoid: {
    headline: "Avoid — strongest flag",
    meaning:
      "This pair has a documented conflict serious enough that combining them is generally not recommended.",
    why: "Flagged because a cited rule matched both items directly, or they act on the same pathway in a way that compounds risk.",
    rank: 0,
  },
  caution: {
    headline: "Caution — worth adjusting",
    meaning:
      "This pair can usually be used together, but timing, dose, or monitoring may need adjusting.",
    why: "Flagged because a cited rule found a meaningful overlap — absorption, liver enzymes, or additive effects — that changes how one item behaves.",
    rank: 1,
  },
  note: {
    headline: "Note — informational only",
    meaning:
      "This is the lowest severity level. It is not a warning: the pair is generally considered okay together, but there is context worth knowing.",
    why: "Usually flagged at the category level rather than by a specific item-to-item rule — for example, a supplement class that can affect how another item is absorbed or processed.",
    rank: 2,
  },
  synergy: {
    headline: "Synergy — works well together",
    meaning: "These two are commonly combined and may complement each other.",
    why: "Flagged because a cited rule describes a beneficial or complementary effect.",
    rank: 3,
  },
};

const SEVERITY_ORDER: Severity[] = ["avoid", "caution", "note", "synergy"];

/**
 * Filter chips for interaction severity. `selected === null` means "all".
 */
export function SeverityFilter({
  counts,
  selected,
  onChange,
}: {
  counts: Partial<Record<Severity, number>>;
  selected: Severity | null;
  onChange: (next: Severity | null) => void;
}) {
  const total = SEVERITY_ORDER.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  const available = SEVERITY_ORDER.filter((s) => (counts[s] ?? 0) > 0);
  if (available.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filter interactions by severity"
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={selected === null}
        className={`tap-target inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          selected === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:text-foreground"
        }`}
      >
        All <span className="opacity-70">{total}</span>
      </button>
      {available.map((s) => {
        const style = severityStyles[s];
        const active = selected === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(active ? null : s)}
            aria-pressed={active}
            className={`tap-target inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
              active
                ? `border-transparent ${style.bg} ${style.fg} ring-2 ring-current/40`
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <style.Icon className="h-3.5 w-3.5" />
            {style.label}
            <span className="opacity-70">{counts[s] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Severity badge that expands an inline explainer panel on tap.
 */
export function SeverityBadgeExpandable({
  severity,
  sourceHref,
  sourceLabel,
  matchedBy,
}: {
  severity: Severity;
  sourceHref?: string;
  sourceLabel?: string;
  matchedBy?: "pair" | "category";
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const style = severityStyles[severity];
  const info = SEVERITY_INFO[severity];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${style.label} severity — what does this mean?`}
        className={`tap-target inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition hover:opacity-80 ${style.bg} ${style.fg}`}
      >
        <style.Icon className="h-3.5 w-3.5" />
        {style.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="mt-3 w-full rounded-xl border border-border bg-background/80 p-3 text-xs"
        >
          <p className={`font-semibold ${style.fg}`}>{info.headline}</p>
          <p className="mt-1 text-foreground/90">{info.meaning}</p>
          <p className="mt-2 text-muted-foreground">
            <span className="font-semibold text-foreground/80">Why it's flagged: </span>
            {matchedBy === "category"
              ? "Matched by category rules rather than a specific item-to-item rule, so the detail is general to that class of items."
              : info.why}
          </p>
          <p className="mt-2 text-muted-foreground">
            Severity order: <span className="font-semibold">Avoid</span> →{" "}
            <span className="font-semibold">Caution</span> →{" "}
            <span className="font-semibold">Note</span> →{" "}
            <span className="font-semibold">Synergy</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {sourceHref && (
              <a
                href={sourceHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
              >
                {sourceLabel ?? "Source"}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
            <a
              href="/interaction-checker"
              className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              How we rate interactions
            </a>
          </div>
        </div>
      )}
    </>
  );
}
