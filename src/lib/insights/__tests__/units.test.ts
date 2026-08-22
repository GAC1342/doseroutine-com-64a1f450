import { describe, expect, it } from "vitest";
import { displayToKg, insightUnits, kgToDisplay, weightUnitLabel } from "@/lib/insights/units";

describe("insight units", () => {
  it("converts kg to the display unit and back", () => {
    expect(kgToDisplay(100, "metric")).toBeCloseTo(100);
    expect(kgToDisplay(100, "imperial")).toBeCloseTo(220.462, 2);
    expect(displayToKg(kgToDisplay(82.5, "imperial"), "imperial")).toBeCloseTo(82.5, 6);
    expect(weightUnitLabel("imperial")).toBe("lb");
  });

  it("formats weight in the profile unit", () => {
    expect(insightUnits({ units: "metric" }).weight(82.44)).toBe("82.4 kg");
    expect(insightUnits({ units: "imperial" }).weight(181.77)).toBe("181.8 lb");
    expect(insightUnits({ units: "metric" }).weight(null)).toBe("—");
  });

  it("formats percentages, counts and durations consistently", () => {
    const u = insightUnits({ units: "metric" });
    expect(u.percent(93.4)).toBe("93%");
    expect(u.percent(18.36, 1)).toBe("18.4%");
    expect(u.count(3, "site")).toBe("3 sites");
    expect(u.count(1, "site")).toBe("1 site");
    expect(u.minutes(45)).toBe("45 min");
    expect(u.duration(45)).toBe("45 min");
    expect(u.duration(140)).toBe("2h 20m");
    expect(u.duration(120)).toBe("2h");
  });

  it("formats money in the vial currency", () => {
    expect(insightUnits({ units: "metric", currency: "USD" }).moneyPerMonth(412.4)).toContain(
      "412",
    );
    expect(insightUnits({ units: "metric", currency: "USD" }).money(412.4)).toContain("$");
    expect(insightUnits({ units: "metric", currency: "USD" }).money(null)).toBe("—");
  });
});
