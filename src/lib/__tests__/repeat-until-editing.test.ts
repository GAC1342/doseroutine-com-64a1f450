import { describe, expect, it } from "vitest";

import { parseEndDateInput, normalizeDateKey } from "@/lib/repeat-routine";

/**
 * Regression cover for the "Repeat until" field. Typing into a native date
 * input emits partial values as "", so a blind write erased a saved end date
 * halfway through an edit.
 */
describe("repeat-until input parsing", () => {
  it("commits a complete date", () => {
    expect(parseEndDateInput("2026-09-30")).toEqual({ commit: true, value: "2026-09-30" });
  });

  it("does not touch storage while the date is still being typed", () => {
    for (const partial of ["", "2026", "2026-0", "2026-09-", "not-a-date"]) {
      expect(parseEndDateInput(partial), partial).toEqual({ commit: false, value: null });
    }
  });

  it("clears back to no end date only on an explicit clear", () => {
    expect(parseEndDateInput("", { explicitClear: true })).toEqual({ commit: true, value: null });
    expect(parseEndDateInput("2026-0", { explicitClear: true })).toEqual({
      commit: false,
      value: null,
    });
  });

  it("moves the end date forward without losing the value", () => {
    const first = parseEndDateInput("2026-09-01");
    const later = parseEndDateInput("2026-12-24");
    expect(first.value).toBe("2026-09-01");
    expect(later).toEqual({ commit: true, value: "2026-12-24" });
    expect(normalizeDateKey(later.value)).toBe("2026-12-24");
  });
});
