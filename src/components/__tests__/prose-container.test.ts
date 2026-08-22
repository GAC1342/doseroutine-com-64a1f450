/**
 * Enforces that all long-form copy renders inside the shared container.
 *
 * Runs the same rules as `scripts/check-prose-container.mjs` inside the unit
 * test suite, so a route that hand-rolls its own prose wrapper fails locally
 * and in CI without anyone remembering to run the script.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { auditSource } from "../../../scripts/check-prose-container.mjs";
import { PROSE_CONTAINER_CLASS } from "@/components/prose-container";

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(path));
    else if (entry.name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

describe("shared prose container", () => {
  const proseFiles = collect("src/routes").filter((file) =>
    readFileSync(file, "utf8").includes("<PageProse"),
  );

  it("is used by at least the known long-form routes", () => {
    expect(proseFiles.length).toBeGreaterThanOrEqual(20);
  });

  it("keeps one measure and one gutter", () => {
    expect(PROSE_CONTAINER_CLASS).toContain("max-w-3xl");
    expect(PROSE_CONTAINER_CLASS).toContain("px-4");
    expect(PROSE_CONTAINER_CLASS).toContain("mx-auto");
  });

  it.each(proseFiles)("%s wraps its long-form copy in <ProseContainer>", (file) => {
    const problems = auditSource(readFileSync(file, "utf8"), file);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("flags a route that renders prose outside the container", () => {
    const bad = `
      <main>
        <PageProse id="x" />
      </main>
    `;
    expect(auditSource(bad, "fake.tsx").length).toBeGreaterThan(0);
  });

  it("flags a hand-rolled max-w container around prose", () => {
    const bad = [
      'import { ProseContainer } from "@/components/prose-container";',
      '<div className="mx-auto w-full max-w-3xl px-4">',
      '  <PageProse id="x" />',
      "</div>",
    ].join("\n");
    expect(auditSource(bad, "fake.tsx").length).toBeGreaterThan(0);
  });
});
