/**
 * The cue the user actually sees ("about a deck of cards") must belong to the
 * food that is selected. These render FoodPortionPicker per food and read the
 * rendered label, so a wiring mistake in the component fails here even when the
 * pure cue helper is still correct.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { MealItem } from "@/lib/meal-nutrition";
import { foodDbMock, portionsQueryMock, startMock } from "@/test/fixtures/meal-harness";
import { makeMealItem, type FoodKey } from "@/test/fixtures/foods";

vi.mock("@tanstack/react-start", () => startMock());
vi.mock("@tanstack/react-query", () => portionsQueryMock());
vi.mock("@/lib/food-db.functions", () => foodDbMock());

import { FoodPortionPicker } from "@/components/food-portion-picker";

/** Text of the small gram + cue line next to the source badge. */
function cueText(): string {
  const node = screen.getByText(/^\d+(\.\d+)?\s*g( ·|$)/);
  return node.textContent ?? "";
}

function renderFood(key: FoodKey, grams?: number, onChange = vi.fn()) {
  const item = makeMealItem(key, grams == null ? {} : { grams });
  const view = render(<FoodPortionPicker item={item} onChange={onChange} />);
  return { ...view, item, onChange };
}

describe("portion cue labels match the selected food", () => {
  it("shows a meat cue for chicken, not a produce or thumb-tip cue", () => {
    renderFood("chicken", 85);
    const text = cueText();
    expect(text).toMatch(/deck of cards|palm/i);
    expect(text).not.toMatch(/fist|cupped hand|thumb tip/i);
  });

  it("shows a produce cue for broccoli, never a meat cue", () => {
    renderFood("broccoli", 180);
    const text = cueText();
    expect(text).toMatch(/clenched fist|cupped hand/i);
    expect(text).not.toMatch(/deck of cards|palm/i);
  });

  it("shows a small-handful cue for nuts", () => {
    renderFood("almonds", 30);
    expect(cueText()).toMatch(/small handful/i);
  });

  it("shows a thumb-tip cue for oils", () => {
    renderFood("oliveOil", 15);
    const text = cueText();
    expect(text).toMatch(/thumb tip/i);
    expect(text).not.toMatch(/deck of cards|clenched fist/i);
  });

  it("updates the label when the selected food changes", () => {
    const { rerender } = renderFood("chicken", 85);
    expect(cueText()).toMatch(/deck of cards|palm/i);

    rerender(
      <FoodPortionPicker item={makeMealItem("broccoli", { grams: 180 })} onChange={vi.fn()} />,
    );
    const text = cueText();
    expect(text).toMatch(/clenched fist|cupped hand/i);
    expect(text).not.toMatch(/deck of cards/i);
  });

  it("keeps the food's own cue after a preset chip rescales the portion", () => {
    const { item, onChange } = renderFood("chicken", 60);

    fireEvent.click(screen.getByRole("button", { name: "1 small breast (85 g)" }));
    expect(onChange).toHaveBeenCalled();
    const patch = onChange.mock.calls[0]![0] as Partial<MealItem>;
    expect(patch.grams).toBe(85);

    render(<FoodPortionPicker item={{ ...item, ...patch }} onChange={onChange} />);
    const text = screen.getAllByText(/^\d+(\.\d+)?\s*g( ·|$)/).at(-1)?.textContent ?? "";
    expect(text).toMatch(/85 g/);
    expect(text).toMatch(/palm|deck of cards/i);
    expect(text).not.toMatch(/thumb tip|cupped hand/i);
  });

  it("keeps the food's cue for a free-typed gram amount", () => {
    renderFood("broccoli", 200);
    const text = cueText();
    expect(text).toMatch(/200 g/);
    expect(text).toMatch(/clenched fist/i);
  });
});
