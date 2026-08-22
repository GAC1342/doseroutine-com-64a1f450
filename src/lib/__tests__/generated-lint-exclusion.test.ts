/**
 * Guard: the auto-generated backend integration files stay excluded from both
 * ESLint and Prettier no matter what the generator writes into them.
 *
 * The exclusion must be path-based (a directory glob), never a per-file entry
 * or anything derived from file contents — regeneration rewrites these files
 * wholesale and may add, rename, or reshape them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const GENERATED_DIR = "src/integrations/supabase";

/** Existing generated files plus hypothetical future ones the generator may add. */
const GENERATED_FILES = [
  "types.ts",
  "client.ts",
  "client.server.ts",
  "auth-attacher.ts",
  "auth-middleware.ts",
  // Not present today: proves the rule matches the directory, not a file list.
  "future-generated-helper.ts",
  "nested/deep-generated.ts",
];

describe("generated backend types lint exclusion", () => {
  it("ignores every file under the generated directory", async () => {
    const eslint = new ESLint({ cwd: ROOT });
    const results = await Promise.all(
      GENERATED_FILES.map(async (file) => ({
        file,
        ignored: await eslint.isPathIgnored(path.join(ROOT, GENERATED_DIR, file)),
      })),
    );
    const linted = results.filter((r) => !r.ignored).map((r) => r.file);
    expect(linted, `expected ESLint to ignore:\n  ${linted.join("\n  ")}`).toEqual([]);
  });

  it("still lints ordinary source files", async () => {
    const eslint = new ESLint({ cwd: ROOT });
    expect(await eslint.isPathIgnored(path.join(ROOT, "src/lib/deep-link.ts"))).toBe(false);
  });

  it("excludes the directory from Prettier as well", () => {
    const ignore = readFileSync(path.join(ROOT, ".prettierignore"), "utf8");
    const entries = ignore
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    expect(entries).toContain(GENERATED_DIR);
  });

  it("uses a directory glob rather than a content-dependent file list", () => {
    const config = readFileSync(path.join(ROOT, "eslint.config.js"), "utf8");
    expect(config).toContain(`"${GENERATED_DIR}/**"`);
    expect(config).not.toContain(`"${GENERATED_DIR}/types.ts"`);
  });
});
