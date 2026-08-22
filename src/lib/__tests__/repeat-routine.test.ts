import { describe, expect, it } from "vitest";
import { describeWeekdays, sortWeekdays, toggleWeekday } from "@/lib/repeat-routine";

describe("weekly repeat helpers", () => {
  it("sorts weekdays Monday first", () => {
    expect(sortWeekdays([0, 5, 1])).toEqual([1, 5, 0]);
  });

  it("toggles a day on and off", () => {
    expect(toggleWeekday([1, 3], 5)).toEqual([1, 3, 5]);
    expect(toggleWeekday([1, 3, 5], 3)).toEqual([1, 5]);
  });

  it("describes common patterns in plain words", () => {
    expect(describeWeekdays([])).toBe("Not scheduled");
    expect(describeWeekdays([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(describeWeekdays([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(describeWeekdays([0, 6])).toBe("Weekends");
    expect(describeWeekdays([1, 3, 5])).toBe("Mon, Wed, Fri");
  });
});
