/**
 * C1 regression guard. Route options and route components land in separate
 * chunks; a shared module-scope constant that isn't exported becomes a
 * "does not provide an export named 'X'" white-screen on direct navigation.
 * This has shipped twice, so it is now a test as well as a CI job.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// @ts-expect-error -- plain .mjs lint script, no type declarations
import { analyzeRouteSource as analyzeUntyped } from "../../../scripts/check-route-split-exports.mjs";

const analyzeRouteSource = analyzeUntyped as (source: string) => { name: string; line: number }[];

describe("route split export analyzer", () => {
  it("flags a shared constant that is not exported", () => {
    const src = `
const FAQ = [{ q: "a", a: "b" }];
export const Route = createFileRoute("/x")({
  head: () => ({ scripts: [faqJsonLd(FAQ)] }),
  component: Page,
});
function Page() {
  return <div>{FAQ.length}</div>;
}
`;
    expect(analyzeRouteSource(src).map((v) => v.name)).toEqual(["FAQ"]);
  });

  it("accepts an exported shared constant", () => {
    const src = `
export const FAQ = [{ q: "a", a: "b" }];
export const Route = createFileRoute("/x")({
  head: () => ({ scripts: [faqJsonLd(FAQ)] }),
  component: Page,
});
function Page() {
  return <div>{FAQ.length}</div>;
}
`;
    expect(analyzeRouteSource(src)).toEqual([]);
  });

  it("ignores constants used only by the component", () => {
    const src = `
const LOCAL = 1;
export const Route = createFileRoute("/x")({ component: Page });
function Page() {
  return <div>{LOCAL}</div>;
}
`;
    expect(analyzeRouteSource(src)).toEqual([]);
  });
});

describe("repository route files", () => {
  it("has no unexported constants shared across the split boundary", () => {
    expect(() =>
      execFileSync("node", ["scripts/check-route-split-exports.mjs"], { stdio: "pipe" }),
    ).not.toThrow();
  });
});
