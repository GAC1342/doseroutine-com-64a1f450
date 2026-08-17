import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTabViewState } from "@/lib/tab-view-state";
import { getEffectiveDoseStatus } from "@/lib/dose-status";
import { monthKeyInZone, monthRangeInZone } from "@/lib/local-calendar";

// Shape of persisted timeline view state. Keep in sync with timeline.tsx.
type TimelineView = { monthKey: string; calFilter: "all" | "taken" | "missed" | "skipped" };

type PrefetchFn = (qc: QueryClient) => Promise<unknown> | void;

/**
 * Per-tab data prefetchers. Each entry primes the same queryKey/queryFn used
 * by the tab's components, so opening the tab reads from cache instead of
 * waiting on a round trip. Cheap tabs (e.g. /more, /library) are omitted.
 *
 * Keep queryKeys and staleTimes in sync with the consuming components.
 */
export const TAB_PREFETCHERS: Record<string, PrefetchFn[]> = {
  "/today": [
    (qc) =>
      qc.prefetchQuery({
        queryKey: ["today-page-warm"],
        staleTime: 30_000,
        queryFn: async () => {
          // Light touch — just warm the row count. The real fetch on mount
          // will still run but returns fast because Postgres has the rows hot.
          // Do not write to ["today-page"] here: returning null under the real
          // page key makes Today look empty after tab navigation.
          await supabase.from("schedule_events").select("id").limit(1);
          return null;
        },
      }),
  ],
  "/stack": [
    (qc) =>
      qc.prefetchQuery({
        queryKey: ["user_compounds"],
        staleTime: 60_000,
        queryFn: async () => {
          const { data } = await supabase
            .from("user_compounds")
            .select("*, compound:compounds(*)")
            .order("created_at", { ascending: false });
          return data ?? [];
        },
      }),
    (qc) => prefetchInteractionRules(qc),
    (qc) => prefetchCompoundLibrary(qc),
  ],
  "/safety": [
    (qc) =>
      qc.prefetchQuery({
        queryKey: ["user-compounds"],
        staleTime: 60_000,
        queryFn: async () => {
          const { data } = await supabase.from("user_compounds").select("*, compound:compounds(*)");
          return data ?? [];
        },
      }),
    (qc) =>
      qc.prefetchQuery({
        queryKey: ["interaction-rules"],
        staleTime: 30 * 60_000,
        queryFn: async () => {
          const { data } = await supabase.from("interaction_rules").select("*");
          return data ?? [];
        },
      }),
  ],
  "/plan": [
    (qc) =>
      qc.prefetchQuery({
        queryKey: ["plan", "latest"],
        staleTime: 5 * 60_000,
        queryFn: async () => {
          const { data: userRes } = await supabase.auth.getUser();
          if (!userRes.user) return null;
          const { data } = await supabase
            .from("plans")
            .select("plan_json, generated_at, goal")
            .eq("user_id", userRes.user.id)
            .order("generated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return data ?? null;
        },
      }),
  ],
  // Timeline persists which month + filter the user was last viewing (see
  // tab-view-state). Prefetch that exact variant so switching back is
  // instant, plus the current month as a fallback for first-run users.
  "/timeline": [
    async (qc) => {
      const { data: userRes } = await supabase.auth.getUser();
      let zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      if (userRes.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("timezone")
          .eq("id", userRes.user.id)
          .maybeSingle();
        zone = profile?.timezone || zone;
      }
      const currentMonth = monthKeyInZone(new Date(), zone);
      const view = getTabViewState<TimelineView>("/timeline", {
        monthKey: currentMonth,
        calFilter: "all",
      });
      const months = new Set<string>([view.monthKey, currentMonth]);
      const jobs: Array<Promise<unknown>> = [];
      for (const monthKey of months) {
        const range = monthRangeInZone(monthKey, zone);
        if (!range) continue;
        jobs.push(
          qc.prefetchQuery({
            queryKey: ["timeline-month", monthKey, zone],
            staleTime: 60_000,
            queryFn: async () => {
              const { data } = await supabase
                .from("schedule_events")
                .select(
                  "id, scheduled_at, status, note, user_compound:user_compounds(custom_name, dose_amount, dose_unit, compound:compounds(name))",
                )
                .gte("scheduled_at", range.start.toISOString())
                .lt("scheduled_at", range.end.toISOString())
                .order("scheduled_at", { ascending: true })
                .limit(2000);
              return ((data ?? []) as any[]).map((ev) => {
                const uc = ev.user_compound;
                const name = uc?.custom_name || uc?.compound?.name || "Compound";
                const dose = uc?.dose_amount
                  ? `${uc.dose_amount}${uc.dose_unit ? " " + uc.dose_unit : ""}`
                  : "";
                return {
                  id: ev.id,
                  scheduled_at: ev.scheduled_at,
                  status: getEffectiveDoseStatus(ev.status, ev.scheduled_at),
                  name,
                  dose,
                  note: ev.note ?? null,
                };
              });
            },
          }),
        );
      }
      return Promise.all(jobs);
    },
  ],
};

function prefetchInteractionRules(qc: QueryClient) {
  return qc.prefetchQuery({
    queryKey: ["interaction_rules"],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("interaction_rules").select("*");
      return data ?? [];
    },
  });
}

