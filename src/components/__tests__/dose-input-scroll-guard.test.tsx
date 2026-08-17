import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { DecimalInput } from "../decimal-input";
import { useNumberInputWheelGuard } from "@/hooks/use-number-input-wheel-guard";

afterEach(cleanup);

function DoseField() {
  const [value, setValue] = useState("900");
  useNumberInputWheelGuard();
  return <DecimalInput aria-label="Dose" value={value} onValueChange={setValue} />;
}

function LegacyNumberField() {
  useNumberInputWheelGuard();
  return <input aria-label="Legacy dose" type="number" defaultValue="900" />;
}

describe("dose input scroll/focus regression guard", () => {
  it("renders as a text field with a decimal keypad (no native spinner)", () => {
    render(<DoseField />);
    const input = screen.getByLabelText("Dose") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.getAttribute("inputmode")).toBe("decimal");
    expect(input).not.toHaveAttribute("step");
  });

  it("keeps the typed dose after focus + wheel scroll", () => {
    render(<DoseField />);
    const input = screen.getByLabelText("Dose") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.wheel(input, { deltaY: -100 });
    fireEvent.wheel(input, { deltaY: 100 });
    fireEvent.wheel(document, { deltaY: 240 });

    expect(input.value).toBe("900");
  });

  it("keeps the typed dose when arrow keys are pressed while focused", () => {
    render(<DoseField />);
    const input = screen.getByLabelText("Dose") as HTMLInputElement;
    input.focus();

    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(input.value).toBe("900");
  });

  it("only changes when the user types", () => {
    render(<DoseField />);
    const input = screen.getByLabelText("Dose") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1800" } });
    expect(input.value).toBe("1800");
  });

  it("blurs and cancels wheel events on any remaining native number input", () => {
    render(<LegacyNumberField />);
    const input = screen.getByLabelText("Legacy dose") as HTMLInputElement;
    input.focus();

    const wheel = new WheelEvent("wheel", {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(wheel);

    expect(wheel.defaultPrevented).toBe(true);
    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe("900");
  });

  it("cancels Up/Down key mutations on any remaining native number input", () => {
    render(<LegacyNumberField />);
    const input = screen.getByLabelText("Legacy dose") as HTMLInputElement;
    input.focus();

    for (const key of ["ArrowUp", "ArrowDown"]) {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(input.value).toBe("900");
  });

  it("does not block page scrolling away from a dose field", () => {
    render(<DoseField />);
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    const wheel = new WheelEvent("wheel", {
      deltaY: 300,
      bubbles: true,
      cancelable: true,
    });
    outside.dispatchEvent(wheel);

    expect(wheel.defaultPrevented).toBe(false);
    outside.remove();
  });
});
