import { describe, expect, it } from "vitest";
import {
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  isColorTheme,
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
} from "../theme";

/**
 * A saved accent only survives a refresh if three things agree: the id is a
 * known theme, the pre-hydration boot script whitelists it, and the storage key
 * it reads matches the one the provider writes.
 */
describe("theme persistence", () => {
  it("accepts every selectable theme id, including mint", () => {
    for (const t of COLOR_THEMES) expect(isColorTheme(t.id)).toBe(true);
    expect(isColorTheme("mint")).toBe(true);
    expect(isColorTheme("neon-mint")).toBe(false);
  });

  it("boot script whitelists every theme so none falls back to the default", () => {
    for (const t of COLOR_THEMES) {
      expect(THEME_BOOT_SCRIPT).toContain(`"${t.id}"`);
    }
    expect(THEME_BOOT_SCRIPT).toContain(`"${DEFAULT_COLOR_THEME}"`);
  });

  it("boot script reads the same storage key the provider writes", () => {
    expect(THEME_BOOT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });

  it("restores a stored mint selection through the boot script", () => {
    const store: Record<string, string> = { [THEME_STORAGE_KEY]: "mint" };
    const root = {
      attrs: {} as Record<string, string>,
      setAttribute(k: string, v: string) {
        this.attrs[k] = v;
      },
      classList: { toggle: () => {} },
    };
    const fn = new Function("document", "localStorage", "window", THEME_BOOT_SCRIPT) as (
      d: unknown,
      l: unknown,
      w: unknown,
    ) => void;
    fn(
      { documentElement: root },
      { getItem: (k: string) => store[k] ?? null },
      { matchMedia: () => ({ matches: false }) },
    );
    expect(root.attrs["data-theme"]).toBe("mint");
  });
});
