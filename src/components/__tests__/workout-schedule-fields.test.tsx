import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  WorkoutScheduleFields,
  workoutScheduleSummary,
  type WorkoutScheduleValue,
} from "@/components/workout-schedule-fields";

const weekly: WorkoutScheduleValue = {
  repeats: true,
  weekdays: [1, 3, 5],
  time: "17:30",
  intervalWeeks: 1,
  repeatUntil: "2026-09-30",
};

describe("WorkoutScheduleFields", () => {
  it("shows the complete repeat schedule in normal edit flows", () => {
    render(<WorkoutScheduleFields value={weekly} onChange={vi.fn()} />);

    expect(screen.getByRole("switch", { name: /repeat this workout/i })).toBeChecked();
    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Tuesday" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByLabelText("Repeat frequency")).toHaveValue("1");
    expect(screen.getByLabelText("Repeat until")).toHaveValue("2026-09-30");
    expect(
      screen.getByText(/every week on mon, wed, fri at 5:30 pm until 2026-09-30/i),
    ).toBeVisible();
  });

  it("emits weekday, frequency, and no-end-date edits", () => {
    const onChange = vi.fn();
    const { rerender } = render(<WorkoutScheduleFields value={weekly} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tuesday" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...weekly, weekdays: [1, 2, 3, 5] });

    fireEvent.change(screen.getByLabelText("Repeat frequency"), { target: { value: "2" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...weekly, intervalWeeks: 2 });

    const noEnd = { ...weekly, repeatUntil: "" };
    rerender(<WorkoutScheduleFields value={noEnd} onChange={onChange} />);
    expect(screen.getByText(/with no end date/i)).toBeVisible();
  });
});

describe("workoutScheduleSummary", () => {
  it("describes a one-time workout when repeat is off", () => {
    expect(workoutScheduleSummary({ ...weekly, repeats: false })).toBe("One-time workout");
  });
});
