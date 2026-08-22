import { describe, expect, it, beforeEach } from "vitest";
import {
  bootDiagnosticsSummary,
  describeBootFailure,
  firstFailedBootStep,
  getBootSteps,
  recordBootStep,
  resetBootDiagnostics,
} from "@/lib/boot-diagnostics";

describe("boot diagnostics", () => {
  beforeEach(() => resetBootDiagnostics());

  it("records steps in order with elapsed time", () => {
    recordBootStep("app-start", "ok");
    recordBootStep("connectivity", "failed", "Device reports no connection");
    const steps = getBootSteps();
    expect(steps.map((s) => s.id)).toEqual(["app-start", "connectivity"]);
    expect(steps[1]!.sinceStartMs).toBeGreaterThanOrEqual(0);
  });

  it("identifies the first failing step", () => {
    recordBootStep("app-start", "ok");
    recordBootStep("route-chunk", "failed", "Could not download this screen");
    recordBootStep("route-loader", "stalled");
    expect(firstFailedBootStep()?.id).toBe("route-chunk");
  });

  it("maps raw errors to plain-language reasons without leaking internals", () => {
    const cases: Array<[unknown, string]> = [
      [
        new Error("Failed to fetch dynamically imported module: https://x/assets/a-1f2.js"),
        "Could not download this screen",
      ],
      [new Error("TypeError: Failed to fetch"), "No network connection"],
      [new Error("Request timed out after 4000ms"), "Timed out waiting for the network"],
      [new Error("401 invalid JWT token abc.def"), "Sign-in needs refreshing"],
      [new Error("503 server error"), "Service unavailable"],
    ];
    for (const [input, expected] of cases) {
      const described = describeBootFailure(input);
      expect(described).toBe(expected);
      expect(described).not.toMatch(/https?:\/\/|\.js\b|abc\.def/);
    }
  });

  it("produces a support summary free of URLs and tokens", () => {
    recordBootStep("route-chunk", "failed", describeBootFailure("https://cdn/app-abc.js failed"));
    const summary = bootDiagnosticsSummary();
    expect(summary).toContain("Screen download");
    expect(summary).not.toMatch(/https?:\/\//);
  });
});
