import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COLOR_THEMES } from "../theme";

const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

/** Extracts the declarations inside a `selector { ... }` block. */
function block(selector: string): Record<string, string> {
  const idx = css.indexOf(`${selector} {`);
  if (idx < 0) throw new Error(`Missing CSS block: ${selector}`);
  const start = css.indexOf("{", idx);
  const end = css.indexOf("}", start);
  const body = css.slice(start + 1, end);
  const out: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/** Rough relative luminance for an oklch() literal, good enough for AA gating. */
function oklchToRgb(value: string): [number, number, number] {
  const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`Not an oklch literal: ${value}`);
  const L = parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const h = (parseFloat(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;

  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  return lin.map((v) => Math.min(1, Math.max(0, v))) as [number, number, number];
}

function luminance(value: string): number {
  const [r, g, b] = oklchToRgb(value);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// Tokens that must be identical no matter which theme is selected.
// Severity carries clinical meaning; cta/pro carry commercial meaning.
const INVARIANT = [
  "--synergy",
  "--caution",
  "--warning",
  "--avoid",
  "--missed",
  "--success",
  "--destructive",
  "--cta",
  "--pro",
];

describe("color themes", () => {
  const themeIds = COLOR_THEMES.map((t) => t.id);

  it("defines a light and dark block for every theme", () => {
    for (const id of themeIds) {
      expect(() => block(`[data-theme="${id}"]`)).not.toThrow();
      expect(() => block(`.dark[data-theme="${id}"]`)).not.toThrow();
    }
  });

  it("never overrides severity, success or money tokens", () => {
    for (const id of themeIds) {
      for (const sel of [`[data-theme="${id}"]`, `.dark[data-theme="${id}"]`]) {
        const decls = block(sel);
        for (const token of INVARIANT) {
          expect(decls[token], `${sel} must not override ${token}`).toBeUndefined();
        }
      }
    }
  });

  it("keeps primary/primary-foreground above 4.5:1 in light and dark", () => {
    for (const id of themeIds) {
      for (const sel of [`[data-theme="${id}"]`, `.dark[data-theme="${id}"]`]) {
        const decls = block(sel);
        const ratio = contrast(decls["--primary"], decls["--primary-foreground"]);
        expect(ratio, `${sel} primary contrast (${ratio.toFixed(2)}:1)`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it("declares the full brand token set for every theme", () => {
    const required = [
      "--primary",
      "--primary-hover",
      "--primary-tint",
      "--primary-foreground",
      "--ring",
    ];
    for (const id of themeIds) {
      for (const sel of [`[data-theme="${id}"]`, `.dark[data-theme="${id}"]`]) {
        const decls = block(sel);
        for (const token of required) {
          expect(decls[token], `${sel} missing ${token}`).toBeTruthy();
        }
      }
    }
  });
});
