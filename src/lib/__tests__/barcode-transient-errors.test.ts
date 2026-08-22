import { describe, expect, it } from "vitest";
import { isTransientDecodeError } from "../barcode-scanner";

describe("isTransientDecodeError", () => {
  it("treats ZXing frame misses as noise even when the class name is minified", () => {
    const err = new Error("No MultiFormat Readers were able to detect the code.");
    err.name = "Error";
    expect(isTransientDecodeError(err)).toBe(true);
  });

  it("treats NotFoundException by name as noise", () => {
    const err = new Error("");
    err.name = "NotFoundException";
    expect(isTransientDecodeError(err)).toBe(true);
  });

  it("still surfaces real camera failures", () => {
    const err = new Error("Permission denied");
    err.name = "NotAllowedError";
    expect(isTransientDecodeError(err)).toBe(false);
  });
});
