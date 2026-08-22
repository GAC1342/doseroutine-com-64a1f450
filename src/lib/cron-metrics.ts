// Lightweight instrumentation for the reminder cron jobs.
//
// Two things we want to be able to prove at any time:
//   1. DB query counts stay flat (batched round trips, not per-user loops).
//   2. Delivery volume stays low (the daily buzz budget is actually holding).
//
// Usage inside a cron handler:
//
//   const metrics = createRunMetrics('send-reminders')
//   const db = instrumentSupabase(supabaseAdmin, metrics)   // use `db` for all reads
//   ...
//   metrics.delivered({ push: 3, email: 1 })
//   await metrics.finish(supabaseAdmin)   // writes cron_run_metrics + logs a JSON line

export type JobBudget = {
  /** Hard ceiling on DB round trips for one run. */
  maxQueries: number;
  /** Hard ceiling on outbound alerts (push + email) for one run. */
  maxDeliveries: number;
};

export const JOB_BUDGETS: Record<string, JobBudget> = {
  "send-reminders": { maxQueries: 12, maxDeliveries: 200 },
  "send-routine-reminders": { maxQueries: 12, maxDeliveries: 200 },
};

export const DEFAULT_BUDGET: JobBudget = { maxQueries: 20, maxDeliveries: 500 };

export type RunMetrics = {
  job: string;
  startedAt: Date;
  countQuery: (table: string, rows?: number) => void;
  countRows: (table: string, rows: number) => void;
  setContext: (patch: { usersScanned?: number; candidates?: number }) => void;
  delivered: (patch: {
    push?: number;
    email?: number;
    inbox?: number;
    skipped?: number;
    capped?: number;
    errors?: number;
  }) => void;
  snapshot: () => RunSnapshot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  finish: (client?: any) => Promise<RunSnapshot>;
};

export type RunSnapshot = {
  job: string;
  started_at: string;
  duration_ms: number;
  db_queries: number;
  db_rows_read: number;
  query_breakdown: Record<string, number>;
  users_scanned: number;
  candidates: number;
  push_sent: number;
  email_sent: number;
  inbox_queued: number;
  skipped: number;
  capped: number;
  errors: number;
  over_budget: boolean;
  budget_note: string | null;
};

export function evaluateBudget(
  job: string,
  queries: number,
  deliveries: number,
): { overBudget: boolean; note: string | null } {
  const budget = JOB_BUDGETS[job] ?? DEFAULT_BUDGET;
  const notes: string[] = [];
  if (queries > budget.maxQueries) {
    notes.push(`db_queries ${queries} > budget ${budget.maxQueries}`);
  }
  if (deliveries > budget.maxDeliveries) {
    notes.push(`deliveries ${deliveries} > budget ${budget.maxDeliveries}`);
  }
  return { overBudget: notes.length > 0, note: notes.length ? notes.join("; ") : null };
}

export function createRunMetrics(job: string, now: Date = new Date()): RunMetrics {
  const breakdown: Record<string, number> = {};
  let queries = 0;
  let rowsRead = 0;
  let usersScanned = 0;
  let candidates = 0;
  let push = 0;
  let email = 0;
  let inbox = 0;
  let skipped = 0;
  let capped = 0;
  let errors = 0;

  const countQuery = (table: string, rows = 0) => {
    queries++;
    breakdown[table] = (breakdown[table] ?? 0) + 1;
    if (rows) rowsRead += rows;
  };

  const snapshot = (): RunSnapshot => {
    const { overBudget, note } = evaluateBudget(job, queries, push + email);
    return {
      job,
      started_at: now.toISOString(),
      duration_ms: Math.max(0, Date.now() - now.getTime()),
      db_queries: queries,
      db_rows_read: rowsRead,
      query_breakdown: breakdown,
      users_scanned: usersScanned,
      candidates,
      push_sent: push,
      email_sent: email,
      inbox_queued: inbox,
      skipped,
      capped,
      errors,
      over_budget: overBudget,
      budget_note: note,
    };
  };

  return {
    job,
    startedAt: now,
    countQuery,
    countRows: (table, rows) => {
      rowsRead += rows;
      if (!(table in breakdown)) breakdown[table] = breakdown[table] ?? 0;
    },
    setContext: (patch) => {
      if (patch.usersScanned != null) usersScanned = patch.usersScanned;
      if (patch.candidates != null) candidates = patch.candidates;
    },
    delivered: (patch) => {
      push += patch.push ?? 0;
      email += patch.email ?? 0;
      inbox += patch.inbox ?? 0;
      skipped += patch.skipped ?? 0;
      capped += patch.capped ?? 0;
      errors += patch.errors ?? 0;
    },
    snapshot,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    finish: async (client?: any) => {
      const snap = snapshot();
      // Always leave a structured line in the function logs, even if the
      // metrics insert fails — logs are the fallback record.
      console.log(`[cron-metrics] ${JSON.stringify(snap)}`);
      if (snap.over_budget) {
        console.warn(`[cron-metrics] ${job} OVER BUDGET: ${snap.budget_note}`);
      }
      if (client) {
        try {
          const { error } = await client.from("cron_run_metrics").insert(snap);
          if (error) console.error("[cron-metrics] insert failed", error.message);
        } catch (err) {
          console.error("[cron-metrics] insert threw", err);
        }
      }
      return snap;
    },
  };
}

/**
 * Wraps a Supabase client so every `.from(table)` round trip and
 * `auth.admin.listUsers` page is counted, along with the rows it returned.
 * Read-only wrapper: it never changes query behavior.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
export function instrumentSupabase<T extends { from: (table: string) => any }>(
  client: T,
  metrics: RunMetrics,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const wrapBuilder = (builder: any, table: string): any =>
    new Proxy(builder, {
      get(target, prop, receiver) {
        if (prop === "then") {
          const then = Reflect.get(target, prop, receiver);
          if (typeof then !== "function") return then;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
          return (onFulfilled: any, onRejected: any) =>
            then.call(
              target,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
              (res: any) => {
                metrics.countQuery(table, Array.isArray(res?.data) ? res.data.length : 0);
                return onFulfilled ? onFulfilled(res) : res;
              },
              onRejected,
            );
        }
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
          return (...args: any[]) => {
            const result = value.apply(target, args);
            if (result && result === target) return receiver;
            if (result && typeof result === "object" && typeof result.then === "function") {
              return wrapBuilder(result, table);
            }
            return result;
          };
        }
        return value;
      },
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  return new Proxy(client as any, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (table: string) => wrapBuilder(target.from(table), table);
      }
      if (prop === "auth") {
        const auth = Reflect.get(target, prop, receiver);
        return new Proxy(auth, {
          get(authTarget, authProp) {
            if (authProp !== "admin") return Reflect.get(authTarget, authProp);
            const admin = Reflect.get(authTarget, authProp);
            return new Proxy(admin, {
              get(adminTarget, adminProp) {
                const fn = Reflect.get(adminTarget, adminProp);
                if (adminProp !== "listUsers" || typeof fn !== "function") return fn;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
                return async (...args: any[]) => {
                  const res = await fn.apply(adminTarget, args);
                  metrics.countQuery("auth.users", res?.data?.users?.length ?? 0);
                  return res;
                };
              },
            });
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as T;
}
