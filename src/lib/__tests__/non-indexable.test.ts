import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isDisallowedByRobots,
  isIndexablePath,
  nonIndexableProbePaths,
  parseRobotsDisallow,
} from "../non-indexable";

const robotsTxt = readFileSync("public/robots.txt", "utf8");
const disallow = parseRobotsDisallow(robotsTxt);

describe("non-indexable path config", () => {
  it("robots.txt disallows every non-indexable path", () => {
    const uncovered = nonIndexableProbePaths()
      .filter(({ path }) => !isDisallowedByRobots(path, disallow))
      .map(({ path }) => path);
    expect(uncovered).toEqual([]);
  });

  it("treats every probe path as non-indexable", () => {
    for (const { path } of nonIndexableProbePaths()) {
      expect(isIndexablePath(path), path).toBe(false);
    }
  });

  it("keeps public content indexable", () => {
    for (const path of ["/", "/library", "/library/guides/hexarelin-protocol", "/pricing"]) {
      expect(isIndexablePath(path), path).toBe(true);
    }
  });
});
