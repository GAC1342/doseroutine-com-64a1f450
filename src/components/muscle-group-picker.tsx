/**
 * Visual "pick by muscle group" exercise picker.
 *
 * Tap a body part, then tap a ranked exercise to drop it straight into the
 * workout's exercise rows — no typing, no guessing what to train. Each row
 * shows a small body map with the worked muscles highlighted; tapping the map
 * opens a bigger view with the muscles named and a few form cues.
 */

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Dumbbell, FileImage, FileCode2, Search, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MUSCLE_LABELS, MuscleMap, muscleMapSide } from "@/components/muscle-map";
import { PoseFigure } from "@/components/pose-figure";
import { ZoomPan } from "@/components/zoom-pan";
import { POSES } from "@/lib/muscle-poses";
import { exerciseArt, exerciseArtAlt } from "@/lib/exercise-art";
import { exerciseHowTo } from "@/lib/exercise-howto";
import { downloadPng, downloadSvg, slugify } from "@/lib/svg-export";

import { MUSCLE_GROUPS, type MuscleGroupExercise, type MuscleGroupKey } from "@/lib/muscle-groups";

function muscleList(regions: readonly string[] = []) {
  return regions.map((r) => MUSCLE_LABELS[r as keyof typeof MUSCLE_LABELS] ?? r).join(", ");
}

/** Everything a search query can match on for one exercise. */
function haystack(exercise: MuscleGroupExercise, groupLabel: string) {
  return [
    exercise.name,
    exercise.note,
    groupLabel,
    muscleList(exercise.primary),
    muscleList(exercise.secondary),
  ]
    .join(" ")
    .toLowerCase();
}

