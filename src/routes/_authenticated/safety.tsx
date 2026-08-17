import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ConfidenceBadge,
  NoKnownInteractionLine,
  SharedMechanismNote,
} from "@/components/interaction-confidence";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { CardListSkeleton } from "@/components/skeletons";
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateInteractions,
  unknownPairs,
  type PairEvaluation,
  type Rule,
  type UCWithCompound,
  type Compound,
  type Severity,
} from "@/lib/interactions";
import { severityStyles } from "@/components/severity-badge";
import {
  SeverityFilter,
  SeverityBadgeExpandable,
  SEVERITY_INFO,
} from "@/components/severity-explainer";
import { SourceLinks } from "@/components/source-links";
import { ReasonTags, ReasonTagFilterProvider } from "@/components/reason-tag";
import { ReasonTagFilter } from "@/components/reason-tag-filter";
import { reasonTags, type ReasonTag } from "@/lib/reason-tags";
import { primarySource } from "@/lib/source-refs";
import { AuthoritySourceList } from "@/components/authority-source-list";
import { resolveInteractionSources } from "@/lib/authority-sources";
import { useTabViewState } from "@/lib/tab-view-state";
import {
  ruleCardKey,
  userNoteCardKey,
  isNoteExpanded,
  toggleNoteKey,
  pruneNoteKeys,
  expandAllNoteKeys,
  collapseAllNoteKeys,
} from "@/lib/note-expansion";

import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PairNoteDialog,
  PAIR_NOTES_QK,
  normalizePair,
  type PairNote,
} from "@/components/pair-note-dialog";

export const Route = createFileRoute("/_authenticated/safety")({
  head: () => ({
    meta: [
      { title: "Safety — DoseRoutine" },
      {
        name: "description",
        content: "Interaction checks across your stack, sorted most serious first.",
      },
    ],
  }),
  component: SafetyPage,
});

const RULES_QK = ["interaction-rules"] as const;
const USER_COMPOUNDS_QK = ["user-compounds"] as const;

type DialogState =
  | { open: false }
  | { open: true; a: Compound; b: Compound; existing: PairNote | null };

// Map user-note severity to rule severity for display
function noteSeverityToRule(s: string): Severity {
  if (s === "avoid") return "avoid";
  if (s === "caution") return "caution";
  return "note";
}

function pairKey(aId: string, bId: string) {
  const { a, b } = normalizePair(aId, bId);
  return `${a}::${b}`;
}

type CardRow =
  | { kind: "rule"; evaluation: PairEvaluation }
  | { kind: "note"; a: Compound; b: Compound; note: PairNote };

type SafetyRow =
  | { kind: "rule"; severity: Severity; sort: string; evaluation: PairEvaluation }
  | {
      kind: "note";
      severity: Severity;
      sort: string;
      a: Compound;
      b: Compound;
      note: PairNote;
    };

function asCardRow(r: SafetyRow): CardRow {
  return r.kind === "rule"
    ? { kind: "rule", evaluation: r.evaluation }
    : { kind: "note", a: r.a, b: r.b, note: r.note };
}

/** Reason tags shown on a card — the same values the cards render. */
export function rowReasonTags(row: CardRow): ReasonTag[] {
  return row.kind === "rule"
    ? reasonTags(row.evaluation.mechanism, row.evaluation.recommendation)
    : reasonTags(row.note.note);
}

export type TagMatchMode = "any" | "all";

/**
 * "any" — the card carries at least one selected reason (widest results).
 * "all" — the card carries every selected reason (narrowest results).
 */
export function cardMatchesTags(
  row: CardRow,
  selected: ReasonTag[],
  mode: TagMatchMode = "any",
): boolean {
  if (selected.length === 0) return true;
  const tags = rowReasonTags(row);
  return mode === "all"
    ? selected.every((t) => tags.includes(t))
    : selected.some((t) => tags.includes(t));
}

export function cardMatchesQuery(row: CardRow, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  if (row.kind === "rule") {
    const e = row.evaluation;
    const tags = reasonTags(e.mechanism, e.recommendation).join(" ").toLowerCase();
    return (
      e.a.name.toLowerCase().includes(q) ||
      e.b.name.toLowerCase().includes(q) ||
      e.recommendation.toLowerCase().includes(q) ||
      e.mechanism.toLowerCase().includes(q) ||
      tags.includes(q)
    );
  }

  const noteTags = reasonTags(row.note.note).join(" ").toLowerCase();
  return (
    row.a.name.toLowerCase().includes(q) ||
    row.b.name.toLowerCase().includes(q) ||
    row.note.note.toLowerCase().includes(q) ||
    noteTags.includes(q)
  );
}

