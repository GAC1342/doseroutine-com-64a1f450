import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { segmentedTabClass, chipClass } from "@/components/ui/segmented-tabs";

const css = readFileSync(path.join(process.cwd(), "src/styles.css"), "utf8");

function lightness(token: string, block: string): number {
  const scoped = css.slice(css.indexOf(block));
  const match = scoped.match(new RegExp(`${token}:\\s*oklch\\(([0-9.]+)`));
  if (!match) throw new Error(`token ${token} not found in ${block}`);
  return Number(match[1]);
}

describe("segmented control visibility", () => {
  it("keeps the tab-strip track clearly distinct from the page background (light)", () => {
    const bg = lightness("--background", ":root {");
    const track = lightness("--surface-track", ":root {");
    expect(Math.abs(bg - track)).toBeGreaterThanOrEqual(0.04);
  });

  it("keeps the tab-strip track clearly distinct from the page background (dark)", () => {
    const bg = lightness("--background", ".dark {");
    const track = lightness("--surface-track", ".dark {");
    expect(Math.abs(bg - track)).toBeGreaterThanOrEqual(0.04);
  });

  it("signals the active tab with more than color", () => {
    const active = segmentedTabClass(true);
    expect(active).toContain("font-semibold");
    expect(active).toContain("border-border");
    expect(active).toContain("shadow-sm");
  });

  it("keeps inactive tabs and chips readable and visibly tappable", () => {
    expect(segmentedTabClass(false)).toContain("text-foreground/75");
    expect(chipClass(false)).toContain("border-border");
    expect(chipClass(false)).toContain("bg-card");
  });
});
