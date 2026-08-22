/**
 * Gate: the repo stays fully formatted and the auto-generated backend files
 * stay excluded from the formatter no matter what the generator writes.
 *
 * `prettier --check .` must report zero actionable failures. Exclusions must be
 * path-based (directory globs), so regeneration — which rewrites these files
 * wholesale and may add or rename files — can never reintroduce failures.
 */
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(__dirname, "../../..");
const PRETTIER_BIN = path.join(ROOT, "node_modules/.bin/prettier");

/** Directories whose contents are generated/derived and must never be formatted. */
const GENERATED_DIRS = ["src/integrations/supabase", "test-results", "playwright-report"];

/** Generated files, including ones that do not exist yet, to prove glob matching. */
const GENERATED_FILES = [
  "src/integrations/supabase/types.ts",
  "src/integrations/supabase/client.ts",
  "src/integrations/supabase/future-generated-helper.ts",
  "src/integrations/supabase/nested/deep-generated.ts",
  "src/routeTree.gen.ts",
  "src/routes/mcp.ts",
];

async function prettierFileInfo(file: string) {
  const { stdout } = await execFileAsync(PRETTIER_BIN, ["--file-info", file, "--no-color"], {
    cwd: ROOT,
  });
  return JSON.parse(stdout) as { ignored: boolean; inferredParser: string | null };
}

describe("prettier formatting gate", () => {
  it("reports zero actionable formatting failures across the repo", async () => {
    let stdout = "";
    let stderr = "";
    let failed = false;
    try {
      const result = await execFileAsync(PRETTIER_BIN, ["--check", ".", "--no-color"], {
        cwd: ROOT,
        maxBuffer: 32 * 1024 * 1024,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string };
      stdout = e.stdout ?? "";
      stderr = e.stderr ?? "";
      failed = true;
    }

    const offenders = `${stdout}\n${stderr}`
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line &&
          !line.startsWith("Checking formatting") &&
          !line.startsWith("All matched files") &&
          !line.startsWith("[warn] Code style issues found") &&
          !line.startsWith("Run Prettier"),
      )
      .map((line) => line.replace(/^\[warn]\s*/, ""));

    expect(
      offenders,
      `prettier --check reported unformatted files:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
    expect(failed).toBe(false);
  }, 180_000);

  it("keeps generated exclusions path-based in .prettierignore", () => {
    const entries = readFileSync(path.join(ROOT, ".prettierignore"), "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    for (const dir of GENERATED_DIRS) {
      expect(entries, `.prettierignore must exclude ${dir}`).toContain(dir);
    }
    // A per-file entry would break the moment the generator renames a file.
    expect(entries).not.toContain("src/integrations/supabase/types.ts");
  });

  it("ignores generated files that exist and ones the generator may add later", async () => {
    const infos = await Promise.all(
      GENERATED_FILES.map(async (file) => ({
        file,
        exists: existsSync(path.join(ROOT, file)),
        ...(await prettierFileInfo(file)),
      })),
    );
    const notIgnored = infos.filter((i) => !i.ignored).map((i) => i.file);
    expect(notIgnored, `expected Prettier to ignore:\n  ${notIgnored.join("\n  ")}`).toEqual([]);
  });

  it("still formats ordinary source files", async () => {
    const info = await prettierFileInfo("src/lib/deep-link.ts");
    expect(info.ignored).toBe(false);
    expect(info.inferredParser).toBe("typescript");
  });
});
