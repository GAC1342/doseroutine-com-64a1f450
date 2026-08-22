import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { GLOSSARY_TERMS, definedTermSetNode, isGlossaryTerm } from "@/lib/spelling-glossary";
import { ALIAS_PATHS, URL_ALIASES, resolveAlias } from "@/lib/url-aliases";

describe("spelling glossary", () => {
  it("accepts brand and compound spellings", () => {
    for (const word of ["DoseRoutine", "doseroutine", "tirzepatide", "Ipamorelin", "peptides"]) {
      expect(isGlossaryTerm(word)).toBe(true);
    }
  });

  it("does not accept ordinary typos", () => {
    expect(isGlossaryTerm("suplement")).toBe(false);
    expect(isGlossaryTerm("")).toBe(false);
  });

  it("emits a reference-only DefinedTermSet by default", () => {
    const node = definedTermSetNode();
    expect(node["@type"]).toBe("DefinedTermSet");
    expect("hasDefinedTerm" in node).toBe(false);
  });

  it("emits every entry described when terms are requested", () => {
    const node = definedTermSetNode({ includeTerms: true });
    const terms = node.hasDefinedTerm ?? [];
    expect(terms.length).toBeGreaterThan(10);
    for (const term of terms) {
      expect(term.name.length).toBeGreaterThan(2);
      expect(term.description.length).toBeGreaterThan(10);
    }
    expect(GLOSSARY_TERMS).toContain("DoseRoutine");
  });
});

describe("url aliases", () => {
  it("resolves descriptive aliases to the unchanged canonical slugs", () => {
    expect(resolveAlias("/health-tracking-blog")).toBe("/blog");
    expect(resolveAlias("/who-doseroutine-is-for/")).toBe("/for");
    expect(resolveAlias("/blog")).toBeNull();
  });

  it("keeps alias paths out of the sitemap route", () => {
    const sitemap = readFileSync("src/routes/sitemap[.]xml.ts", "utf8");
    for (const alias of ALIAS_PATHS) {
      expect(sitemap).not.toContain(alias);
    }
  });

  it("ships a 301 route file for every alias", () => {
    for (const { alias, canonical } of URL_ALIASES) {
      const file = `src/routes/${alias.slice(1)}.tsx`;
      const src = readFileSync(file, "utf8");
      expect(src).toContain("statusCode: 301");
      expect(src).toContain(`to: "${canonical}"`);
    }
  });
});

describe("micromarkup", () => {
  it("root layout renders the shared microdata block inside the body", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    expect(root).toContain("<PageMicrodata />");
    // Scopes belong to body content: crawlers skip itemscope on <body>.
    expect(root).not.toContain("<body {...{ itemscope");
    expect(root).not.toContain("itemType=");

    expect(root).toContain("definedTermSetNode()");
  });

  it("page microdata scopes carry their own itemprops with visible values", () => {
    const src = readFileSync("src/components/page-microdata.tsx", "utf8");
    // Attributes must be lowercase in source so the rendered HTML matches
    // case-sensitive audit crawlers.
    for (const type of ["WebPage", "WebSite", "Organization"]) {
      expect(src).toContain(`itemtype: "https://schema.org/${type}"`);
    }
    expect(src).toContain('itemprop: "name"');
    expect(src).toContain('itemprop: "description"');
    // React 19 hoists <meta> into <head>, stranding itemprops outside scope.
    expect(src).not.toMatch(/<meta \{\.\.\.\{ itemprop/);
  });
});
