import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { JOB_BUDGETS, DEFAULT_BUDGET } from "@/lib/cron-metrics";

export type CronRunRow = {
  id: string;
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

export type CronJobSummary = {
  job: string;
  runs: number;
  avgQueries: number;
  maxQueries: number;
  queryBudget: number;
  deliveries: number;
  deliveryBudget: number;
  avgDurationMs: number;
  errors: number;
  overBudgetRuns: number;
};

export function summarizeRuns(rows: CronRunRow[]): CronJobSummary[] {
  const byJob = new Map<string, CronRunRow[]>();
  for (const r of rows) {
    const list = byJob.get(r.job) ?? [];
    list.push(r);
    byJob.set(r.job, list);
  }
  return Array.from(byJob.entries())
    .map(([job, list]) => {
      const budget = JOB_BUDGETS[job] ?? DEFAULT_BUDGET;
      const total = (pick: (r: CronRunRow) => number) =>
        list.reduce((sum, r) => sum + (pick(r) || 0), 0);
      return {
        job,
        runs: list.length,
        avgQueries: Math.round((total((r) => r.db_queries) / list.length) * 10) / 10,
        maxQueries: Math.max(...list.map((r) => r.db_queries || 0)),
        queryBudget: budget.maxQueries,
        deliveries: total((r) => r.push_sent) + total((r) => r.email_sent),
        deliveryBudget: budget.maxDeliveries,
        avgDurationMs: Math.round(total((r) => r.duration_ms) / list.length),
        errors: total((r) => r.errors),
        overBudgetRuns: list.filter((r) => r.over_budget).length,
      };
    })
    .sort((a, b) => a.job.localeCompare(b.job));
}

/** Admin-only: recent cron runs plus a 24h/7d rollup per job. */
export const listCronRunMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        hours: z.number().int().min(1).max(720).default(24),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("cron_run_metrics")
      .select("*")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;

    const typed = (rows ?? []) as unknown as CronRunRow[];
    return { rows: typed, summary: summarizeRuns(typed), hours: data.hours };
  });
