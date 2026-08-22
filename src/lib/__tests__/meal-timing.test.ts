import { describe, expect, it } from "vitest";
import { buildMealTimingSuggestions, type TimingMacroSummary } from "@/lib/meal-timing";

const macros: TimingMacroSummary = {
  avgProtein: 90,
  avgCalories: 2100,
  proteinTarget: 140,
  calorieTarget: 2000,
  firstMealHour: 9,
  lastMealHour: 20,
  mealsPerDay: 3,
};

describe("buildMealTimingSuggestions", () => {
  it("flags thyroid absorption timing", () => {
    const out = buildMealTimingSuggestions(
      [
        {
          name: "Levothyroxine",
          category: "medication",
          times: ["06:30"],
          withFood: false,
          postWorkout: false,
        },
      ],
      macros,
    );
    expect(out.map((s) => s.id)).toContain("thyroid-empty-stomach");
  });

  it("front-loads protein for GLP-1 users and names the shortfall", () => {
    const out = buildMealTimingSuggestions(
      [
        {
          name: "Tirzepatide",
          category: "glp1",
          times: ["09:00"],
          withFood: null,
          postWorkout: null,
        },
      ],
      macros,
    );
    const glp1 = out.find((s) => s.id === "glp1-protein-front-load");
    expect(glp1?.detail).toContain("50g under");
  });

  it("caps output and never returns nothing when macros exist", () => {
    const out = buildMealTimingSuggestions([], macros);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(5);
  });
});
