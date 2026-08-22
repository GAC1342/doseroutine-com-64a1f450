import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/platform", () => ({ isNative: () => true }));

import { installExternalLinkHandler } from "@/lib/external-link";

describe("external link interceptor (L2)", () => {
  let cleanup: () => void;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    cleanup = installExternalLinkHandler();
  });

  afterEach(() => {
    cleanup();
    openSpy.mockRestore();
    document.body.innerHTML = "";
  });

  it("still intercepts an external anchor that stops click propagation", () => {
    const a = document.createElement("a");
    a.href = "https://example.com/study";
    a.textContent = "Study";
    a.addEventListener("click", (e) => e.stopPropagation());
    document.body.appendChild(a);

    const evt = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    a.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/study",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("leaves internal links alone", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "/today");
    document.body.appendChild(a);

    const evt = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    a.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(full)) out.push(full);
  }
  return out;
}

describe("no dead contact controls (H1 / L3)", () => {
  const files = [...walk("src/routes"), ...walk("src/components")];

  it("has no empty tel:/mailto: hrefs", () => {
    const offenders = files.filter((f) =>
      /href=["'](tel:|mailto:)["']/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("shows the support address as visible text next to every mailto link", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // Only literal support mailto links: dynamic ones (editorial contact,
      // share-with-clinician) render the address they were given.
      if (!src.includes('href="mailto:support@doseroutine.com')) continue;
      const links =
        src.match(/href="mailto:support@doseroutine\.com[^"]*"[\s\S]{0,300}?<\/a>/g) ?? [];
      if (
        links.some(
          (l) => !l.includes("support@doseroutine.com<") && !/>\s*support@doseroutine\.com/.test(l),
        )
      ) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("no dead or placeholder controls (H1)", () => {
  const files = [...walk("src/routes"), ...walk("src/components")].filter(
    (f) => !f.includes("__tests__"),
  );

  it("has no anchors that navigate nowhere", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // href="#" / href="" / href="javascript:..." are all no-op taps on iOS.
      if (/href=["'](#|)["']/.test(src) || /href=["']javascript:/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("ships no placeholder / coming-soon copy on user-facing controls", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (/>\s*(Coming soon|TODO|Lorem ipsum|Placeholder)\s*</i.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("has no buttons wired to an empty handler", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (/onClick=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/.test(src)) offenders.push(f);
      if (/onClick=\{\s*undefined\s*\}/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
