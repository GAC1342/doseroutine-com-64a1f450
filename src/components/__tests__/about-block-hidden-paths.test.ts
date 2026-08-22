import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isHiddenPath } from "@/components/about-doseroutine-block";

/**
 * The sitewide "About DoseRoutine" block is public marketing (it pitches the
 * free trial). It must never render on a signed-in app screen. This test walks
 * the authenticated route tree so a newly added screen fails here instead of
 * quietly showing a sign-up pitch to a paying user.
 */
function authenticatedPaths(): string[] {
  const base = join(process.cwd(), "src/routes/_authenticated");
  const out: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}/${entry.name}`);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const b = entry.name.replace(/\.tsx?$/, "");
      if (b === "route") continue;
      const segs = b.split(".").filter((s) => s !== "index");
      out.push(segs.length > 0 ? `${prefix}/${segs.join("/")}` : prefix);
    }
  };
  walk(base, "");
  return out;
}

describe("About DoseRoutine block visibility", () => {
  const paths = authenticatedPaths();

  it("discovers the authenticated routes", () => {
    expect(paths).toContain("/today");
    expect(paths.length).toBeGreaterThan(20);
  });

  it("is hidden on every signed-in screen", () => {
    for (const path of paths) {
      const url = path.replace(/\/\$[a-zA-Z]+$/, "/example");
      expect(isHiddenPath(url), url).toBe(true);
    }
  });

  it("still renders on public marketing and library pages", () => {
    for (const path of ["/", "/library", "/library/creatine", "/peptide-calculator", "/goals"]) {
      expect(isHiddenPath(path), path).toBe(false);
    }
  });
});
