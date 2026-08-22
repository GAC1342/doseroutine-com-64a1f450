import { describe, it, expect, vi } from "vitest";
import { createRunMetrics, evaluateBudget, instrumentSupabase } from "@/lib/cron-metrics";
import { summarizeRuns, type CronRunRow } from "@/lib/cron-metrics.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
function fakeClient(rowsByTable: Record<string, any[]>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const inserted: any[] = [];
  const make = (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const builder: any = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
      then: (res: any, rej: any) =>
        Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(res, rej),
    };
    for (const m of ["select", "eq", "in", "gte", "lte", "not", "order", "limit", "delete"]) {
      builder[m] = () => builder;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    builder.insert = (row: any) => {
      inserted.push({ table, row });
      return builder;
    };
    return builder;
  };
  return { client: { from: (t: string) => make(t) }, inserted };
}

describe("cron metrics instrumentation", () => {
  it("counts one query per awaited round trip and the rows it read", async () => {
    const metrics = createRunMetrics("send-reminders");
    const { client } = fakeClient({
      profiles: [{ id: "a" }, { id: "b" }],
      reminders: [{ id: "r" }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const db = instrumentSupabase(client as any, metrics);

    await db.from("reminders").select("id").eq("enabled", true);
    await db.from("profiles").select("id").in("id", ["a", "b"]);

    const snap = metrics.snapshot();
    expect(snap.db_queries).toBe(2);
    expect(snap.db_rows_read).toBe(3);
    expect(snap.query_breakdown).toEqual({ reminders: 1, profiles: 1 });
  });

  it("does not double count chained filters", async () => {
    const metrics = createRunMetrics("send-routine-reminders");
    const { client } = fakeClient({ workout_sessions: [{ id: 1 }] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const db = instrumentSupabase(client as any, metrics);
    await db
      .from("workout_sessions")
      .select("id")
      .eq("active", true)
      .not("planned_time", "is", null);
    expect(metrics.snapshot().db_queries).toBe(1);
  });

  it("aggregates delivery volume and writes a run row", async () => {
    const metrics = createRunMetrics("send-reminders");
    metrics.setContext({ usersScanned: 4, candidates: 9 });
    metrics.delivered({ push: 2, email: 1, inbox: 3, skipped: 1, capped: 2, errors: 0 });
    const { client, inserted } = fakeClient({});
    vi.spyOn(console, "log").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const snap = await metrics.finish(client as any);
    expect(snap.push_sent).toBe(2);
    expect(snap.email_sent).toBe(1);
    expect(snap.inbox_queued).toBe(3);
    expect(snap.capped).toBe(2);
    expect(snap.users_scanned).toBe(4);
    expect(snap.candidates).toBe(9);
    expect(inserted[0].table).toBe("cron_run_metrics");
    expect(snap.over_budget).toBe(false);
  });

  it("flags runs that exceed the query or delivery budget", () => {
    expect(evaluateBudget("send-reminders", 5, 10).overBudget).toBe(false);
    const over = evaluateBudget("send-reminders", 99, 10);
    expect(over.overBudget).toBe(true);
    expect(over.note).toContain("db_queries 99");
    expect(evaluateBudget("send-reminders", 5, 9999).note).toContain("deliveries");
  });
});

describe("summarizeRuns", () => {
  const base: CronRunRow = {
    id: "1",
    job: "send-reminders",
    started_at: new Date().toISOString(),
    duration_ms: 100,
    db_queries: 6,
    db_rows_read: 10,
    query_breakdown: {},
    users_scanned: 1,
    candidates: 1,
    push_sent: 1,
    email_sent: 1,
    inbox_queued: 1,
    skipped: 0,
    capped: 0,
    errors: 0,
    over_budget: false,
    budget_note: null,
  };

  it("rolls up per job with budgets and breach counts", () => {
    const out = summarizeRuns([
      base,
      { ...base, id: "2", db_queries: 10, over_budget: true, errors: 1 },
      { ...base, id: "3", job: "send-routine-reminders", db_queries: 4 },
    ]);
    const dose = out.find((s) => s.job === "send-reminders")!;
    expect(dose.runs).toBe(2);
    expect(dose.avgQueries).toBe(8);
    expect(dose.maxQueries).toBe(10);
    expect(dose.deliveries).toBe(4);
    expect(dose.overBudgetRuns).toBe(1);
    expect(dose.errors).toBe(1);
    expect(dose.queryBudget).toBeGreaterThan(0);
    expect(out).toHaveLength(2);
  });
});
