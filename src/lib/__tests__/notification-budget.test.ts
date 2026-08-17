import { describe, expect, it } from "vitest";
import {
  applyDailyBudget,
  CAP_STATUS,
  countsTowardBudget,
  DEFAULT_DAILY_ALERT_LIMIT,
  localDayKey,
  resolveDailyLimit,
  usedBudget,
  type BudgetCandidate,
} from "../notification-budget";

function c(
  category: "dose" | "workout" | "meal",
  id: string,
  time?: string,
): BudgetCandidate<string> {
  return { category, id, time, payload: id };
}

describe("resolveDailyLimit", () => {
  it("defaults to 3 when unset", () => {
    expect(resolveDailyLimit(null)).toBe(DEFAULT_DAILY_ALERT_LIMIT);
    expect(resolveDailyLimit(undefined)).toBe(3);
  });
  it("treats 0 or negative as unlimited", () => {
    expect(resolveDailyLimit(0)).toBe(Infinity);
    expect(resolveDailyLimit(-1)).toBe(Infinity);
  });
  it("honours an explicit higher limit", () => {
    expect(resolveDailyLimit(10)).toBe(10);
  });
});

describe("applyDailyBudget", () => {
  it("caps at three alerts a day by default", () => {
    const { allowed, capped } = applyDailyBudget(
      [
        c("dose", "a", "08:00"),
        c("dose", "b", "12:00"),
        c("dose", "c", "18:00"),
        c("dose", "d", "20:00"),
      ],
      0,
      3,
    );
    expect(allowed.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(capped.map((x) => x.id)).toEqual(["d"]);
  });

  it("subtracts alerts already sent earlier in the day", () => {
    const { allowed, capped } = applyDailyBudget([c("dose", "a"), c("dose", "b")], 2, 3);
    expect(allowed).toHaveLength(1);
    expect(capped).toHaveLength(1);
  });

  it("sends nothing once the budget is spent", () => {
    const { allowed, capped } = applyDailyBudget([c("dose", "a")], 3, 3);
    expect(allowed).toHaveLength(0);
    expect(capped).toHaveLength(1);
  });

  it("prioritises doses over workouts over meals", () => {
    const { allowed, capped } = applyDailyBudget(
      [
        c("meal", "m", "08:00"),
        c("workout", "w", "07:00"),
        c("dose", "d", "09:00"),
        c("meal", "m2", "07:30"),
      ],
      0,
      2,
    );
    expect(allowed.map((x) => x.id)).toEqual(["d", "w"]);
    expect(capped.map((x) => x.id)).toEqual(["m2", "m"]);
  });

  it("breaks ties on earliest scheduled time, then id", () => {
    const { allowed } = applyDailyBudget(
      [c("dose", "late", "22:00"), c("dose", "early", "06:00")],
      0,
      1,
    );
    expect(allowed[0].id).toBe("early");
  });

  it("sends everything when the cap is switched off", () => {
    const { allowed, capped } = applyDailyBudget(
      [c("dose", "a"), c("meal", "b"), c("workout", "c"), c("dose", "d")],
      99,
      Infinity,
    );
    expect(allowed).toHaveLength(4);
    expect(capped).toHaveLength(0);
  });

  it("never drops a candidate — allowed + capped is the full set", () => {
    const input = [c("dose", "a"), c("workout", "b"), c("meal", "c")];
    const { allowed, capped } = applyDailyBudget(input, 1, 2);
    expect(allowed.length + capped.length).toBe(input.length);
  });
});

describe("countsTowardBudget", () => {
  it("counts delivered push and email", () => {
    expect(countsTowardBudget({ channel: "push", status: "sent" })).toBe(true);
    expect(countsTowardBudget({ channel: "email", status: null })).toBe(true);
  });
  it("ignores inbox mirrors", () => {
    expect(countsTowardBudget({ channel: "inbox", status: "sent" })).toBe(false);
  });
  it("ignores previously capped rows so a cap cannot eat its own slot", () => {
    expect(countsTowardBudget({ channel: "push", status: CAP_STATUS })).toBe(false);
  });
  it("ignores failed sends", () => {
    expect(countsTowardBudget({ channel: "push", status: "error:all-endpoints-failed" })).toBe(
      false,
    );
  });
  it("sums only the qualifying rows", () => {
    expect(
      usedBudget([
        { key: "e1", channel: "push", status: "sent" },
        { key: "e1", channel: "inbox", status: "sent" },
        { key: "e2", channel: "email", status: "sent" },
        { key: "e3", channel: "push", status: CAP_STATUS },
      ]),
    ).toBe(2);
  });
  it("counts one announcement once even when it went out on two channels", () => {
    expect(
      usedBudget([
        { key: "e1", channel: "push", status: "sent" },
        { key: "e1", channel: "email", status: "sent" },
      ]),
    ).toBe(1);
  });
});

describe("localDayKey", () => {
  it("uses the user's timezone, not UTC", () => {
    const now = new Date("2026-08-01T03:30:00Z");
    expect(localDayKey(now, "America/Edmonton")).toBe("2026-07-31");
    expect(localDayKey(now, "UTC")).toBe("2026-08-01");
  });
});
