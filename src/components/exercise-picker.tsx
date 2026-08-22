/**
 * Compact searchable/filterable exercise picker.
 *
 * The guided "new routine" flow used to show a bare, unfiltered grid, which
 * meant scrolling past legs and cardio to reach an upper-body lift. This wraps
 * the same grid with the library's search + facet vocabulary (muscle group,
 * equipment) so a specific movement is two taps away, and defaults can bias
 * toward upper body where that's what the user came for.
 */

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { ExerciseSearchGrid } from "@/components/exercise-search-grid";
import { MUSCLE_GROUPS, type MuscleGroupKey } from "@/lib/muscle-groups";
import {
  EMPTY_FILTERS,
  EQUIPMENT_LABELS,
  describeExercise,
  filterExercises,
  type EquipmentKey,
  type ExerciseFilters,
} from "@/lib/exercise-facets";

const EQUIPMENT_ORDER: EquipmentKey[] = ["barbell", "dumbbell", "machine", "bodyweight"];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function ExercisePicker({
  names,
  chosen,
  onPick,
  defaultMuscle = "all",
  maxResults = 24,
}: {
  names: string[];
  chosen: string[];
  onPick: (name: string) => void;
  /** Pre-select a muscle group, e.g. "chest" when adding upper-body work. */
  defaultMuscle?: MuscleGroupKey | "all";
  maxResults?: number;
}) {
  const [filters, setFilters] = useState<ExerciseFilters>({
    ...EMPTY_FILTERS,
    muscle: defaultMuscle,
  });

  const items = useMemo(() => names.map((name) => describeExercise(name)), [names]);
  const results = useMemo(() => filterExercises(items, filters), [items, filters]);

  const badges = useMemo(() => {
    const out: Record<string, string> = {};
    for (const item of results) {
      const group = MUSCLE_GROUPS.find((g) => g.key === item.muscle);
      out[item.name.toLowerCase()] = [group?.label, EQUIPMENT_LABELS[item.equipment]]
        .filter(Boolean)
        .join(" · ");
    }
    return out;
  }, [results]);

  return (
    <div>
      <Input
        type="search"
        value={filters.query}
        onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
        placeholder="Search exercises…"
        aria-label="Search exercises"
      />

      <div
        role="group"
        aria-label="Muscle group"
        className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        <Chip
          label="All"
          active={filters.muscle === "all"}
          onClick={() => setFilters((f) => ({ ...f, muscle: "all" }))}
        />
        {MUSCLE_GROUPS.map((group) => (
          <Chip
            key={group.key}
            label={group.label}
            active={filters.muscle === group.key}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                muscle: f.muscle === group.key ? "all" : group.key,
              }))
            }
          />
        ))}
      </div>

      <div
        role="group"
        aria-label="Equipment"
        className="-mx-1 mt-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {EQUIPMENT_ORDER.map((key) => (
          <Chip
            key={key}
            label={EQUIPMENT_LABELS[key]}
            active={filters.equipment === key}
            onClick={() =>
              setFilters((f) => ({ ...f, equipment: f.equipment === key ? "all" : key }))
            }
          />
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {results.length} exercises match
      </p>

      <div className="mt-2">
        <ExerciseSearchGrid
          names={results.map((r) => r.name)}
          onPick={onPick}
          chosen={chosen}
          badges={badges}
          hideSearch
          maxResults={maxResults}
        />
      </div>
    </div>
  );
}
