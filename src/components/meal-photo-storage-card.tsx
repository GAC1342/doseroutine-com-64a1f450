import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, ImageOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MealPhotoStorageChart } from "@/components/meal-photo-storage-chart";
import {
  MEAL_PHOTO_RETENTION_OPTIONS,
  batched,
  formatBytes,
  photoFileName,
  type MealPhotoRetentionDays,
} from "@/lib/meal-photo-retention";
import {
  mealPhotoEventLabel,
  recordMealPhotoEvent,
  retentionCopy,
  useMealPhotoEvents,
  useMealPhotoRetention,
  useMealPhotos,
  type MealPhotoRow,
} from "@/lib/use-meal-photos";

async function downloadZip(rows: MealPhotoRow[]) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let added = 0;
  let index = 0;
  // Batched so a large export doesn't stall the tab.
  for (const chunk of batched(rows, 8)) {
    const blobs = await Promise.all(
      chunk.map(async (row) => {
        const { data, error } = await supabase.storage
          .from("meal-photos")
          .download(row.storage_path);
        if (error || !data) return null;
        return { row, blob: data };
      }),
    );
    for (const entry of blobs) {
      const name = photoFileName(
        entry?.row.logged_at ?? new Date().toISOString(),
        entry?.row.label ?? null,
        index,
      );
      index += 1;
      if (!entry) continue;
      zip.file(name, entry.blob);
      added += 1;
    }
  }
  if (added === 0) throw new Error("None of those photos could be downloaded.");
  const bundle = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(bundle);
  const a = document.createElement("a");
  a.href = url;
  a.download = `doseroutine-meal-photos-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return added;
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function groupByDay(rows: MealPhotoRow[]) {
  const groups = new Map<string, MealPhotoRow[]>();
  for (const row of [...rows].sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1))) {
    const key = dayKey(row.logged_at);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()];
}

export function MealPhotoStorageCard({ className = "" }: { className?: string }) {
  const { retentionDays, setRetentionDays, isSaving } = useMealPhotoRetention();
  const { data, isPending } = useMealPhotos(retentionDays);
  const queryClient = useQueryClient();
  const [zipping, setZipping] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  if (isPending || !data || data.total === 0) return null;

  async function saveZip(rows: MealPhotoRow[]) {
    if (rows.length === 0) return;
    setZipping(true);
    try {
      const count = await downloadZip(rows);
      await recordMealPhotoEvent("download", count);
      void queryClient.invalidateQueries({ queryKey: ["meal-photo-events"] });
      toast.success(`Saved ${count} photo${count === 1 ? "" : "s"} to your device.`);
    } catch (err) {
      toast.error("Could not build the zip", {
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setZipping(false);
    }
  }

  async function removePhotos(rows: MealPhotoRow[]) {
    const paths = rows.map((r) => r.storage_path);
    const { error } = await supabase.storage.from("meal-photos").remove(paths);
    if (error) throw error;
    const { error: clearError } = await supabase
      .from("meals")
      .update({ storage_path: null, photo_url: null })
      .in(
        "id",
        rows.map((r) => r.id),
      );
    if (clearError) throw clearError;
    void queryClient.invalidateQueries({ queryKey: ["meal-photos"] });
    void queryClient.invalidateQueries({ queryKey: ["meals"] });
  }

  async function deleteNow(rows: MealPhotoRow[], key: string) {
    if (rows.length === 0) return;
    setRemovingKey(key);
    try {
      await removePhotos(rows);
      await recordMealPhotoEvent("delete", rows.length);
      void queryClient.invalidateQueries({ queryKey: ["meal-photo-events"] });
      toast.success(
        `Deleted ${rows.length} photo${rows.length === 1 ? "" : "s"} — your macros are untouched.`,
      );
    } catch (err) {
      toast.error("Could not delete", {
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setRemovingKey(null);
    }
  }

  async function cleanUpNow(rows: MealPhotoRow[]) {
    if (rows.length === 0) return;
    setCleaning(true);
    try {
      await removePhotos(rows);
      await recordMealPhotoEvent("cleanup", rows.length);
      void queryClient.invalidateQueries({ queryKey: ["meal-photo-events"] });
      toast.success("Old photos removed — your macros are untouched.");
    } catch (err) {
      toast.error("Cleanup failed", {
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setCleaning(false);
    }
  }

  const pending = [...data.dueNow, ...data.expiringSoon];
  const days = groupByDay(data.photos);


  return (
    <section className={`rounded-2xl bg-card p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Photo storage</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.total} meal photo{data.total === 1 ? "" : "s"} · about{" "}
            {formatBytes(data.approxBytes)}
          </p>
        </div>
        <ImageOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>

      {pending.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {pending.length} photo{pending.length === 1 ? "" : "s"}{" "}
          {data.nextExpiryInDays === 0
            ? "will be removed on the next weekly cleanup"
            : `expire in ${data.nextExpiryInDays} day${data.nextExpiryInDays === 1 ? "" : "s"}`}
          . Save them first if you want to keep them.
        </p>
      ) : null}

      <MealPhotoStorageChart photos={data.photos} className="mt-4" />



      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={zipping}
          onClick={() => void saveZip(data.photos)}
        >
          {zipping ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download all as zip
        </Button>
        {pending.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={cleaning}
            onClick={() => void cleanUpNow(pending)}
          >
            {cleaning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Clean up now
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={showManage}
          onClick={() => setShowManage((v) => !v)}
        >
          {showManage ? "Hide photos" : "Manage photos"}
        </Button>
      </div>

      {showManage ? (
        <ul className="mt-3 space-y-3 border-t border-border pt-3">
          {days.map(([day, rows]) => (
            <li key={day}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">
                  {day}{" "}
                  <span className="text-muted-foreground">
                    · {rows.length} photo{rows.length === 1 ? "" : "s"}
                  </span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={removingKey !== null}
                  onClick={() => void deleteNow(rows, `day:${day}`)}
                >
                  {removingKey === `day:${day}` ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete day
                </Button>
              </div>
              <ul className="mt-1 space-y-1">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1"
                  >
                    <span className="truncate text-xs text-muted-foreground">
                      {row.label ?? "Meal"} ·{" "}
                      {new Date(row.logged_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      aria-label={`Delete photo from ${row.label ?? "meal"}`}
                      disabled={removingKey !== null}
                      onClick={() => void deleteNow([row], row.id)}
                    >
                      {removingKey === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}



      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs font-medium">Keep photos for</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Photo retention length">
          {MEAL_PHOTO_RETENTION_OPTIONS.map((days) => (
            <Button
              key={days}
              type="button"
              size="sm"
              variant={days === retentionDays ? "default" : "outline"}
              disabled={isSaving}
              aria-pressed={days === retentionDays}
              onClick={async () => {
                if (days === retentionDays) return;
                try {
                  await setRetentionDays(days as MealPhotoRetentionDays);
                  toast.success(`Meal photos now kept for ${days} days.`);
                } catch (err) {
                  toast.error("Could not save that setting", {
                    description: err instanceof Error ? err.message : "Try again in a moment.",
                  });
                }
              }}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">{retentionCopy(retentionDays)}</p>

      <MealPhotoHistoryLog />
    </section>
  );
}

function MealPhotoHistoryLog() {
  const { data: events } = useMealPhotoEvents(8);
  if (!events || events.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-xs font-medium">Recent activity</p>
      <ul className="mt-2 space-y-1">
        {events.map((event) => (
          <li key={event.id} className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="text-foreground">{mealPhotoEventLabel(event)}</span>
            <span className="shrink-0 text-muted-foreground">
              {new Date(event.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}



export function MealPhotoExpiryBanner({ className = "" }: { className?: string }) {
  const { retentionDays } = useMealPhotoRetention();
  const { data } = useMealPhotos(retentionDays);
  const [dismissed, setDismissed] = useState(false);
  const [zipping, setZipping] = useState(false);

  const pending = data ? [...data.dueNow, ...data.expiringSoon] : [];
  if (dismissed || pending.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs ${className}`}
    >
      <span className="flex-1">
        {pending.length} meal photo{pending.length === 1 ? "" : "s"}{" "}
        {data?.nextExpiryInDays === 0
          ? "are removed on the next cleanup"
          : `are removed in ${data?.nextExpiryInDays} day${data?.nextExpiryInDays === 1 ? "" : "s"}`}{" "}
        (after {retentionDays} days). Save them first?
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={zipping}
        onClick={async () => {
          setZipping(true);
          try {
            const count = await downloadZip(pending);
            await recordMealPhotoEvent("download", count, "expiry banner");
            toast.success(`Saved ${count} photo${count === 1 ? "" : "s"} to your device.`);
          } catch (err) {
            toast.error("Could not build the zip", {
              description: err instanceof Error ? err.message : "Try again in a moment.",
            });
          } finally {
            setZipping(false);
          }
        }}
      >
        {zipping ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Download
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed(true)}>
        Dismiss
      </Button>
    </div>
  );
}
