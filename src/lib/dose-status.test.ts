import { describe, expect, it } from "vitest";
import { getEffectiveDoseStatus, isDosePastMissedWindow } from "./dose-status";

describe("dose missed window", () => {
  const now = new Date("2026-07-25T20:06:00.000Z");

  it("turns a pending dose into missed after 60 minutes", () => {
    expect(getEffectiveDoseStatus("pending", "2026-07-25T18:00:00.000Z", now)).toBe("missed");
  });

  it("keeps a recent pending dose pending inside the 60-minute window", () => {
    expect(getEffectiveDoseStatus("pending", "2026-07-25T19:30:00.000Z", now)).toBe("pending");
  });

  it("does not override taken, skipped, or already missed doses", () => {
    expect(getEffectiveDoseStatus("taken", "2026-07-25T18:00:00.000Z", now)).toBe("taken");
    expect(getEffectiveDoseStatus("skipped", "2026-07-25T18:00:00.000Z", now)).toBe("skipped");
    expect(getEffectiveDoseStatus("missed", "2026-07-25T18:00:00.000Z", now)).toBe("missed");
  });

  it("uses the same threshold helper for backend and UI logic", () => {
    expect(isDosePastMissedWindow("2026-07-25T18:00:00.000Z", now)).toBe(true);
    expect(isDosePastMissedWindow("2026-07-25T19:30:00.000Z", now)).toBe(false);
  });
});
