/**
 * Export / import saved routines and their weekly repeat rules as one JSON
 * file, so a schedule can move between devices or be shared with a partner.
 */

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2, Upload } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ROUTINE_QUERY_KEYS } from "@/components/routine-planner-card";
import { fetchWorkoutTemplates } from "@/lib/workout-templates";
import { fetchRoutineAssignments } from "@/lib/repeat-routine";
import {
  backupFilename,
  buildRoutineBackup,
  importRoutineBackup,
  parseRoutineBackup,
} from "@/lib/routine-transfer";

export function RoutineBackupCard() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const templates = useQuery({ queryKey: ["workout-templates"], queryFn: fetchWorkoutTemplates });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["workout-templates"] });
    void qc.invalidateQueries({ queryKey: ["routine-assignments"] });
    for (const key of Object.values(ROUTINE_QUERY_KEYS))
      void qc.invalidateQueries({ queryKey: key });
  }

  const exportAll = useMutation({
    mutationFn: async () => {
      const [list, assignments] = await Promise.all([
        fetchWorkoutTemplates(),
        fetchRoutineAssignments(),
      ]);
      if (list.length === 0) throw new Error("Save a routine first — there's nothing to export.");
      const backup = buildRoutineBackup(list, assignments);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return backup;
    },
    onSuccess: (backup) =>
      toast.success(
        `Exported ${backup.templates.length} routine${backup.templates.length === 1 ? "" : "s"}`,
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const backup = parseRoutineBackup(await file.text());
      const existing = new Set((templates.data ?? []).map((t) => t.name));
      const result = await importRoutineBackup(backup, existing);
      toast.success(
        `Imported ${result.templates} routine${result.templates === 1 ? "" : "s"} and ${result.schedules} schedule${result.schedules === 1 ? "" : "s"}`,
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">Back up or move your routines</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Save every routine and its weekly repeat rules to one file, then load it on another device
          or share it with a training partner.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={exportAll.isPending}
          onClick={() => exportAll.mutate()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50"
        >
          {exportAll.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          Export routines
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          Import routines
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose a routine backup file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
    </Card>
  );
}
