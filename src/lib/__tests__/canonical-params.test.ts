import { describe, expect, it } from "vitest";
import { canonicalUrl, isDuplicateParam, stripDuplicateParams } from "@/lib/canonical-params";

describe("duplicate query parameters", () => {
  it("flags locale and tracking parameters", () => {
    for (const key of ["lang", "n", "utm_source", "UTM_Medium", "fbclid", "gclid", "ref"]) {
      expect(isDuplicateParam(key)).toBe(true);
    }
  });

  it("keeps parameters that change the rendered page", () => {
    for (const key of ["page", "q", "slug", "tab"]) {
      expect(isDuplicateParam(key)).toBe(false);
    }
  });

  it("strips every ?lang=xx copy back onto the canonical path", () => {
    for (const locale of ["es", "fr", "de", "ja", "zh", "pt-BR"]) {
      expect(canonicalUrl(`https://doseroutine.com/library/creatine?lang=${locale}`)).toBe(
        "https://doseroutine.com/library/creatine",
      );
    }
  });

  it("preserves meaningful parameters while dropping duplicates", () => {
    expect(canonicalUrl("https://doseroutine.com/blog?page=2&lang=es&utm_source=x")).toBe(
      "https://doseroutine.com/blog?page=2",
    );
  });

  it("reports whether a redirect is needed", () => {
    const clean = new URL("https://doseroutine.com/blog?page=2");
    expect(stripDuplicateParams(clean)).toBe(false);
    const dirty = new URL("https://doseroutine.com/blog?n=es");
    expect(stripDuplicateParams(dirty)).toBe(true);
    expect(dirty.toString()).toBe("https://doseroutine.com/blog");
  });
});
