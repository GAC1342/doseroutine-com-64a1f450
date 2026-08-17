import { describe, it, expect } from "vitest";
import { reconcileRow } from "./reconcile";

type Checkin = { id: string; checked_at: string; weight_kg: number | null };
type Reminder = { id: string; user_compound_id: string; channel: string; enabled: boolean };

describe("reconcileRow", () => {
  it("replaces the optimistic row matched by identity", () => {
    const list: Checkin[] = [
      { id: "optimistic-2026-07-22", checked_at: "2026-07-22", weight_kg: 80 },
      { id: "real-1", checked_at: "2026-07-21", weight_kg: 81 },
    ];
    const server: Checkin = { id: "real-2", checked_at: "2026-07-22", weight_kg: 80 };
    const out = reconcileRow(list, server, { checked_at: "2026-07-22" });
    expect(out).toEqual([server, list[1]]);
  });

  it("dedupes rows sharing the same identity", () => {
    const list: Checkin[] = [
      { id: "optimistic", checked_at: "2026-07-22", weight_kg: 80 },
      { id: "racing-dup", checked_at: "2026-07-22", weight_kg: 80 },
      { id: "real-1", checked_at: "2026-07-21", weight_kg: 81 },
    ];
    const server: Checkin = { id: "real-2", checked_at: "2026-07-22", weight_kg: 80 };
    const out = reconcileRow(list, server, { checked_at: "2026-07-22" });
    expect(out.filter((c) => c.checked_at === "2026-07-22")).toHaveLength(1);
    expect(out[0]).toBe(server);
  });

  it("appends when no match exists", () => {
    const list: Checkin[] = [{ id: "real-1", checked_at: "2026-07-21", weight_kg: 81 }];
    const server: Checkin = { id: "real-2", checked_at: "2026-07-22", weight_kg: 80 };
    const out = reconcileRow(list, server, { checked_at: "2026-07-22" });
    expect(out).toEqual([server, list[0]]);
  });

  it("matches on multi-field identity (reminders)", () => {
    const list: Reminder[] = [
      { id: "opt", user_compound_id: "uc-a", channel: "email", enabled: true },
      { id: "r-b", user_compound_id: "uc-b", channel: "email", enabled: false },
      { id: "r-a-push", user_compound_id: "uc-a", channel: "push", enabled: true },
    ];
    const server: Reminder = {
      id: "r-a-email",
      user_compound_id: "uc-a",
      channel: "email",
      enabled: true,
    };
    const out = reconcileRow(list, server, { user_compound_id: "uc-a", channel: "email" });
    expect(out.find((r) => r.id === "opt")).toBeUndefined();
    expect(out.find((r) => r.user_compound_id === "uc-a" && r.channel === "email")).toBe(server);
    // Other identities must be untouched.
    expect(out.find((r) => r.id === "r-b")).toBeDefined();
    expect(out.find((r) => r.id === "r-a-push")).toBeDefined();
  });

  it("throws when the server row's identity fields don't match", () => {
    const list: Checkin[] = [{ id: "opt", checked_at: "2026-07-22", weight_kg: 80 }];
    const server: Checkin = { id: "real", checked_at: "2026-07-23", weight_kg: 80 };
    expect(() => reconcileRow(list, server, { checked_at: "2026-07-22" })).toThrow(
      /identity mismatch/,
    );
  });
});