function prefetchCompoundLibrary(qc: QueryClient) {
  return qc.prefetchQuery({
    queryKey: ["compounds", "all"],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("compounds").select("*").order("category").order("name");
      return data ?? [];
    },
  });
}

type NetworkInformation = {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | "5g";
  saveData?: boolean;
  type?: "bluetooth" | "cellular" | "ethernet" | "none" | "wifi" | "wimax" | "other" | "unknown";
  downlink?: number;
};

/**
 * Returns true when the network is fast enough to spend bytes on speculative
 * prefetch. We refuse when:
 *  - Data Saver is on (respect user intent)
 *  - effectiveType is 2g/slow-2g/3g (round trips too costly)
 *  - downlink is reported below 1.5 Mbps
 * Wi-Fi and unknown connections are treated as fast (desktop browsers and
 * mobile Safari don't expose navigator.connection, so we default to on).
 */
export function shouldPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!conn) return true; // API unavailable (Safari, Firefox) — assume fast
  if (conn.saveData) return false;
  if (conn.type === "wifi" || conn.type === "ethernet") return true;
  const eff = conn.effectiveType;
  if (eff === "slow-2g" || eff === "2g" || eff === "3g") return false;
  if (typeof conn.downlink === "number" && conn.downlink > 0 && conn.downlink < 1.5) return false;
  return true;
}

/**
 * Subscribe to connection changes. Fires immediately with the current value
 * and again whenever effectiveType/saveData flips. Returns an unsubscribe.
 */
export function onConnectionChange(cb: (fast: boolean) => void): () => void {
  if (typeof navigator === "undefined") return () => {};
  cb(shouldPrefetch());
  const conn = (
    navigator as Navigator & {
      connection?: NetworkInformation & {
        addEventListener?: (t: string, cb: () => void) => void;
        removeEventListener?: (t: string, cb: () => void) => void;
      };
    }
  ).connection;
  if (!conn || typeof conn.addEventListener !== "function") return () => {};
  const handler = () => cb(shouldPrefetch());
  conn.addEventListener("change", handler);
  return () => conn.removeEventListener?.("change", handler);
}

/**
 * Fire prefetchers for a target tab path. Non-blocking — errors are
 * swallowed because prefetch is best-effort. Skipped on slow networks
 * unless `force: true` (e.g. the user actually navigated to that tab).
 */
export function prefetchTab(qc: QueryClient, to: string, opts: { force?: boolean } = {}) {
  if (!opts.force && !shouldPrefetch()) return;
  const fns = TAB_PREFETCHERS[to];
  if (!fns) return;
  for (const fn of fns) {
    try {
      const p = fn(qc);
      if (p && typeof (p as Promise<unknown>).catch === "function") {
        (p as Promise<unknown>).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

/** Prefetch every primary tab's data. Called once when the shell mounts. */
export function prefetchAllTabs(qc: QueryClient) {
  if (!shouldPrefetch()) return;
  for (const to of Object.keys(TAB_PREFETCHERS)) prefetchTab(qc, to);
}
