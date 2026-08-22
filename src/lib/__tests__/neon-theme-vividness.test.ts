import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { COLOR_THEMES } from "@/lib/theme";

/**
 * Static guard against the neon palettes going dull again.
 *
 * Parses the real token values out of src/styles.css and asserts, per neon
 * theme and per scheme:
 *   - the primary is genuinely saturated (chroma floor),
 *   - button text on the primary still clears WCAG AA (4.5:1),
 *   - the primary as text on the page background still clears AA,
 *   - the glow/edge decoration tokens exist so the neon look survives.
 */

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

type Oklch = { l: number; c: number; h: number };

function parseOklch(value: string): Oklch {
  const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`not an oklch value: ${value}`);
  return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) };
}

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.matchAll(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, "g"))];
  if (matches.length === 0) throw new Error(`missing CSS block: ${selector}`);
  const out: Record<string, string> = {};
  for (const line of matches
    .map((x) => x[1])
    .join(";")
    .split(";")) {
    const [prop, ...rest] = line.split(":");
    if (!prop?.trim() || rest.length === 0) continue;
    out[prop.trim()] = rest.join(":").trim();
  }
  return out;
}

function srgb({ l: L, c: C, h }: Oklch): [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  // Gamma-encode to sRGB and clip into gamut, matching what the screen shows.
  const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  return lin.map((v) => Math.min(1, Math.max(0, encode(v)))) as [number, number, number];
}

function luminance(color: Oklch): number {
  const [r, g, b] = srgb(color).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const NEON_IDS = COLOR_THEMES.map((t) => t.id).filter((id: string) => id.startsWith("neon-"));
const LIGHT_BG = parseOklch(block(":root")["--background"] ?? "oklch(0.99 0.002 250)");
const DARK_BG = parseOklch(block(".dark")["--background"] ?? "oklch(0.17 0.006 60)");

/** Lowest chroma we still consider "neon" per hue family (sRGB gamut limited). */
const CHROMA_FLOOR: Record<string, number> = {
  "neon-blue": 0.16,
  "neon-pink": 0.2,
  "neon-green": 0.14,
  "neon-yellow": 0.1,
};

describe("neon themes stay vivid and accessible", () => {
  it("ships all four neon themes", () => {
    expect(NEON_IDS.sort()).toEqual(["neon-blue", "neon-green", "neon-pink", "neon-yellow"]);
  });

  for (const id of NEON_IDS) {
    for (const [scheme, selector, bg] of [
      ["light", `[data-theme="${id}"]`, LIGHT_BG],
      ["dark", `.dark[data-theme="${id}"]`, DARK_BG],
    ] as const) {
      it(`${id} (${scheme}) is saturated and passes AA`, () => {
        const tokens = block(selector);
        const primary = parseOklch(tokens["--primary"]!);
        const fg = parseOklch(tokens["--primary-foreground"]!);

        expect(primary.c).toBeGreaterThanOrEqual(CHROMA_FLOOR[id]!);
        // Button label on the filled primary surface.
        expect(contrast(primary, fg)).toBeGreaterThanOrEqual(4.5);
        // Primary used as text/icon color on the page background.
        expect(contrast(primary, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("defines the glow decoration tokens for neon themes only", () => {
    expect(css).toMatch(/\[data-theme\^="neon-"\]\s*\{[^}]*--primary-glow/);
    expect(css).toMatch(/\[data-theme\^="neon-"\]\s*\{[^}]*--primary-edge/);
    expect(block(":root")["--primary-glow"]).toBe("transparent");
  });

  it("applies the glow to primary surfaces and the active segmented tab", () => {
    expect(css).toContain('[data-theme^="neon-"] :where(.bg-primary)');
    expect(css).toContain('[data-theme^="neon-"] :where(.segmented-tab-active)');
  });
});
