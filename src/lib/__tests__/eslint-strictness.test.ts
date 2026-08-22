import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pins the lint guards that catch the class of bug behind the /food crash
 * ("Cannot access 'c' before initialization"): a duplicated block that called
 * a hook inside a useMemo and referenced a later const.
 *
 * If someone relaxes these, this test fails before the crash ships.
 */
const config = readFileSync(resolve(process.cwd(), "eslint.config.js"), "utf8");
const tsconfig = readFileSync(resolve(process.cwd(), "tsconfig.json"), "utf8");

describe("eslint strictness guards", () => {
  it("keeps rules-of-hooks fatal", () => {
    expect(config).toMatch(/"react-hooks\/rules-of-hooks":\s*"error"/);
  });

  it("keeps exhaustive-deps visible", () => {
    expect(config).toMatch(/"react-hooks\/exhaustive-deps":\s*"warn"/);
  });

  it("enables the temporal-dead-zone rule for variables", () => {
    expect(config).toMatch(/"@typescript-eslint\/no-use-before-define"/);
    expect(config).toMatch(/variables:\s*true/);
  });

  it("keeps duplicate-declaration rules fatal", () => {
    for (const rule of [
      "@typescript-eslint/no-redeclare",
      "@typescript-eslint/no-dupe-class-members",
      "no-dupe-keys",
      "no-dupe-args",
      "no-dupe-else-if",
      "no-duplicate-case",
      "no-unreachable",
      "no-constant-binary-expression",
    ]) {
      expect(config.includes(`"${rule}": "error"`), `${rule} must stay an error`).toBe(true);
    }
  });
});

describe("typescript strictness guards", () => {
  it("keeps strict mode and override checks on", () => {
    expect(tsconfig).toMatch(/"strict":\s*true/);
    expect(tsconfig).toMatch(/"noImplicitOverride":\s*true/);
    expect(tsconfig).toMatch(/"noFallthroughCasesInSwitch":\s*true/);
    expect(tsconfig).toMatch(/"forceConsistentCasingInFileNames":\s*true/);
  });
});
