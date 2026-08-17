import { describe, expect, it } from "vitest";
import { describeCameraProblem } from "@/lib/barcode-scanner";

function domErr(name: string, message = "") {
  const e = new Error(message);
  e.name = name;
  return e;
}

describe("describeCameraProblem", () => {
  it("recognises a denied permission and points to the fallbacks", () => {
    const p = describeCameraProblem(domErr("NotAllowedError", "Permission denied"));
    expect(p.kind).toBe("denied");
    expect(p.body).toMatch(/photo/i);
  });

  it("recognises a missing camera", () => {
    expect(describeCameraProblem(domErr("NotFoundError")).kind).toBe("no-camera");
  });

  it("recognises a camera already in use", () => {
    expect(describeCameraProblem(domErr("NotReadableError")).kind).toBe("in-use");
  });

  it("recognises an unsupported device", () => {
    expect(
      describeCameraProblem(new Error("No barcode scanner available on this device")).kind,
    ).toBe("unsupported");
  });

  it("always returns a friendly title and body", () => {
    for (const e of [null, undefined, "boom", new Error(""), domErr("WeirdError", "??")]) {
      const p = describeCameraProblem(e);
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.body.length).toBeGreaterThan(0);
    }
  });
});
