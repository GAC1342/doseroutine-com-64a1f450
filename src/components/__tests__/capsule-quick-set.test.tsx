import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CapsuleQuickSet } from "@/components/capsule-quick-set";

function setup() {
  const onApply = vi.fn();
  render(
    <CapsuleQuickSet compoundId="omega-3" unit="mg" defaultStrength={900} onApply={onApply} />,
  );
  return { onApply };
}

describe("CapsuleQuickSet validation", () => {
  it("applies a valid dose", () => {
    const { onApply } = setup();
    fireEvent.change(screen.getByLabelText(/Number of soft gels per day/i), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Use dose/i }));
    expect(onApply).toHaveBeenCalledWith(1800);
  });

  it("blocks a zero count and explains why", () => {
    const { onApply } = setup();
    fireEvent.change(screen.getByLabelText(/Number of soft gels per day/i), {
      target: { value: "0" },
    });
    expect(screen.getByRole("button", { name: /Use dose/i })).toBeDisabled();
    expect(screen.getByRole("alert").textContent).toMatch(/more than 0/i);
    fireEvent.click(screen.getByRole("button", { name: /Use dose/i }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("blocks an unreasonable capsule count", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Number of soft gels per day/i), {
      target: { value: "90" },
    });
    expect(screen.getByRole("button", { name: /Use dose/i })).toBeDisabled();
    expect(screen.getByRole("alert").textContent).toMatch(/over 60 a day/i);
  });
});

describe("CapsuleQuickSet label reader", () => {
  it("reads a pasted label and applies it", () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Paste label/i }));
    fireEvent.change(screen.getByLabelText(/Paste supplement label text/i), {
      target: { value: "Serving size: 2 softgels. Omega-3 1,000 mg per softgel" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Read label/i }));
    expect(screen.getByText(/2000 mg daily/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Use this/i }));
    fireEvent.click(screen.getByRole("button", { name: /Use dose/i }));
    expect(onApply).toHaveBeenCalledWith(2000);
  });

  it("explains when nothing is recognised", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Paste label/i }));
    fireEvent.change(screen.getByLabelText(/Paste supplement label text/i), {
      target: { value: "great value marketing text" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Read label/i }));
    expect(screen.getByRole("status").textContent).toMatch(/Couldn't find an amount/i);
  });

  it("blocks applying a parsed label with an unreasonable count", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Paste label/i }));
    fireEvent.change(screen.getByLabelText(/Paste supplement label text/i), {
      target: { value: "Serving size: 400 capsules. 900 mg per capsule" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Read label/i }));
    expect(screen.getByRole("button", { name: /Use this/i })).toBeDisabled();
    expect(screen.getByRole("alert").textContent).toMatch(/over 60 a day/i);
    fireEvent.click(screen.getByRole("button", { name: /Use this/i }));
    // The rejected parse must never reach the manual fields.
    expect((screen.getByLabelText(/Number of soft gels per day/i) as HTMLInputElement).value).toBe(
      "1",
    );
  });

  it("blocks applying a parsed label whose total is absurd", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Paste label/i }));
    fireEvent.change(screen.getByLabelText(/Paste supplement label text/i), {
      target: { value: "Serving size: 2 capsules. 900 g per capsule" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Read label/i }));
    expect(screen.getByRole("button", { name: /Use this/i })).toBeDisabled();
  });
});
