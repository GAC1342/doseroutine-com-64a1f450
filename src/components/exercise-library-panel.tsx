/**
 * Browsable exercise library.
 *
 * Mirrors how Strong / Hevy handle this: exercises are a place you can visit
 * any time, search by name, narrow by muscle group / equipment / difficulty,
 * and stage a few picks before starting a workout. Exercises you have logged
 * before surface first and carry a "last used" badge so repeat work is one tap.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, Search, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExerciseSearchGrid } from "@/components/exercise-search-grid";
import { WorkoutLogSheet } from "@/components/workout-log-sheet";
import { AddToWorkoutSheet } from "@/components/add-to-workout-sheet";
import { MUSCLE_GROUPS, type MuscleGroupKey } from "@/lib/muscle-groups";
import { builtInExerciseNames } from "@/lib/exercise-catalog";
import { fetchCustomExercises } from "@/lib/custom-exercises";
import { fetchRecentExercises, relativeUsedLabel } from "@/lib/recent-exercises";
import { loadBulkPicks, saveBulkPicks } from "@/lib/fitness-prefs";
import { FitnessTipsCard } from "@/components/fitness-tips-card";
import { fitnessTips } from "@/lib/fitness-tips";
import { useFitnessSignals, EMPTY_SIGNALS } from "@/lib/fitness-signals";
import {
  DIFFICULTY_LABELS,
  EMPTY_FILTERS,
  EQUIPMENT_LABELS,
  activeFilterCount,
  describeExercise,
  filterExercises,
  type DifficultyKey,
  type EquipmentKey,
  type ExerciseFilters,
} from "@/lib/exercise-facets";

const PAGE_SIZE = 36;

function FilterRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "all";
  options: { key: T; label: string }[];
  onChange: (next: T | "all") => void;
}) {
  return (
    <div className="mt-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div
        role="group"
        aria-label={label}
        className="-mx-1 mt-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {[{ key: "all" as const, label: "All" }, ...options].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key as T | "all")}
            aria-pressed={value === option.key}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              value === option.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExerciseLibraryPanel({ todayKey }: { todayKey: string }) {
  const [filters, setFilters] = useState<ExerciseFilters>(EMPTY_FILTERS);
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Bulk staging survives closing the modal (and the page), so a large batch
  // can be assembled across several visits instead of in one marathon session.
  const [picked, setPicked] = useState<string[]>([]);
  const restoredPicks = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const signals = useFitnessSignals().data ?? EMPTY_SIGNALS;

  const custom = useQuery({
    queryKey: ["custom-exercises"],
    queryFn: fetchCustomExercises,
    staleTime: 5 * 60_000,
  });

  const recent = useQuery({
    queryKey: ["recent-exercises"],
    queryFn: fetchRecentExercises,
    staleTime: 5 * 60_000,
  });

  const items = useMemo(() => {
    const usage = new Map((recent.data ?? []).map((row) => [row.name.toLowerCase(), row] as const));
    const mine = (custom.data ?? []).map((row) => row.name);
    const mineSet = new Set(mine.map((n) => n.toLowerCase()));
    const names = [...mine, ...builtInExerciseNames().filter((n) => !mineSet.has(n.toLowerCase()))];
    // Logged exercises that aren't in the catalog or saved list still belong here.
    for (const row of recent.data ?? []) {
      if (!names.some((n) => n.toLowerCase() === row.name.toLowerCase())) names.push(row.name);
    }
    return names.map((name) => {
      const used = usage.get(name.toLowerCase());
      return describeExercise(name, {
        mine: mineSet.has(name.toLowerCase()),
        lastUsedAt: used?.lastUsedAt,
        useCount: used?.useCount,
      });
    });
  }, [custom.data, recent.data]);

  useEffect(() => {
    if (restoredPicks.current) return;
    restoredPicks.current = true;
    const saved = loadBulkPicks();
    if (saved.length > 0) setPicked(saved);
  }, []);

  useEffect(() => {
    if (!restoredPicks.current) return;
    saveBulkPicks(picked);
  }, [picked]);

  const results = useMemo(() => filterExercises(items, filters), [items, filters]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [filters]);

  const visible = results.slice(0, limit);

  const badges = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of visible) {
      if (item.lastUsedAt) map[item.name.toLowerCase()] = relativeUsedLabel(item.lastUsedAt);
      else if (item.mine) map[item.name.toLowerCase()] = "Saved";
    }
    return map;
  }, [visible]);

  function togglePick(name: string) {
    setPicked((prev) =>
      prev.some((p) => p.toLowerCase() === name.toLowerCase())
        ? prev.filter((p) => p.toLowerCase() !== name.toLowerCase())
        : [...prev, name],
    );
  }

  /** Bulk mode: stage everything currently on screen in one tap (or clear it). */
  const allVisiblePicked =
    visible.length > 0 &&
    visible.every((item) => picked.some((p) => p.toLowerCase() === item.name.toLowerCase()));

  function selectAllVisible() {
    setPicked((prev) => {
      if (allVisiblePicked) {
        const shown = new Set(visible.map((i) => i.name.toLowerCase()));
        return prev.filter((p) => !shown.has(p.toLowerCase()));
      }
      const seen = new Set(prev.map((p) => p.toLowerCase()));
      const next = [...prev];
      for (const item of visible) {
        if (!seen.has(item.name.toLowerCase())) next.push(item.name);
      }
      return next;
    });
  }

  const activeCount = activeFilterCount(filters);
  const usedCount = items.filter((i) => i.lastUsedAt || i.mine).length;

  return (
    <div className="space-y-4">
      <FitnessTipsCard
        tips={fitnessTips("exercises", signals)}
        onAction={() => searchRef.current?.focus()}
      />
      <Card className="p-4">
        <h2 className="text-sm font-semibold">Exercise library</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Search or filter, tap exercises to pick them, then add them to a routine, your weekly
          calendar, or start a workout right away.
        </p>

        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            type="search"
            placeholder="Search exercises…"
            aria-label="Search exercises"
            className="pl-9"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, usedOnly: !f.usedOnly }))}
            aria-pressed={filters.usedOnly}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filters.usedOnly
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            Used before{usedCount > 0 ? ` (${usedCount})` : ""}
          </button>
          {(activeCount > 0 || filters.query) && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              Clear filters
            </button>
          )}
        </div>

        <FilterRow
          label="Muscle group"
          value={filters.muscle}
          options={MUSCLE_GROUPS.map((g) => ({ key: g.key as MuscleGroupKey, label: g.label }))}
          onChange={(muscle) => setFilters((f) => ({ ...f, muscle }))}
        />
        <FilterRow
          label="Equipment"
          value={filters.equipment}
          options={(Object.keys(EQUIPMENT_LABELS) as EquipmentKey[]).map((key) => ({
            key,
            label: EQUIPMENT_LABELS[key],
          }))}
          onChange={(equipment) => setFilters((f) => ({ ...f, equipment }))}
        />
        <FilterRow
          label="Difficulty"
          value={filters.difficulty}
          options={(Object.keys(DIFFICULTY_LABELS) as DifficultyKey[]).map((key) => ({
            key,
            label: DIFFICULTY_LABELS[key],
          }))}
          onChange={(difficulty) => setFilters((f) => ({ ...f, difficulty }))}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {results.length} exercise{results.length === 1 ? "" : "s"} found
            {picked.length > 0 ? ` · ${picked.length} selected` : ""}
          </p>
          {visible.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {allVisiblePicked ? "Unselect shown" : `Select all ${visible.length} shown`}
              </button>
              {picked.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPicked([])}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  Clear selection
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {results.length === 0 ? (
        <Card className="p-6 text-center">
          <Dumbbell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No exercises match</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try clearing a filter or searching a different name. Anything you log gets saved here so
            you can reuse it next time.
          </p>
        </Card>
      ) : (
        <>
          <ExerciseSearchGrid
            names={visible.map((item) => item.name)}
            onPick={togglePick}
            chosen={picked}
            hideSearch
            badges={badges}
            maxResults={limit}
          />
          {results.length > visible.length && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE_SIZE)}
              className="w-full rounded-lg border border-border py-2 text-sm font-medium"
            >
              Show more ({results.length - visible.length} left)
            </button>
          )}
        </>
      )}

      {picked.length > 0 && (
        <div className="sticky bottom-20 z-20">
          <Card className="flex items-center gap-2 border-primary/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {picked.length} exercise{picked.length === 1 ? "" : "s"} selected
              </p>
              <p className="truncate text-xs text-muted-foreground">{picked.join(", ")}</p>
            </div>
            <button
              type="button"
              onClick={() => setPicked([])}
              aria-label="Clear selected exercises"
              className="tap-target rounded-lg border border-border p-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="shrink-0 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary"
            >
              Add to workout
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Start
            </button>
          </Card>
        </div>
      )}

      <AddToWorkoutSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        exercises={picked}
        onAdded={() => setPicked([])}
      />

      <WorkoutLogSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        seed={{ dayKey: todayKey, status: "completed", exercises: picked }}
        onSaved={() => {
          setPicked([]);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
