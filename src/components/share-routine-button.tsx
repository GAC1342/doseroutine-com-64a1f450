import { useEffect, useState } from "react";
import { Share2, Copy, Check, Loader2, ImageDown, X, Link2Off, Eye, Download } from "lucide-react";
import { useConfirm } from "@/components/confirm-dialog";
import {
  createRoutineShare,
  deleteRoutineShare,
  fetchRoutineShares,
  setRoutineShareActive,
  setRoutineShareOwnerName,
  type RoutineShareRow,
} from "@/lib/routine-shares";
import { routineShareUrl, type SharedRoutine } from "@/lib/shared-routine";
import { shareOrDownloadCard, shareRoutineLink } from "@/lib/routine-share-card";
import type { WorkoutTemplate } from "@/lib/workout-templates";

/**
 * "Share" on a saved routine. Creates a public /r/{id} link, lets the owner
 * copy it, hand it to the native share sheet, download a story card, or switch
 * the link off.
 *
 * Only workout fields ever leave the account — the sheet never reads notes,
 * stack items, doses or body data.
 */
export function ShareRoutineButton({
  template,
  className,
}: {
  template: WorkoutTemplate;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Share routine ${template.name}`}
        onClick={() => setOpen(true)}
        className={
          className ??
          "tap-target rounded-lg border border-border px-2 py-1 text-muted-foreground hover:border-primary hover:text-primary"
        }
      >
        <Share2 className="h-4 w-4" />
      </button>
      {open && <ShareRoutineSheet template={template} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Whitelisted projection of a routine, matching what the public page shows. */
export function templateToSharedRoutine(
  template: WorkoutTemplate,
  publicId: string,
): SharedRoutine {
  return {
    public_id: publicId,
    created_at: new Date().toISOString(),
    view_count: 0,
    save_count: 0,
    owner_name: null,
    routine_name: template.name,
    workout_type: template.workout_type,
    duration_min: template.duration_min,
    rpe: template.rpe,
    distance_m: template.distance_m,
    target_pace_s: template.target_pace_s,
    target_hr: template.target_hr,
    exercises: template.exercises.map((e) => ({
      exercise: e.exercise,
      set_index: e.set_index,
      sets: e.sets,
      reps: e.reps,
      weight_kg: e.weight_kg,
      rest_seconds: e.rest_seconds,
      tempo: e.tempo,
    })),
  };
}

function ShareRoutineSheet({
  template,
  onClose,
}: {
  template: WorkoutTemplate;
  onClose: () => void;
}) {
  const [confirmAction, confirmUi] = useConfirm();
  const [shares, setShares] = useState<RoutineShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showName, setShowName] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const rows = await fetchRoutineShares(template.id);
        if (alive) setShares(rows);
      } catch {
        if (alive) setError("Could not load your existing links.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [template.id]);

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      setError("Copying isn't available here — select the link and copy it manually.");
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const row = await createRoutineShare(template.id, showName);
      setShares((prev) => [row, ...prev]);
      await copy(routineShareUrl(row.public_id), row.id);
    } catch {
      setError("Could not create the link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: RoutineShareRow) {
    if (row.is_active) {
      const ok = await confirmAction({
        title: "Turn this link off?",
        description: "Anyone who already has it will see that the routine is no longer shared.",
        confirmLabel: "Turn off",
      });
      if (!ok) return;
    }
    try {
      await setRoutineShareActive(row.id, !row.is_active);
      setShares((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, is_active: !row.is_active } : s)),
      );
    } catch {
      setError("Could not update the link.");
    }
  }

  async function toggleName(row: RoutineShareRow) {
    try {
      await setRoutineShareOwnerName(row.id, !row.show_owner_name);
      setShares((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, show_owner_name: !row.show_owner_name } : s)),
      );
    } catch {
      setError("Could not update the link.");
    }
  }

  async function remove(row: RoutineShareRow) {
    const ok = await confirmAction({
      title: "Delete this link?",
      description: "The link stops working immediately and can't be restored.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await deleteRoutineShare(row.id);
      setShares((prev) => prev.filter((s) => s.id !== row.id));
    } catch {
      setError("Could not delete the link.");
    }
  }

  async function downloadCard(row: RoutineShareRow) {
    setBusy(true);
    setError(null);
    try {
      await shareOrDownloadCard(
        templateToSharedRoutine(template, row.public_id),
        routineShareUrl(row.public_id),
      );
    } catch {
      setError("Could not build the image card on this device.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="sheet-bottom-keyboard-safe w-full max-w-lg overflow-hidden rounded-t-3xl bg-background shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Share ${template.name}`}
      >
        {confirmUi}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Share routine</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-target -m-2 rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          <p className="text-sm text-muted-foreground">
            Creates a public read-only page for <span className="font-medium">{template.name}</span>
            . It shows the exercises, sets, reps, weight, rest and pace — and nothing else. Your
            supplements, doses, bloodwork, body metrics, photos and personal notes are never
            included.
          </p>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <input
              type="checkbox"
              checked={showName}
              onChange={(e) => setShowName(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--primary)]"
            />
            <span className="text-sm">
              Show my display name on the public page
              <span className="block text-xs text-muted-foreground">Off by default.</span>
            </span>
          </label>

          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[color:var(--primary-hover)] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {busy ? "Working…" : "Create share link & copy"}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Links for this routine
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None yet. Create one above — it gets copied to your clipboard.
              </p>
            ) : (
              <ul className="space-y-2">
                {shares.map((row) => {
                  const url = routineShareUrl(row.public_id);
                  return (
                    <li key={row.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">{url}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            row.is_active
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.is_active ? "On" : "Off"}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {row.view_count} view
                          {row.view_count === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Download className="h-3 w-3" /> {row.save_count} save
                          {row.save_count === 1 ? "" : "s"}
                        </span>
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copy(url, row.id)}
                          className="tap-target inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
                        >
                          {copied === row.id ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copied === row.id ? "Copied" : "Copy link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void shareRoutineLink(template.name, url)}
                          className="tap-target inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
                        >
                          <Share2 className="h-3.5 w-3.5" /> Share
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadCard(row)}
                          disabled={busy}
                          className="tap-target inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                        >
                          <ImageDown className="h-3.5 w-3.5" /> Image card
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(row)}
                          className="tap-target inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
                        >
                          <Link2Off className="h-3.5 w-3.5" />{" "}
                          {row.is_active ? "Turn off" : "Turn on"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleName(row)}
                          className="tap-target inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
                        >
                          {row.show_owner_name ? "Hide my name" : "Show my name"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row)}
                          className="tap-target inline-flex h-9 items-center rounded-lg border border-destructive/30 bg-background px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            The public page always uses DoseRoutine's default exercise illustrations, never your own
            photos.
          </p>
        </div>
      </div>
    </div>
  );
}
