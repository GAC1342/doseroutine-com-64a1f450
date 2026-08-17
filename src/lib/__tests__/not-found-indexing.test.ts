import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isDisallowedByRobots,
  nonIndexableProbePaths,
  notFoundProbePaths,
  parseRobotsDisallow,
} from "../non-indexable";

const robotsTxt = readFileSync("public/robots.txt", "utf8");
const disallow = parseRobotsDisallow(robotsTxt);
const serverSrc = readFileSync("src/server.ts", "utf8");
const rootSrc = readFileSync("src/routes/__root.tsx", "utf8");
const validatorSrc = readFileSync("scripts/validate-noindex-audit.py", "utf8");

describe("404 / not-found indexability", () => {
  it("robots.txt disallows every 404 probe that requires a rule", () => {
    const uncovered = notFoundProbePaths()
      .filter((p) => p.requiresRobotsRule && !isDisallowedByRobots(p.path, disallow))
      .map((p) => p.path);
    expect(uncovered).toEqual([]);
  });

  it("server.ts sets X-Robots-Tag: noindex on every 404 HTML response", () => {
    expect(serverSrc).toMatch(/response\.status === 404/);
    expect(serverSrc).toMatch(/headers\.set\("X-Robots-Tag", "noindex, nofollow"\)/);
  });

  it("server.ts sends Cache-Control: private, no-store on 404 responses", () => {
    const block = serverSrc.slice(serverSrc.indexOf("function applyCacheHeaders"));
    const notFoundBranch = block.slice(block.indexOf("response.status === 404"));
    expect(notFoundBranch).toMatch(/cache-control", "private, no-store"/);
    // the cacheable HTML branch must never be reachable for a 404
    expect(block.indexOf("response.status === 404")).toBeLessThan(block.indexOf("s-maxage"));
  });

  it("the live validator asserts 404 cache headers", () => {
    expect(validatorSrc).toContain("private, no-store");
  });

  it("the root NotFoundComponent renders a noindex meta tag", () => {
    const notFoundBlock = rootSrc.slice(rootSrc.indexOf("function NotFoundComponent"));
    expect(notFoundBlock).toMatch(/<meta\s+name="robots"\s+content="noindex, nofollow"\s*\/>/);
    expect(rootSrc).toMatch(/notFoundComponent: NotFoundComponent/);
  });

  it("keeps the live validator's probe list in sync with the shared source of truth", () => {
    const generated = JSON.parse(readFileSync("scripts/noindex-probe-paths.json", "utf8"));
    expect(generated.nonIndexable).toEqual(nonIndexableProbePaths());
    expect(generated.notFound).toEqual(notFoundProbePaths());
  });

  it("the live validator script exists and reads the generated probe list", () => {
    expect(validatorSrc).toContain("noindex-probe-paths.json");
    expect(validatorSrc).toContain("expect404");
  });
});