export function MuscleGroupPicker({
  onPick,
  chosen = [],
}: {
  onPick: (name: string) => void;
  /** Exercise names already in the workout, so picks read as added. */
  chosen?: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<MuscleGroupKey | "all">("chest");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<MuscleGroupExercise | null>(null);
  const [exporting, setExporting] = useState(false);
  const mapRef = useRef<SVGSVGElement>(null);
  const group = MUSCLE_GROUPS.find((g) => g.key === active) ?? null;
  const picked = new Set(chosen.map((n) => n.trim().toLowerCase()));

  const q = query.trim().toLowerCase();

  /** Exercises matching the active body-part filter and the search text. */
  const results = useMemo(() => {
    const groups = group ? [group] : MUSCLE_GROUPS;
    const rows: { exercise: MuscleGroupExercise; groupLabel: string }[] = [];
    const seen = new Set<string>();
    for (const g of groups) {
      for (const exercise of g.exercises) {
        if (q && !haystack(exercise, g.label).includes(q)) continue;
        const key = exercise.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ exercise, groupLabel: g.label });
      }
    }
    return rows;
  }, [group, q]);

  async function saveImage(kind: "svg" | "png") {
    const el = mapRef.current;
    if (!el || !detail) return;
    const base = `${slugify(detail.name)}-muscles`;
    try {
      setExporting(true);
      if (kind === "svg") downloadSvg(el, `${base}.svg`);
      else {
        const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
        await downloadPng(el, `${base}.png`, { scale: 6, background: bg });
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mb-2 rounded-xl border border-border p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap-target flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Dumbbell className="h-4 w-4 text-primary" />
          Pick by muscle group
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Browse"}</span>
      </button>

      {open && (
        <div className="mt-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search moves or muscles…"
              aria-label="Search exercises"
              className="tap-target h-10 w-full rounded-xl border border-border bg-background pl-9 pr-9 text-sm outline-none focus:border-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Muscle groups">
            {[{ key: "all" as const, label: "All" }, ...MUSCLE_GROUPS].map((g) => {
              const isActive = g.key === active;
              return (
                <button
                  key={g.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(g.key)}
                  className={`tap-target rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            {group ? group.blurb : "Every body part"} · {results.length}{" "}
            {results.length === 1 ? "move" : "moves"}
          </p>

          {results.length === 0 && (
            <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              No moves match “{query}”. Try a muscle name like “glutes”.
            </p>
          )}

          <ul className="mt-2 space-y-1.5">
            {results.map(({ exercise, groupLabel }, index) => {
              const added = picked.has(exercise.name.toLowerCase());

              return (
                <li key={exercise.name}>
                  <div className="flex items-center gap-2 rounded-xl border border-border pr-3 hover:bg-muted">
                    <button
                      type="button"
                      onClick={() => setDetail(exercise)}
                      aria-label={`See muscles worked: ${exercise.name}`}
                      className="relative my-1.5 ml-1.5 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/60"
                    >
                      {exerciseArt(exercise.name) ? (
                        <img
                          src={exerciseArt(exercise.name)}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          width={96}
                          height={96}
                          className="h-12 w-12 object-contain mix-blend-multiply dark:mix-blend-normal dark:opacity-90"
                        />
                      ) : (
                        <MuscleMap
                          primary={exercise.primary}
                          secondary={exercise.secondary}
                          view={exercise.view}
                          detail="simple"
                          className="h-11 w-auto"
                        />
                      )}

                      <span className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPick(exercise.name)}
                      className="tap-target flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{exercise.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {group ? exercise.note : `${groupLabel} · ${exercise.note}`}
                        </span>
                      </span>
                      {added && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                      <span className="sr-only">{added ? "Already added" : "Add exercise"}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>{detail.note}</DialogDescription>
              </DialogHeader>
              {exerciseArt(detail.name) && (
                <ZoomPan
                  className="h-64 w-full rounded-xl bg-muted/40"
                  contentClassName="flex items-center justify-center"
                  label={`How to perform ${detail.name}`}
                >
                  <img
                    src={exerciseArt(detail.name)}
                    alt={exerciseArtAlt(detail.name)}
                    title={detail.name}
                    loading="lazy"
                    width={768}
                    height={768}
                    className="h-64 w-auto object-contain mix-blend-multiply dark:mix-blend-normal"
                  />
                </ZoomPan>
              )}
              <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                <div className="flex w-20 flex-col items-center rounded-xl bg-muted/50 p-1.5">
                  <MuscleMap
                    svgRef={mapRef}
                    primary={detail.primary}
                    secondary={detail.secondary}
                    view={detail.view}
                    className="h-24 w-auto"
                  />
                  <p className="mt-1 text-center text-[10px] leading-tight text-muted-foreground">
                    {detail.view === "back"
                      ? "Back view"
                      : detail.view === "front"
                        ? "Front view"
                        : muscleMapSide(detail.primary)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PoseFigure
                    id={detail.pose}
                    label={`Body position for ${detail.name}`}
                    className="h-14 w-14 shrink-0"
                  />
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    {detail.setup ?? POSES[detail.pose].label}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveImage("svg")}
                  disabled={exporting}
                  className="tap-target flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
                >
                  <FileCode2 className="h-3.5 w-3.5" aria-hidden /> Save SVG
                </button>
                <button
                  type="button"
                  onClick={() => saveImage("png")}
                  disabled={exporting}
                  className="tap-target flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-60"
                >
                  <FileImage className="h-3.5 w-3.5" aria-hidden />
                  {exporting ? "Saving…" : "Save PNG"}
                </button>
              </div>

              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-muted-foreground">Works</dt>
                  <dd className="font-medium">{muscleList(detail.primary)}</dd>
                </div>
                {detail.secondary && detail.secondary.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-muted-foreground">Also</dt>
                    <dd>{muscleList(detail.secondary)}</dd>
                  </div>
                )}
              </dl>
              {(() => {
                const how = exerciseHowTo(detail.name);
                return (
                  <>
                    {how && (
                      <section>
                        <h3 className="text-sm font-semibold">How to do it</h3>
                        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                          {how.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </section>
                    )}

                    <section>
                      <h3 className="text-sm font-semibold">Form cues</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {detail.cues.map((cue) => (
                          <li key={cue}>{cue}</li>
                        ))}
                      </ul>
                    </section>

                    {how && (
                      <section>
                        <h3 className="text-sm font-semibold">Common mistakes</h3>
                        <ul className="mt-1 space-y-1 pl-1 text-sm text-muted-foreground">
                          {how.mistakes.map((m) => (
                            <li key={m} className="flex gap-2">
                              <AlertTriangle
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive"
                                aria-hidden
                              />
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </>
                );
              })()}
              <button
                type="button"
                onClick={() => {
                  onPick(detail.name);
                  setDetail(null);
                }}
                className="tap-target w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Add {detail.name}
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
