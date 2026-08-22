/**
 * Regression tests for the stack card's delete/pause writes.
 *
 * The bug: a request that rejected or never settled left the card busy
 * forever — spinner stuck, confirm dialog open, page unclickable. Every case
 * below must resolve to a describable outcome so the UI can always clear
 * busy state and close its dialog.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildStackPayload,
  findDuplicateStackItem,
  releaseStuckPointerLock,
  runStackDelete,
  runStackUpdate,
  stackItemKey,
  validateStackIdentity,
  validateStackItemSave,
} from "../stack-item-actions";

describe("runStackDelete", () => {
  it("succeeds when a row comes back", async () => {
    const out = await runStackDelete(async () => ({ data: [{ id: "a" }], error: null }));
    expect(out).toEqual({ ok: true });
  });

  it("reports a server error", async () => {
    const out = await runStackDelete(async () => ({ data: null, error: { message: "boom" } }));
    expect(out).toEqual({ ok: false, reason: "error", message: "boom" });
  });

  it("treats zero rows as a failure, not a silent success", async () => {
    const out = await runStackDelete(async () => ({ data: [], error: null }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("missing");
  });

  it("survives a rejected request", async () => {
    const out = await runStackDelete(async () => {
      throw new Error("Failed to fetch");
    });
    expect(out).toEqual({ ok: false, reason: "crashed", message: "Failed to fetch" });
  });

  it("survives a request that throws synchronously", async () => {
    const out = await runStackDelete(() => {
      throw new Error("no client");
    });
    expect(out).toEqual({ ok: false, reason: "crashed", message: "no client" });
  });

  it("times out instead of hanging forever", async () => {
    vi.useFakeTimers();
    const pending = runStackDelete(() => new Promise(() => {}), 12_000);
    await vi.advanceTimersByTimeAsync(12_000);
    const out = await pending;
    vi.useRealTimers();
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe("timeout");
      expect(out.message).toMatch(/connection/i);
    }
  });

  it("always settles, whatever the request does", async () => {
    const requests = [
      async () => ({ data: [{ id: "a" }], error: null }),
      async () => ({ data: [], error: null }),
      async () => ({ data: null, error: { message: "" } }),
      async () => {
        throw new Error("offline");
      },
    ];
    for (const req of requests) {
      const out = await runStackDelete(req, 50);
      expect(typeof out.ok).toBe("boolean");
    }
  });
});

describe("runStackUpdate", () => {
  it("succeeds with no error", async () => {
    expect(await runStackUpdate(async () => ({ error: null }))).toEqual({ ok: true });
  });

  it("reports an error message", async () => {
    const out = await runStackUpdate(async () => ({ error: { message: "denied" } }));
    expect(out).toEqual({ ok: false, reason: "error", message: "denied" });
  });

  it("survives a rejected update", async () => {
    const out = await runStackUpdate(async () => {
      throw new Error("network down");
    });
    expect(out.ok).toBe(false);
  });

  it("times out", async () => {
    vi.useFakeTimers();
    const pending = runStackUpdate(() => new Promise(() => {}), 12_000);
    await vi.advanceTimersByTimeAsync(12_000);
    const out = await pending;
    vi.useRealTimers();
    if (!out.ok) expect(out.reason).toBe("timeout");
    else throw new Error("expected timeout");
  });
});

describe("releaseStuckPointerLock", () => {
  it("clears a leftover page lock", () => {
    document.body.style.pointerEvents = "none";
    document.body.setAttribute("data-scroll-locked", "1");
    document.body.style.overflow = "hidden";
    releaseStuckPointerLock(document);
    expect(document.body.style.pointerEvents).toBe("");
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("leaves the lock alone while a dialog is genuinely open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "alertdialog");
    document.body.appendChild(dialog);
    document.body.style.pointerEvents = "none";
    releaseStuckPointerLock(document);
    expect(document.body.style.pointerEvents).toBe("none");
    document.body.removeChild(dialog);
    document.body.style.pointerEvents = "";
  });

  it("is safe with no document", () => {
    expect(() => releaseStuckPointerLock(undefined)).not.toThrow();
  });
});

describe("stack identity, duplicates and orphans", () => {
  it("keys library rows by compound and custom rows by normalized name", () => {
    expect(stackItemKey({ compound_id: "c1", custom_name: "ignored" })).toBe("compound:c1");
    expect(stackItemKey({ compound_id: null, custom_name: "  Vitamin D3 " })).toBe(
      "custom:vitamin d3",
    );
  });

  it("treats a row with no compound and no name as unidentifiable", () => {
    expect(stackItemKey({ compound_id: null, custom_name: "   " })).toBeNull();
    const res = validateStackIdentity({ compound_id: null, custom_name: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/name/i);
  });

  it("blocks adding a compound already in the stack", () => {
    const rows = [{ id: "a", compound_id: "c1", custom_name: null }];
    const res = validateStackItemSave(rows, { compound_id: "c1", displayName: "Zinc" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/already in your stack/i);
  });

  it("blocks a duplicate custom item regardless of case or spacing", () => {
    const rows = [{ id: "a", compound_id: null, custom_name: "Vitamin D3" }];
    expect(findDuplicateStackItem(rows, { custom_name: " vitamin d3 " })?.id).toBe("a");
    expect(validateStackItemSave(rows, { custom_name: "VITAMIN D3" }).ok).toBe(false);
  });

  it("never treats the row being edited as its own duplicate", () => {
    const rows = [{ id: "a", compound_id: null, custom_name: "Vitamin D3" }];
    expect(validateStackItemSave(rows, { custom_name: "Vitamin D3" }, "a").ok).toBe(true);
    expect(findDuplicateStackItem(rows, { custom_name: "Vitamin D3" }, "a")).toBeNull();
  });

  it("allows a genuinely new item", () => {
    const rows = [{ id: "a", compound_id: "c1", custom_name: null }];
    expect(validateStackItemSave(rows, { compound_id: "c2" }).ok).toBe(true);
    expect(validateStackItemSave(rows, { custom_name: "Beet powder" }).ok).toBe(true);
  });
});

describe("buildStackPayload", () => {
  const rest = { dose_amount: 2000, dose_unit: "iu", active: true };

  it("keeps the custom name on a legacy edit so the row stays identifiable", () => {
    const payload = buildStackPayload({
      userId: "u1",
      compoundId: null,
      customName: "  Vitamin D3 ",
      customCategory: "vitamin",
      rest,
    });
    expect(payload.compound_id).toBeNull();
    expect(payload.custom_name).toBe("Vitamin D3");
    expect(payload.custom_category).toBe("vitamin");
    expect(payload.dose_amount).toBe(2000);
    expect(validateStackIdentity(payload).ok).toBe(true);
  });

  it("clears the custom fields when a library compound is chosen", () => {
    const payload = buildStackPayload({
      userId: "u1",
      compoundId: "c1",
      customName: "Vitamin D3",
      customCategory: "vitamin",
      rest,
    });
    expect(payload.compound_id).toBe("c1");
    expect(payload.custom_name).toBeNull();
    expect(payload.custom_category).toBeNull();
  });

  it("produces an orphan payload only when both identities are missing, and validation catches it", () => {
    const payload = buildStackPayload({ userId: "u1", compoundId: null, customName: "  ", rest });
    expect(payload.custom_name).toBeNull();
    expect(validateStackIdentity(payload).ok).toBe(false);
  });
});

describe("deleting a legacy row", () => {
  it("reports success when the row comes back deleted", async () => {
    const out = await runStackDelete(async () => ({ data: [{ id: "legacy-1" }], error: null }));
    expect(out.ok).toBe(true);
  });

  it("reports 'missing' when the delete affects no rows", async () => {
    const out = await runStackDelete(async () => ({ data: [], error: null }));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("missing");
  });
});
