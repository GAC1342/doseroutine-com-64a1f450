import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX2, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAYS, formatWeekdays, type StandingRule } from "@/lib/standing-rules";

export const STANDING_RULES_KEY = ["standing-skip-rules"] as const;

type CompoundOption = { id: string; name: string };

export type StandingRulesData = {
  rules: StandingRule[];
  compounds: CompoundOption[];
};

export async function fetchStandingRules(): Promise<StandingRulesData> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return { rules: [], compounds: [] };

  const [{ data: rules, error }, { data: ucs }] = await Promise.all([
    supabase
      .from("standing_skip_rules")
      .select("id, user_compound_id, days_of_week, enabled, note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_compounds")
      .select("id, custom_name, compound:compounds(name)")
      .eq("user_id", user.id)
      .eq("active", true),
  ]);
  if (error) throw error;

  return {
    rules: (rules ?? []) as StandingRule[],
    compounds: (ucs ?? []).map((u) => ({
      id: u.id,
      name:
        (u as { compound?: { name: string } | null }).compound?.name || u.custom_name || "Compound",
    })),
  };
}

/** Shared options so Today and More show the same rules. */
export function standingRulesQueryOptions() {
  return {
    queryKey: STANDING_RULES_KEY,
    queryFn: fetchStandingRules,
    staleTime: 60_000,
    retry: 1,
  };
}

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Sundays", days: [7] },
  { label: "Weekends", days: [6, 7] },
  { label: "Mon / Wed / Fri", days: [1, 3, 5] },
];

/**
 * Standing skip rules — recurring "always skip X" policies.
 *
 * Rules remove doses from the schedule before they are ever created, so a
 * skipped weekday can't be marked missed and never dents the adherence score.
 * They apply to the whole stack or to a single compound.
 */
export function StandingRulesCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(standingRulesQueryOptions());
  const rules = data?.rules ?? [];
  const compounds = data?.compounds ?? [];

  const [adding, setAdding] = useState(false);
  const [days, setDays] = useState<number[]>([7]);
  const [scope, setScope] = useState<string>("all");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(dow: number) {
    setDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b),
    );
  }

  async function refresh() {
    // Today rebuilds its schedule on load, so a broad invalidate makes the
    // skipped days disappear (or come back) everywhere at once.
    await qc.invalidateQueries();
  }

  async function addRule() {
    if (!days.length) {
      setError("Pick at least one day.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      setBusy(false);
      setError("You need to be signed in.");
      return;
    }
    const { error: err } = await supabase.from("standing_skip_rules").insert({
      user_id: user.id,
      user_compound_id: scope === "all" ? null : scope,
      days_of_week: days,
      note: note.trim() || null,
    });
    setBusy(false);
    if (err) {
      console.error("Failed to add standing rule", err);
      setError("Couldn't save that rule. Try again.");
      return;
    }
    setAdding(false);
    setDays([7]);
    setScope("all");
    setNote("");
    await refresh();
  }

  async function setEnabled(rule: StandingRule, enabled: boolean) {
    setBusy(true);
    const { error: err } = await supabase
      .from("standing_skip_rules")
      .update({ enabled })
      .eq("id", rule.id);
    setBusy(false);
    if (err) {
      console.error("Failed to toggle standing rule", err);
      setError("Couldn't update that rule.");
      return;
    }
    await refresh();
  }

  async function remove(rule: StandingRule) {
    setBusy(true);
    const { error: err } = await supabase.from("standing_skip_rules").delete().eq("id", rule.id);
    setBusy(false);
    if (err) {
      console.error("Failed to delete standing rule", err);
      setError("Couldn't delete that rule.");
      return;
    }
    await refresh();
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Loading standing rules…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4" aria-label="Standing skip rules">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-muted p-2 text-muted-foreground">
          <CalendarX2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Standing rules</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recurring skips like “always skip Sundays”. Skipped days never count as missed and won't
            touch your adherence score.
          </p>

          {rules.length ? (
            <ul className="mt-3 space-y-2">
              {rules.map((r) => {
                const name = r.user_compound_id
                  ? (compounds.find((c) => c.id === r.user_compound_id)?.name ?? "One compound")
                  : "Whole stack";
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium ${
                          r.enabled ? "text-foreground" : "text-muted-foreground line-through"
                        }`}
                      >
                        Skip {formatWeekdays(r.days_of_week)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {name}
                        {r.note ? ` · ${r.note}` : ""}
                      </p>
                    </div>
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        disabled={busy}
                        onChange={(e) => void setEnabled(r, e.target.checked)}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        aria-label={`Enable rule: skip ${formatWeekdays(r.days_of_week)}`}
                      />
                      On
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(r)}
                      aria-label={`Delete rule: skip ${formatWeekdays(r.days_of_week)}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-destructive disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {adding ? (
            <div className="mt-3 space-y-3 rounded-xl bg-muted/50 p-3">
              <div>
                <p className="text-xs font-medium text-foreground">Skip these days</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((w) => {
                    const on = days.includes(w.dow);
                    return (
                      <button
                        key={w.dow}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDay(w.dow)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:bg-background"
                        }`}
                      >
                        {w.short}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setDays(p.days)}
                      className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-background"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs text-muted-foreground">
                Applies to
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                >
                  <option value="all">My whole stack</option>
                  {compounds.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <input
                type="text"
                value={note}
                maxLength={60}
                placeholder="Note (optional) — e.g. Rest day"
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addRule()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save rule
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAdding(false);
                    setError(null);
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              {rules.length ? "Add another rule" : "Add a standing rule"}
            </button>
          )}

          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
