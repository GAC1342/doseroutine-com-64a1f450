import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { exerciseArt, exerciseArtAlt } from "@/lib/exercise-art";
import { ExerciseArtLightbox } from "@/components/exercise-art-lightbox";

const MAX_RESULTS = 24;

/**
 * Searchable exercise grid with reference illustrations so a user can visually
 * confirm the exercise before adding it to the workout. Arrow keys move between
 * cards, Enter/Space adds the exercise, and each illustration carries a
 * descriptive alt text of the position and worked muscles.
 */
export function ExerciseSearchGrid({
  names,
  onPick,
  chosen = [],
}: {
  names: string[];
  onPick: (name: string) => void;
  chosen?: string[];
}) {
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  const chosenSet = useMemo(
    () => new Set(chosen.map((c) => c.trim().toLowerCase()).filter(Boolean)),
    [chosen],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
    return list.slice(0, MAX_RESULTS);
  }, [names, query]);

  /** Roving arrow-key navigation across the "add" buttons in the grid. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;

    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-pick]") ?? [],
    );
    if (buttons.length === 0) return;

    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;

    // Columns are derived from layout so Up/Down match what's on screen.
    const top = buttons[0].getBoundingClientRect().top;
    const columns = Math.max(
      1,
      buttons.filter((b) => Math.abs(b.getBoundingClientRect().top - top) < 4).length,
    );

    let next = current;
    if (event.key === "ArrowRight") next = current + 1;
    if (event.key === "ArrowLeft") next = current - 1;
    if (event.key === "ArrowDown") next = current + columns;
    if (event.key === "ArrowUp") next = current - columns;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;

    if (next < 0 || next >= buttons.length) return;
    event.preventDefault();
    buttons[next].focus();
  }

  return (
    <div className="mb-2 rounded-xl border border-border p-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        placeholder="Search exercises…"
        aria-label="Search exercises"
        aria-describedby="exercise-search-grid-help"
      />
      <p id="exercise-search-grid-help" className="sr-only">
        Results appear below as a grid. Tab moves through each card’s illustration, exercise name,
        and add button. Use the arrow keys to jump between add buttons, and Enter to add an exercise
        or open its illustration.
      </p>
      <p aria-live="polite" className="sr-only">
        {results.length} exercise{results.length === 1 ? "" : "s"} shown
      </p>

      {results.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No exercises match “{query.trim()}”. You can still type it into a row below.
        </p>
      ) : (
        <ul
          ref={listRef}
          onKeyDown={handleKeyDown}
          aria-label="Exercise search results"
          className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {results.map((name) => {
            const art = exerciseArt(name);
            const alt = exerciseArtAlt(name);
            const picked = chosenSet.has(name.toLowerCase());
            return (
              <li key={name} className="min-w-0">
                <ExerciseArtLightbox exercise={name}>
                  {({ onOpen }) => (
                    <div
                      className={`flex h-full flex-col overflow-hidden rounded-lg border ${
                        picked ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      {art ? (
                        <button
                          type="button"
                          onClick={(e) => onOpen(e.currentTarget)}
                          aria-label={`Enlarge illustration: ${alt}`}
                          className="cursor-zoom-in bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        >
                          <img
                            src={art}
                            alt=""
                            aria-hidden="true"
                            width={160}
                            height={120}
                            loading="lazy"
                            className="h-20 w-full object-contain"
                          />
                        </button>
                      ) : (
                        <div className="flex h-20 items-center justify-center bg-muted text-[10px] text-muted-foreground">
                          No illustration
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => onOpen(e.currentTarget)}
                        aria-label={`View ${name} illustration`}
                        className="tap-target flex-1 px-2 py-1.5 text-left text-[11px] font-medium leading-tight hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                      >
                        <span className="line-clamp-2">{name}</span>
                      </button>
                      <button
                        type="button"
                        data-pick=""
                        onClick={() => onPick(name)}
                        aria-label={`Add ${name} to this workout${picked ? " (already added)" : ""}`}
                        aria-pressed={picked}
                        className="tap-target flex items-center justify-center gap-1 border-t border-border px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-50"
                        disabled={picked}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {picked ? "Added" : "Add"}
                      </button>
                    </div>
                  )}
                </ExerciseArtLightbox>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
