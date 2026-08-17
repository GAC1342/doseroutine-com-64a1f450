import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { WarningCard, UserNoteCard } from "@/routes/_authenticated/safety";
import type { Compound, PairEvaluation, Severity } from "@/lib/interactions";
import type { PairNote } from "@/components/pair-note-dialog";

afterEach(cleanup);

const compoundA = {
  id: "a",
  name: "Omega-3",
  category: "supplement",
  goal_tags: [],
  slug: "omega-3",
} as unknown as Compound;

const compoundB = {
  id: "b",
  name: "Vitamin D",
  category: "supplement",
  goal_tags: [],
  slug: "vitamin-d",
} as unknown as Compound;

const PAIR = "Omega-3 + Vitamin D";
const EXPAND_LABEL = `Expand details for ${PAIR}`;
const COLLAPSE_LABEL = `Collapse details for ${PAIR}`;

function makeEvaluation(severity: Severity): PairEvaluation {
  return {
    a: compoundA,
    b: compoundB,
    severity,
    mechanism: "Mechanism text",
    recommendation: "Recommendation text",
    same_axis: false,
    matchedBy: "pair",
    source_refs: [],
    confidence: "theoretical",
    mechanism_shared_with: null,
    no_known_interaction: false,
  };
}

function makePairNote(severity: string): PairNote {
  return {
    id: "n1",
    compound_a_id: "a",
    compound_b_id: "b",
    note: "My personal note about this pair.",
    severity,
    source: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    user_id: "u1",
  };
}

const axeOptions = {
  runOnly: { type: "tag" as const, values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  rules: {
    "color-contrast": { enabled: false },
    region: { enabled: false },
  },
};

describe("Safety NOTE card collapse", () => {
  it("collapses NOTE rule cards by default", () => {
    render(<WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("note")} expanded={false} />);
    // Full mechanism is hidden; preview recommendation is shown.
    expect(screen.queryByText(/Mechanism text/)).toBeNull();
    expect(screen.getByLabelText(EXPAND_LABEL)).toBeInTheDocument();
  });

  it("expands a NOTE rule card when the toggle is clicked", () => {
    const toggle = vi.fn();
    render(
      <WarningCard
        cardKey="rule-a-b"
        evaluation={makeEvaluation("note")}
        expanded={false}
        onToggle={toggle}
      />,
    );
    fireEvent.click(screen.getByLabelText(EXPAND_LABEL));
    expect(toggle).toHaveBeenCalledWith("rule-a-b");
  });

  it("shows full content when a NOTE rule card is expanded", () => {
    render(<WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("note")} expanded={true} />);
    expect(screen.getByText(/Mechanism text/)).toBeInTheDocument();
    expect(screen.getByLabelText(COLLAPSE_LABEL)).toBeInTheDocument();
  });

  it("keeps AVOID cards fully expanded with no toggle button", () => {
    render(<WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("avoid")} expanded={true} />);
    expect(screen.getByText(/Mechanism text/)).toBeInTheDocument();
    expect(screen.queryByLabelText(EXPAND_LABEL)).toBeNull();
    expect(screen.queryByLabelText(COLLAPSE_LABEL)).toBeNull();
  });

  it("collapses NOTE user note cards by default", () => {
    render(
      <UserNoteCard
        cardKey="note-n1"
        a={compoundA}
        b={compoundB}
        note={makePairNote("note")}
        expanded={false}
        onEdit={() => {}}
      />,
    );
    // Edit button only appears in expanded state.
    expect(screen.queryByRole("button", { name: /Edit/i })).toBeNull();
    expect(screen.getByLabelText(EXPAND_LABEL)).toBeInTheDocument();
  });

  it("expands a NOTE user note card when the toggle is clicked", () => {
    const toggle = vi.fn();
    render(
      <UserNoteCard
        cardKey="note-n1"
        a={compoundA}
        b={compoundB}
        note={makePairNote("note")}
        expanded={false}
        onToggle={toggle}
        onEdit={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText(EXPAND_LABEL));
    expect(toggle).toHaveBeenCalledWith("note-n1");
  });

  it("shows full content when a NOTE user note card is expanded", () => {
    render(
      <UserNoteCard
        cardKey="note-n1"
        a={compoundA}
        b={compoundB}
        note={makePairNote("note")}
        expanded={true}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("My personal note about this pair.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
  });

  it("keeps CAUTION user note cards fully expanded with no toggle button", () => {
    render(
      <UserNoteCard
        cardKey="note-n2"
        a={compoundA}
        b={compoundB}
        note={makePairNote("caution")}
        expanded={true}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("My personal note about this pair.")).toBeInTheDocument();
    expect(screen.queryByLabelText(EXPAND_LABEL)).toBeNull();
    expect(screen.queryByLabelText(COLLAPSE_LABEL)).toBeNull();
  });
});

describe("Safety NOTE card — ARIA wiring", () => {
  it("points aria-controls at the body region when expanded", () => {
    render(<WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("note")} expanded={true} />);
    const toggle = screen.getByLabelText(COLLAPSE_LABEL);
    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    const region = document.getElementById(controls!);
    expect(region).not.toBeNull();
    expect(region!.getAttribute("role")).toBe("region");
  });

  it("names the body region after the compound pair", () => {
    render(<WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("note")} expanded={true} />);
    const region = screen.getByRole("region");
    const labelledBy = region.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent?.replace(/\s+/g, " ")).toContain(
      "Omega-3",
    );
  });

  it("reflects state through aria-expanded on the toggle", () => {
    const { rerender } = render(
      <WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("note")} expanded={false} />,
    );
    expect(screen.getByLabelText(EXPAND_LABEL).getAttribute("aria-expanded")).toBe("false");
    rerender(
      <WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("note")} expanded={true} />,
    );
    expect(screen.getByLabelText(COLLAPSE_LABEL).getAttribute("aria-expanded")).toBe("true");
  });

  it("wires aria-controls on user note cards too", () => {
    render(
      <UserNoteCard
        cardKey="note-n1"
        a={compoundA}
        b={compoundB}
        note={makePairNote("note")}
        expanded={true}
        onEdit={() => {}}
      />,
    );
    const toggle = screen.getByLabelText(COLLAPSE_LABEL);
    const controls = toggle.getAttribute("aria-controls");
    expect(document.getElementById(controls!)?.getAttribute("role")).toBe("region");
  });

  it("does not expose a region on non-collapsible cards", () => {
    render(<WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("avoid")} expanded={true} />);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("has no axe violations collapsed or expanded", async () => {
    const collapsed = render(
      <main>
        <WarningCard cardKey="rule-a-b" evaluation={makeEvaluation("note")} expanded={false} />
      </main>,
    );
    expect(await axe(collapsed.container, axeOptions)).toHaveNoViolations();
    cleanup();

    const expanded = render(
      <main>
        <UserNoteCard
          cardKey="note-n1"
          a={compoundA}
          b={compoundB}
          note={makePairNote("note")}
          expanded={true}
          onEdit={() => {}}
        />
      </main>,
    );
    expect(await axe(expanded.container, axeOptions)).toHaveNoViolations();
  });
});

