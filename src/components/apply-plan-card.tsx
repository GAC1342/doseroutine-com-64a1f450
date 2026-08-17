import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { applyPlanToStack, getPlanApplyPreview, revertPlanApply } from "@/lib/apply-plan.functions";

/**
 * Turns the Plan page from advisory-only into something that actually moves
 * the user's schedule: applies the generated block times to `user_compounds`
 * (which Today / Stack / Timeline read), with an undo and a full reset.
 */
export function ApplyPlanCard({ planKey }: { planKey: string | null }) {
  const preview = useServerFn(getPlanApplyPreview);
  const apply = useServerFn(applyPlanToStack);
  const revert = useServerFn(revertPlanApply);
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState<null | "apply" | "previous" | "original">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["plan", "apply-preview", planKey],
    queryFn: () => preview({}),
    staleTime: 0,
  });

  async function refresh() {
    // Today, Stack and Timeline all read user_compounds — refresh everything.
    await queryClient.invalidateQueries();
    await refetch();
  }

  async function onApply() {
    setBusy("apply");
    setError(null);
    setMessage(null);
    try {
      const res = await apply({});
      setMessage(
        res.applied === 0
          ? "Your stack already matches this plan — nothing to change."
          : `Updated ${res.applied} ${res.applied === 1 ? "compound" : "compounds"}. Check Today and your calendar.`,
      );
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Could not apply the plan.");
    } finally {
      setBusy(null);
    }
  }

  async function onRevert(kind: "previous" | "original") {
    setBusy(kind);
    setError(null);
    setMessage(null);
    try {
      const res = await revert({ data: { kind } });
      setMessage(
        kind === "previous"
          ? `Restored the schedule you had before the last apply (${res.restored} compounds).`
          : `Reset to your original times (${res.restored} compounds).`,
      );
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Could not restore your schedule.");
    } finally {
      setBusy(null);
    }
  }

  const changes = data?.changes ?? [];
  const hasPrevious = (data?.snapshots ?? []).some((s) => s.kind === "previous");
  const hasOriginal = (data?.snapshots ?? []).some((s) => s.kind === "original");

  return (
    <Card className="rounded-2xl border-border p-4">
      <h2 className="text-sm font-semibold">Apply this schedule to my stack</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        This rewrites the times on your compounds so Today, Stack and your calendar follow the plan.
        Anything the plan didn&apos;t place is left exactly as it is.
      </p>

      {isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking what would change…
        </div>
      ) : changes.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Your stack already matches this plan — nothing would change.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 rounded-xl bg-muted/50 p-3 text-xs">
          {changes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{c.name}:</span>
              <span className="text-muted-foreground tabular-nums line-through">
                {c.from.length ? c.from.join(", ") : "no time set"}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold tabular-nums">{c.to.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onApply}
          disabled={busy !== null || changes.length === 0}
          className="tap-target inline-flex items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy === "apply" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarCheck className="h-4 w-4" />
          )}
          Apply to my stack
        </button>

        {hasPrevious && (
          <button
            onClick={() => onRevert("previous")}
            disabled={busy !== null}
            className="tap-target inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            {busy === "previous" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Undo2 className="h-3.5 w-3.5" />
            )}
            Undo — restore previous schedule
          </button>
        )}

        {hasOriginal && (
          <button
            onClick={() => onRevert("original")}
            disabled={busy !== null}
            className="tap-target inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            {busy === "original" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Reset to my original times
          </button>
        )}
      </div>

      {message && <p className="mt-3 text-xs font-medium">{message}</p>}
      {error && (
        <p className="mt-3 text-xs font-medium text-[color:var(--severity-avoid)]">
          {error}
        </p>
      )}
    </Card>
  );
}
