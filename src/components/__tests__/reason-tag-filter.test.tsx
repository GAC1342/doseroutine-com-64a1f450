import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReasonTagFilter } from "@/components/reason-tag-filter";
import type { ReasonTag } from "@/lib/reason-tags";

const COUNTS: Array<{ tag: ReasonTag; count: number }> = [
  { tag: "Absorption", count: 3 },
  { tag: "Sedation", count: 2 },
  { tag: "Hormonal", count: 1 },
];

function setup(selected: ReasonTag[] = []) {
  const onToggle = vi.fn();
  const onClear = vi.fn();
  const view = render(
    <ReasonTagFilter counts={COUNTS} selected={selected} onToggle={onToggle} onClear={onClear} />,
  );
  return { onToggle, onClear, view };
}

describe("ReasonTagFilter", () => {
  it("renders reason chips with counts", () => {
    setup();
    expect(screen.getByRole("button", { name: /Absorption, 3 cards/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sedation, 2 cards/i })).toBeInTheDocument();
  });

  it("does not render Clear reasons when nothing is selected", () => {
    setup();
    expect(screen.queryByRole("button", { name: /Clear reasons/i })).not.toBeInTheDocument();
  });

  it("renders Clear reasons with selected count when a tag is active", () => {
    setup(["Absorption"]);
    const clear = screen.getByRole("button", { name: /Clear 1 selected reason filter/i });
    expect(clear).toBeInTheDocument();
    expect(clear).toHaveTextContent("Clear reasons");
    expect(clear).toHaveTextContent("1");
  });

  it("renders Clear reasons with plural count when multiple tags are active", () => {
    setup(["Absorption", "Sedation"]);
    const clear = screen.getByRole("button", { name: /Clear 2 selected reason filters/i });
    expect(clear).toBeInTheDocument();
    expect(clear).toHaveTextContent("2");
  });

  it("calls onClear when Clear reasons is clicked", () => {
    const { onClear } = setup(["Absorption", "Sedation"]);
    const clear = screen.getByRole("button", { name: /Clear 2 selected reason filters/i });
    fireEvent.click(clear);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle when a reason chip is clicked", () => {
    const { onToggle } = setup();
    const chip = screen.getByRole("button", { name: /Absorption, 3 cards/i });
    fireEvent.click(chip);
    expect(onToggle).toHaveBeenCalledWith("Absorption");
  });
});
