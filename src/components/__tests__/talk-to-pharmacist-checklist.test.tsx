import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TalkToPharmacistChecklist } from "@/components/talk-to-pharmacist-checklist";

const pairs = [{ a: "Testosterone", b: "Warfarin", severity: "avoid" }];

describe("TalkToPharmacistChecklist", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has no dead tel: control", () => {
    const { container } = render(
      <TalkToPharmacistChecklist pairs={pairs} storageKey="doseroutine:test" />,
    );
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href="#"]')).toBeNull();
  });

  it("shares the checklist through the OS share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });

    render(<TalkToPharmacistChecklist pairs={pairs} storageKey="doseroutine:test" />);
    fireEvent.click(screen.getByRole("button", { name: /share with pharmacist/i }));

    await waitFor(() => expect(share).toHaveBeenCalled());
    const text = String(share.mock.calls[0][0].text);
    expect(text).toContain("Testosterone");
    expect(text).toContain("Warfarin");
    // @ts-expect-error cleanup of the injected property
    delete navigator.share;
  });

  it("falls back to the clipboard when sharing is unavailable or cancelled", async () => {
    // @ts-expect-error ensure the share API is absent
    delete navigator.share;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<TalkToPharmacistChecklist pairs={pairs} storageKey="doseroutine:test" />);
    fireEvent.click(screen.getByRole("button", { name: /share with pharmacist/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: /copied/i })).toBeTruthy();
  });

  it("does not throw when both sharing and the clipboard are blocked", async () => {
    Object.defineProperty(navigator, "share", {
      value: vi.fn().mockRejectedValue(new Error("cancelled")),
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
      configurable: true,
    });

    render(<TalkToPharmacistChecklist pairs={pairs} storageKey="doseroutine:test" />);
    const btn = screen.getByRole("button", { name: /share with pharmacist/i });
    fireEvent.click(btn);
    await waitFor(() => expect(btn.textContent).toMatch(/share with pharmacist/i));
    // @ts-expect-error cleanup of the injected property
    delete navigator.share;
  });
});
