import { describe, expect, it } from "vitest";
import { isBenignRouterRejection } from "../benign-rejection";

describe("isBenignRouterRejection", () => {
  it("matches superseded router transitions", () => {
    expect(isBenignRouterRejection(new Error("Transition was skipped"))).toBe(true);
    expect(isBenignRouterRejection("transition was skipped")).toBe(true);
    expect(isBenignRouterRejection({ message: "Navigation was aborted" })).toBe(true);
    expect(isBenignRouterRejection(Object.assign(new Error("x"), { name: "AbortError" }))).toBe(
      true,
    );
  });

  it("leaves real errors reportable", () => {
    expect(isBenignRouterRejection(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isBenignRouterRejection(undefined)).toBe(false);
    expect(isBenignRouterRejection({})).toBe(false);
  });
});
