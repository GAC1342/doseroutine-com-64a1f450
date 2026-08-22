import { describe, expect, it } from "vitest";
import {
  buildDayMarkers,
  familyForSessionKind,
  hasAnything,
  markersForCalendarDay,
  MAX_DOTS,
} from "@/lib/calendar-day-markers";

describe("buildDayMarkers", () => {
  it("returns an empty marker set for a day with nothing on it", () => {
    const m = buildDayMarkers({});
    expect(m.dots).toHaveLength(0);
    expect(m.total).toBe(0);
    expect(hasAnything(m)).toBe(false);
  });

  it("lights up a day that only has scheduled work (the bug users hit)", () => {
    const m = buildDayMarkers({ scheduledFamilies: ["strength"] });
    expect(m.total).toBe(1);
    expect(m.dots[0]).toEqual({ family: "strength", kind: "scheduled" });
    expect(m.label).toContain("1 scheduled");
  });

  it("puts logged work first, then scheduled, then meals", () => {
    const m = buildDayMarkers({
      loggedFamilies: ["cardio"],
      scheduledFamilies: ["strength"],
      mealCount: 1,
    });
    expect(m.dots.map((d) => d.kind)).toEqual(["logged", "scheduled", "meal"]);
    expect(m.label).toBe("1 workout logged, 1 scheduled, 1 meal");
  });

  it("caps dots at three and reports the remainder as overflow", () => {
    const m = buildDayMarkers({
      loggedFamilies: ["strength", "cardio"],
      scheduledFamilies: ["sport"],
      mealCount: 3,
    });
    expect(m.dots).toHaveLength(MAX_DOTS);
    expect(m.overflow).toBe(3);
    expect(m.total).toBe(6);
  });

  it("pluralises the screen-reader label", () => {
    expect(buildDayMarkers({ mealCount: 2 }).label).toBe("2 meals");
    expect(buildDayMarkers({ loggedFamilies: ["a", "b"] }).label).toBe("2 workouts logged");
  });
});

describe("familyForSessionKind", () => {
  it("maps common session kinds onto dot colours", () => {
    expect(familyForSessionKind("strength")).toBe("strength");
    expect(familyForSessionKind("Cardio")).toBe("cardio");
    expect(familyForSessionKind("yoga")).toBe("mindbody");
    expect(familyForSessionKind("sport")).toBe("sport");
    expect(familyForSessionKind("something else")).toBe("other");
    expect(familyForSessionKind(null)).toBe("strength");
  });
});

describe("markersForCalendarDay", () => {
  it("splits routine occurrences into scheduled workouts and meals", () => {
    const m = markersForCalendarDay({
      loggedFamilies: ["strength"],
      occurrences: [{ kind: "workout", sessionKind: "cardio" }, { kind: "meal" }],
    });
    expect(m.total).toBe(3);
    expect(m.dots.map((d) => d.family)).toEqual(["strength", "cardio", "meal"]);
    expect(m.label).toBe("1 workout logged, 1 scheduled, 1 meal");
  });
});