function SafetyPage() {
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  // Persisted so leaving and returning to Safety restores the same filter and note-collapse preference.
  const [view, setView] = useTabViewState<{
    severity: Severity | null;
    notesExpanded: boolean;
    /** Card keys for individually expanded NOTE cards, remembered per pair. */
    expandedNotes: string[];
    query: string;
    tags: ReasonTag[];
    tagMode: TagMatchMode;
  }>("/safety", {
    severity: null,
    notesExpanded: false,
    expandedNotes: [],
    query: "",
    tags: [],
    tagMode: "any",
  });
  const severityFilter = view.severity;
  const setSeverityFilter = (next: Severity | null) => setView({ ...view, severity: next });
  const query = view.query.trim();
  const setQuery = (next: string) => setView({ ...view, query: next });
  const tagFilters = useMemo(() => view.tags ?? [], [view.tags]);
  const toggleTagFilter = (tag: ReasonTag) =>
    setView({
      ...view,
      tags: tagFilters.includes(tag) ? tagFilters.filter((t) => t !== tag) : [...tagFilters, tag],
    });
  const clearTagFilters = () => setView({ ...view, tags: [] });
  const tagMode: TagMatchMode = view.tagMode ?? "any";
  const setTagMode = (next: TagMatchMode) => setView({ ...view, tagMode: next });

  const ucQuery = useQuery({
    queryKey: USER_COMPOUNDS_QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_compounds")
        .select("*, compound:compounds(*)");
      if (error) throw error;
      return (data ?? []) as UCWithCompound[];
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const rulesQuery = useQuery({
    queryKey: RULES_QK,
    queryFn: async () => {
      const { data, error } = await supabase.from("interaction_rules").select("*");
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  const notesQuery = useQuery({
    queryKey: PAIR_NOTES_QK,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_pair_notes").select("*");
      if (error) throw error;
      return (data ?? []) as PairNote[];
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const loading = ucQuery.isPending || rulesQuery.isPending || notesQuery.isPending;
  const errored = ucQuery.isError || rulesQuery.isError;
  const ucs = ucQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const notes = notesQuery.data ?? [];

  const { evals, unknown, activeCount, noteByPair } = useMemo(() => {
    if (loading || errored) {
      return { evals: [], unknown: [], activeCount: 0, noteByPair: new Map<string, PairNote>() };
    }
    const map = new Map<string, PairNote>();
    for (const n of notes) map.set(pairKey(n.compound_a_id, n.compound_b_id), n);
    const rawUnknown = unknownPairs(ucs, rules);
    // Strip pairs that the user has a note for — those render as warning cards below.
    const filteredUnknown = rawUnknown.filter((p) => !map.has(pairKey(p.a.id, p.b.id)));
    return {
      activeCount: ucs.filter((u) => u.active && u.compound).length,
      evals: evaluateInteractions(ucs, rules),
      unknown: filteredUnknown,
      noteByPair: map,
    };
  }, [loading, errored, ucs, rules, notes]);

  // Build ordered list of user-note pairs (only for pairs that exist in active stack)
  const userNoteCards = useMemo(() => {
    if (loading || errored) return [];
    const activeById = new Map<string, Compound>();
    for (const u of ucs) if (u.active && u.compound) activeById.set(u.compound.id, u.compound);
    const cards: { a: Compound; b: Compound; note: PairNote }[] = [];
    for (const n of notes) {
      const a = activeById.get(n.compound_a_id);
      const b = activeById.get(n.compound_b_id);
      if (a && b) cards.push({ a, b, note: n });
    }
    const order = { avoid: 0, caution: 1, info: 2 } as Record<string, number>;
    return cards.sort((x, y) => (order[x.note.severity] ?? 9) - (order[y.note.severity] ?? 9));
  }, [notes, ucs, loading, errored]);

  const counts = useMemo(() => {
    const c: Partial<Record<Severity, number>> = {};
    for (const e of evals) c[e.severity] = (c[e.severity] ?? 0) + 1;
    for (const n of userNoteCards) {
      const s = noteSeverityToRule(n.note.severity);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [evals, userNoteCards]);

  // Single list: rule hits + your own pair notes, highest risk first.
  // Ties keep user notes above generic rule hits, then alphabetical by pair.

  // Rows narrowed by severity + search, before reason-tag filtering.
  // Tag counts come from here so each chip shows what it would add in context.
  const baseRows = useMemo(() => {
    const rows: SafetyRow[] = [
      ...evals.map((e) => ({
        kind: "rule" as const,
        severity: e.severity,
        sort: `${e.a.name} ${e.b.name}`.toLowerCase(),
        evaluation: e,
      })),
      ...userNoteCards.map((n) => ({
        kind: "note" as const,
        severity: noteSeverityToRule(n.note.severity),
        sort: `${n.a.name} ${n.b.name}`.toLowerCase(),
        a: n.a,
        b: n.b,
        note: n.note,
      })),
    ];

    return rows
      .filter((r) => !severityFilter || r.severity === severityFilter)
      .filter((r) => cardMatchesQuery(asCardRow(r), query));
  }, [evals, userNoteCards, severityFilter, query]);

  const tagCounts = useMemo(() => {
    const c = new Map<ReasonTag, number>();
    for (const r of baseRows) {
      for (const t of rowReasonTags(asCardRow(r))) c.set(t, (c.get(t) ?? 0) + 1);
    }
    return [...c.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [baseRows]);

  const visibleCards = useMemo(
    () =>
      baseRows
        .filter((r) => cardMatchesTags(asCardRow(r), tagFilters, tagMode))
        .sort((x, y) => {
          const bySeverity = SEVERITY_INFO[x.severity].rank - SEVERITY_INFO[y.severity].rank;
          if (bySeverity !== 0) return bySeverity;
          if (x.kind !== y.kind) return x.kind === "note" ? -1 : 1;
          return x.sort.localeCompare(y.sort);
        }),
    [baseRows, tagFilters, tagMode],
  );

  // Collapse NOTE cards by default; per-card state is remembered across visits.
  const noteKeys = useMemo(
    () =>
      visibleCards
        .filter((r) => r.severity === "note")
        .map((r) =>
          r.kind === "rule"
            ? ruleCardKey(r.evaluation.a.id, r.evaluation.b.id)
            : userNoteCardKey(r.note.id),
        ),
    [visibleCards],
  );

  // Every note card that exists regardless of the active filters — pruning
  // against the filtered list would forget cards that are merely hidden.
  const allNoteKeys = useMemo(() => {
    const keys: string[] = [];
    for (const e of evals) {
      if (e.severity === "note") keys.push(ruleCardKey(e.a.id, e.b.id));
    }
    for (const n of userNoteCards) {
      if (noteSeverityToRule(n.note.severity) === "note") keys.push(userNoteCardKey(n.note.id));
    }
    return keys;
  }, [evals, userNoteCards]);

  const expandedNotes = useMemo(() => view.expandedNotes ?? [], [view.expandedNotes]);

  // Drop remembered keys for pairs/notes that no longer exist.
  useEffect(() => {
    setView((v) => {
      const current = v.expandedNotes ?? [];
      const pruned = pruneNoteKeys(current, allNoteKeys);
      if (pruned.length === current.length) return v;
      return { ...v, expandedNotes: pruned };
    });
  }, [allNoteKeys, setView]);

  // Polite announcement for bulk expand/collapse — the cards themselves change
  // silently, so screen reader users otherwise get no confirmation.
  const [bulkAnnouncement, setBulkAnnouncement] = useState("");

  const expandAllNotes = () => {
    setView((v) => ({
      ...v,
      notesExpanded: true,
      expandedNotes: expandAllNoteKeys(v.expandedNotes, noteKeys),
    }));
    setBulkAnnouncement(`${noteKeys.length} ${noteKeys.length === 1 ? "note" : "notes"} expanded`);
  };

  const collapseAllNotes = () => {
    setView((v) => ({
      ...v,
      notesExpanded: false,
      expandedNotes: collapseAllNoteKeys(v.expandedNotes, noteKeys),
    }));
    setBulkAnnouncement(`${noteKeys.length} ${noteKeys.length === 1 ? "note" : "notes"} collapsed`);
  };

  const toggleNoteCard = (key: string) =>
    setView((v) => ({ ...v, expandedNotes: toggleNoteKey(v.expandedNotes, key) }));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Safety</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactions across your active stack, most serious first.
        </p>
      </div>

      {loading ? (
        <div className="mt-6">
          <CardListSkeleton count={3} itemClassName="h-24 w-full rounded-2xl" />
        </div>
      ) : errored ? (
        <div className="mt-6 rounded-2xl border border-border bg-[color:var(--severity-avoid-bg))] p-4 text-sm text-[color:var(--severity-avoid)]">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" /> We couldn't check interactions
          </div>
          <p className="mt-1 text-foreground/90">
            Don't assume it's safe. Try again in a moment, or ask a qualified health professional
            before combining items.
          </p>
        </div>
      ) : activeCount < 2 ? (
        <EmptyState />
      ) : (
        <ReasonTagFilterProvider selected={tagFilters} onToggle={toggleTagFilter}>
          <div className="mt-6 space-y-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={view.query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search interactions, compounds, or notes…"
                aria-label="Search interactions"
                className="h-11 rounded-xl pl-9 pr-9"
              />
              {view.query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <SeverityFilter
              counts={counts}
              selected={severityFilter}
              onChange={setSeverityFilter}
            />

            <ReasonTagFilter
              counts={tagCounts}
              selected={tagFilters}
              onToggle={toggleTagFilter}
              onClear={clearTagFilters}
              mode={tagMode}
              onModeChange={setTagMode}
            />

            {visibleCards.length > 0 && (
              <section className="space-y-3">
                <p className="sr-only" role="status" aria-live="polite">
                  {bulkAnnouncement}
                </p>
                {(counts.note ?? 0) > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={view.notesExpanded ? collapseAllNotes : expandAllNotes}
                      aria-expanded={view.notesExpanded}
                      aria-label={
                        view.notesExpanded
                          ? "Collapse all note interaction cards"
                          : "Expand all note interaction cards"
                      }
                      className="tap-target rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {view.notesExpanded ? "Collapse all notes" : "Expand all notes"}
                    </button>
                  </div>
                )}

                {visibleCards.map((row) => {
                  const cardKey =
                    row.kind === "rule"
                      ? `rule-${row.evaluation.a.id}-${row.evaluation.b.id}`
                      : `note-${row.note.id}`;
                  const isNote = row.severity === "note";
                  return row.kind === "rule" ? (
                    <WarningCard
                      key={cardKey}
                      cardKey={cardKey}
                      evaluation={row.evaluation}
                      expanded={isNote ? isNoteExpanded(expandedNotes, cardKey) : true}
                      onToggle={isNote ? toggleNoteCard : undefined}
                    />
                  ) : (
                    <UserNoteCard
                      key={cardKey}
                      cardKey={cardKey}
                      a={row.a}
                      b={row.b}
                      note={row.note}
                      expanded={isNote ? isNoteExpanded(expandedNotes, cardKey) : true}
                      onToggle={isNote ? toggleNoteCard : undefined}
                      onEdit={() =>
                        setDialog({ open: true, a: row.a, b: row.b, existing: row.note })
                      }
                    />
                  );
                })}
              </section>
            )}

            {query && visibleCards.length === 0 && (
              <Card className="rounded-2xl border-border p-6 text-sm text-muted-foreground">
                No interactions match “{view.query.trim()}”. Try a different term or{" "}
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="font-semibold text-primary hover:underline"
                >
                  clear the search
                </button>
                .
              </Card>
            )}

            {tagFilters.length > 0 && visibleCards.length === 0 && !query && (
              <Card className="rounded-2xl border-border p-6 text-sm text-muted-foreground">
                No interactions match {tagFilters.join(tagMode === "all" ? " and " : " or ")}.{" "}
                <button
                  type="button"
                  onClick={clearTagFilters}
                  className="font-semibold text-primary hover:underline"
                >
                  Clear reason filters
                </button>
                .
              </Card>
            )}

            {severityFilter && visibleCards.length === 0 && !query && tagFilters.length === 0 && (
              <Card className="rounded-2xl border-border p-6 text-sm text-muted-foreground">
                No {severityStyles[severityFilter].label.toLowerCase()} interactions in your stack.
              </Card>
            )}

            {!severityFilter && tagFilters.length === 0 && unknown.length > 0 && !query && (
              <UnknownPairsCollapsed
                pairs={unknown}
                onAddNote={(a, b) => setDialog({ open: true, a, b, existing: null })}
              />
            )}

            {evals.length === 0 && unknown.length === 0 && userNoteCards.length === 0 && !query && (
              <Card className="mt-6 rounded-2xl border-border p-6 text-sm text-muted-foreground">
                No interactions matched across your stack yet.
              </Card>
            )}
          </div>
        </ReasonTagFilterProvider>
      )}

      <Card className="mt-6 flex flex-col gap-3 rounded-2xl border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <div className="font-semibold text-foreground">Not sure about a combo?</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Ask the AI Coach or run any two compounds through the checker.
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/chat"
            className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Ask AI Coach
          </Link>
          <Link
            to="/interaction-checker"
            className="tap-target inline-flex items-center justify-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-card"
          >
            Checker
          </Link>
        </div>
      </Card>

      <DisclaimerFooter variant="safety" />

      {dialog.open && (
        <PairNoteDialog
          open={dialog.open}
          onOpenChange={(o) => !o && setDialog({ open: false })}
          aId={dialog.a.id}
          bId={dialog.b.id}
          aName={dialog.a.name}
          bName={dialog.b.name}
          existing={dialog.existing}
        />
      )}
    </div>
  );
}

function UnknownPairsCollapsed({
  pairs,
  onAddNote,
}: {
  pairs: { a: Compound; b: Compound }[];
  onAddNote: (a: Compound, b: Compound) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <Card className="border-border p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={open}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <StickyNote className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                No cited rule for {pairs.length} other {pairs.length === 1 ? "pair" : "pairs"} in
                your stack
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                That doesn't mean they're safe — tap to review and add your own notes.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-muted-foreground">
            {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {open && (
          <ul className="mt-4 space-y-2 border-t border-border pt-3">
            {pairs.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5"
              >
                <span className="text-sm">
                  {p.a.name} <span className="text-muted-foreground">+</span> {p.b.name}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => onAddNote(p.a, p.b)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add note
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

/**
 * Shared ARIA + keyboard wiring for a collapsible NOTE card.
 *
 * - Ties the toggle button to the body region via aria-controls/aria-labelledby.
 * - Escape anywhere inside an expanded card collapses it and returns focus to
 *   the toggle, so keyboard users never lose their place.
 */
function useNoteCardA11y({
  cardKey,
  pairLabel,
  expanded,
  isCollapsible,
  onToggle,
}: {
  cardKey: string;
  pairLabel: string;
  expanded: boolean;
  isCollapsible: boolean;
  onToggle?: (key: string) => void;
}) {
  const base = useId();
  const bodyId = `note-body-${base}`;
  const titleId = `note-title-${base}`;
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape") return;
    if (!isCollapsible || !expanded || !onToggle) return;
    e.stopPropagation();
    onToggle(cardKey);
    // Focus must land back on the control that owns the region.
    requestAnimationFrame(() => toggleRef.current?.focus());
  };

  const toggleProps = {
    ref: toggleRef,
    type: "button" as const,
    onClick: () => onToggle?.(cardKey),
    "aria-expanded": expanded,
    "aria-controls": bodyId,
    "aria-label": `${expanded ? "Collapse" : "Expand"} details for ${pairLabel}`,
    className:
      "tap-target shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  };

  const regionProps = isCollapsible
    ? ({ id: bodyId, role: "region", "aria-labelledby": titleId } as const)
    : ({ id: bodyId } as const);

  return { bodyId, titleId, toggleProps, regionProps, onKeyDown };
}

export function UserNoteCard({
  a,
  b,
  note,
  cardKey,
  expanded,
  onToggle,
  onEdit,
}: {
  a: Compound;
  b: Compound;
  note: PairNote;
  cardKey: string;
  expanded: boolean;
  onToggle?: (key: string) => void;
  onEdit: () => void;
}) {
  const displaySev = noteSeverityToRule(note.severity);
  const s = severityStyles[displaySev];
  const noteSource = primarySource(note.source ? [note.source] : []);
  const isCollapsible = displaySev === "note";
  const pairLabel = `${a.name} + ${b.name}`;
  const { titleId, toggleProps, regionProps, onKeyDown } = useNoteCardA11y({
    cardKey,
    pairLabel,
    expanded,
    isCollapsible,
    onToggle,
  });
  return (
    <article className={`rounded-2xl ${s.bg} p-4`} onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div id={titleId} className="font-display text-base font-semibold text-foreground">
          {a.name} <span className="text-muted-foreground">+</span> {b.name}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <StickyNote className="h-3 w-3" aria-hidden="true" /> Your note
          </span>
          <ReasonTags tags={reasonTags(note.note)} />
          <SeverityBadgeExpandable
            severity={displaySev}
            sourceHref={noteSource?.url ?? undefined}
            sourceLabel={noteSource?.label}
          />
          {isCollapsible && (
            <button {...toggleProps}>
              {expanded ? (
                <ChevronUp className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {isCollapsible && !expanded && (
        <p className="mt-2 line-clamp-1 whitespace-pre-wrap text-sm text-foreground/80">
          {note.note}
        </p>
      )}

      {(!isCollapsible || expanded) && (
        <div {...regionProps}>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.note}</p>
          {note.source && <SourceLinks className="mt-3" label="Your source" refs={[note.source]} />}

          <div className="mt-3">
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Edit
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

export function WarningCard({
  evaluation,
  cardKey,
  expanded,
  onToggle,
}: {
  evaluation: PairEvaluation;
  cardKey: string;
  expanded: boolean;
  onToggle?: (key: string) => void;
}) {
  const s = severityStyles[evaluation.severity];
  const authoritySources = resolveInteractionSources(
    evaluation.source_refs,
    evaluation.a.name,
    evaluation.b.name,
  );
  const primary =
    primarySource(evaluation.source_refs) ??
    (() => {
      const first = authoritySources.find((x) => x.url);
      return first ? { label: first.label, url: first.url, kind: "url" as const } : null;
    })();
  const isCollapsible = evaluation.severity === "note";
  const pairLabel = `${evaluation.a.name} + ${evaluation.b.name}`;
  const { titleId, toggleProps, regionProps, onKeyDown } = useNoteCardA11y({
    cardKey,
    pairLabel,
    expanded,
    isCollapsible,
    onToggle,
  });
  return (
    <article className={`rounded-2xl ${s.bg} p-4`} onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div id={titleId} className="font-display text-base font-semibold text-foreground">
          {evaluation.a.name} <span className="text-muted-foreground">+</span> {evaluation.b.name}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {evaluation.same_axis && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Same axis
            </span>
          )}
          <ReasonTags tags={reasonTags(evaluation.mechanism, evaluation.recommendation)} />
          <ConfidenceBadge confidence={evaluation.confidence} />
          <SeverityBadgeExpandable
            severity={evaluation.severity}
            matchedBy={evaluation.matchedBy}
            sourceHref={primary?.url ?? undefined}
            sourceLabel={primary?.label}
          />
          {isCollapsible && (
            <button {...toggleProps}>
              {expanded ? (
                <ChevronUp className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {isCollapsible && !expanded && (
        <p className="mt-2 line-clamp-1 text-sm text-foreground/80">{evaluation.recommendation}</p>
      )}

      {(!isCollapsible || expanded) && (
        <div {...regionProps}>
          <p className="mt-2 text-sm text-foreground">{evaluation.recommendation}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Why: {evaluation.mechanism}
            {evaluation.matchedBy === "category" && " · matched at category level"}
          </p>
          {evaluation.no_known_interaction ? (
            <NoKnownInteractionLine source={evaluation.source_refs[0]} className="mt-2 text-xs" />
          ) : (
            <SharedMechanismNote sharedWith={evaluation.mechanism_shared_with} className="mt-1" />
          )}
          <div className="mt-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sources &amp; verification
            </div>
            <AuthoritySourceList sources={authoritySources} />
          </div>
        </div>
      )}
    </article>
  );
}

function EmptyState() {
  return (
    <Card className="mt-6 rounded-2xl border-dashed border-border p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <p className="mt-4 font-display text-lg font-semibold">Add at least two items to check</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Interactions need a pair. Head to your stack to add more, then come back for a safety pass.
      </p>
      <Link
        to="/stack"
        className="tap-target mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-[color:var(--primary-hover)]"
      >
        Go to Stack
      </Link>
    </Card>
  );
}
