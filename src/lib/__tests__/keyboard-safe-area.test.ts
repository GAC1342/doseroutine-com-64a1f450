import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * H1 regression guard — keyboard compensation contract.
 *
 * The native shell must NOT resize the webview (that double-pads on top of the
 * app's own inset), which only works while CSS applies `--keyboard-inset`
 * globally. If either half changes alone, the on-screen keyboard either covers
 * inputs or leaves a huge gap under them.
 */
const config = readFileSync("capacitor.config.ts", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const tracker = readFileSync("src/lib/keyboard-inset.ts", "utf8");
const appShell = readFileSync("src/components/app-shell.tsx", "utf8");
const stackRoute = readFileSync("src/routes/_authenticated/stack.tsx", "utf8");
const libraryRoute = readFileSync("src/routes/library.index.tsx", "utf8");
const libraryShell = readFileSync("src/components/library-shell.tsx", "utf8");

describe("keyboard inset contract", () => {
  it("keeps native keyboard resizing off", () => {
    expect(config).toMatch(/Keyboard:\s*\{[^}]*resize:\s*"none"/s);
    expect(config).not.toMatch(/resize:\s*"(body|ionic|native)"/);
  });

  it("applies the inset app-wide, not on a single screen", () => {
    expect(styles).toMatch(/body\s*\{[^}]*padding-bottom:\s*var\(--keyboard-inset, 0px\)/s);
    expect(styles).toMatch(/html\s*\{[^}]*scroll-padding-bottom:[^;]*--keyboard-inset/s);
  });

  it("scrolls any focused field clear of the keyboard", () => {
    expect(styles).toMatch(
      /input,\s*\n\s*textarea,\s*\n\s*select,[\s\S]*?scroll-margin-bottom:[^;]*--keyboard-inset/,
    );
  });

  it("keeps visualViewport as a fallback when the native plugin exists", () => {
    expect(tracker).toContain('viewport.addEventListener("resize", syncViewport)');
    expect(tracker).toContain("Math.max(nativeInset, viewportInset)");
    expect(tracker).not.toMatch(/if\s*\(!plugin\)\s*\{[^}]*viewport\.addEventListener/s);
  });

  it("does not discard the initial viewport measurement", () => {
    expect(tracker).toContain("syncViewport();");
    expect(tracker).not.toContain("setInset(0);");
  });

  it("keeps bottom navigation clear and stack actions reachable", () => {
    expect(appShell).toMatch(/keyboard-hide[^\n]*fixed[^\n]*bottom-0/);
    expect(stackRoute).toMatch(/keyboard-lift sticky/);
    expect(styles).toMatch(/html\[data-keyboard-open\] \.keyboard-hide/);
    expect(styles).toMatch(/\.keyboard-lift\s*\{[^}]*bottom:\s*var\(--keyboard-inset/s);
  });

  it("has one global tracker and keeps library links in-app", () => {
    expect(libraryRoute).not.toContain("trackKeyboardInset");
    expect(libraryShell).not.toContain('href="https://doseroutine.com"');
    expect(libraryShell).not.toContain('href="/legal"');
  });
});