describe("Safety NOTE card — keyboard navigation", () => {
  it("toggle is keyboard focusable and activates on click (Enter/Space on a native button)", () => {
    const toggle = vi.fn();
    render(
      <WarningCard
        cardKey="rule-a-b"
        evaluation={makeEvaluation("note")}
        expanded={false}
        onToggle={toggle}
      />,
    );
    const btn = screen.getByLabelText(EXPAND_LABEL);
    btn.focus();
    expect(document.activeElement).toBe(btn);
    expect(btn.getAttribute("tabindex")).toBeNull();
    fireEvent.click(btn);
    expect(toggle).toHaveBeenCalledWith("rule-a-b");
  });

  it("Escape inside an expanded card collapses it and restores focus to the toggle", async () => {
    const toggle = vi.fn();
    render(
      <WarningCard
        cardKey="rule-a-b"
        evaluation={makeEvaluation("note")}
        expanded={true}
        onToggle={toggle}
      />,
    );
    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "Escape" });
    expect(toggle).toHaveBeenCalledWith("rule-a-b");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(document.activeElement).toBe(screen.getByLabelText(COLLAPSE_LABEL));
  });

  it("Escape does nothing on a collapsed card", () => {
    const toggle = vi.fn();
    const { container } = render(
      <WarningCard
        cardKey="rule-a-b"
        evaluation={makeEvaluation("note")}
        expanded={false}
        onToggle={toggle}
      />,
    );
    fireEvent.keyDown(container.querySelector("article")!, { key: "Escape" });
    expect(toggle).not.toHaveBeenCalled();
  });

  it("Escape does nothing on a non-collapsible card", () => {
    const toggle = vi.fn();
    const { container } = render(
      <WarningCard
        cardKey="rule-a-b"
        evaluation={makeEvaluation("avoid")}
        expanded={true}
        onToggle={toggle}
      />,
    );
    fireEvent.keyDown(container.querySelector("article")!, { key: "Escape" });
    expect(toggle).not.toHaveBeenCalled();
  });

  it("Escape collapses an expanded user note card", () => {
    const toggle = vi.fn();
    render(
      <UserNoteCard
        cardKey="note-n1"
        a={compoundA}
        b={compoundB}
        note={makePairNote("note")}
        expanded={true}
        onToggle={toggle}
        onEdit={() => {}}
      />,
    );
    fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });
    expect(toggle).toHaveBeenCalledWith("note-n1");
  });
});
