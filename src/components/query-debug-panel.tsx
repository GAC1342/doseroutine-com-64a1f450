import { useEffect, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { X } from "lucide-react";

const TRACKED: { label: string; key: QueryKey }[] = [
  { label: "interaction_rules", key: ["interaction_rules"] },
  { label: "compounds", key: ["compounds", "all"] },
  { label: "plan", key: ["plan", "latest"] },
];

function isDebugEnabled() {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("debug") === "1") {
    try {
      window.localStorage.setItem("doseroutine_debug", "1");
    } catch {
      // Non-critical: safe to ignore.
    }
    return true;
  }
  try {
    return window.localStorage.getItem("doseroutine_debug") === "1";
  } catch {
    return false;
  }
}

function fmtAge(ms: number | null) {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export function QueryDebugPanel() {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setEnabled(isDebugEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const unsub = qc.getQueryCache().subscribe(() => setTick((t) => t + 1));
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [qc, enabled]);

  if (!enabled) return null;

  const now = Date.now();
  const rows = TRACKED.map(({ label, key }) => {
    const q = qc.getQueryCache().find({ queryKey: key });
    if (!q)
      return { label, status: "miss", age: null as number | null, state: "—", fetching: false };
    const s = q.state;
    const updatedAt = s.dataUpdatedAt || null;
    return {
      label,
      status: s.data !== undefined ? "hit" : s.status,
      age: updatedAt ? now - updatedAt : null,
      state: s.status,
      fetching: s.fetchStatus === "fetching",
    };
  });

  const dismiss = () => {
    try {
      window.localStorage.removeItem("doseroutine_debug");
    } catch {
      // Non-critical: safe to ignore.
    }
    setEnabled(false);
  };

  return (
    <div
      className="fixed bottom-20 right-3 z-[60] w-[260px] rounded-lg border border-border bg-background/95 p-3 text-xs shadow-lg backdrop-blur md:bottom-3"
      role="status"
      aria-label="Query cache debug panel"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Query cache</span>
        <button
          type="button"
          onClick={dismiss}
          className="rounded p-1 hover:bg-muted"
          aria-label="Dismiss debug panel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2">
            <span className="truncate font-mono">{r.label}</span>
            <span className="flex items-center gap-1.5">
              <span
                className={
                  "rounded px-1.5 py-0.5 text-[10px] font-medium " +
                  (r.status === "hit"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : r.status === "miss"
                      ? "bg-muted text-muted-foreground"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400")
                }
              >
                {r.fetching ? "fetching" : r.status}
              </span>
              <span className="text-muted-foreground tabular-nums">{fmtAge(r.age)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Toggle: <code>?debug=1</code>
      </p>
    </div>
  );
}
