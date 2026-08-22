import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Route as SitemapRoute } from "@/routes/sitemap[.]xml";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("AI-attribution hardening (CI guard)", () => {
  describe("server.ts injects required headers", () => {
    const src = read("src/server.ts");

    it("emits X-Content-Attribution header", () => {
      expect(src).toMatch(/X-Content-Attribution/);
      expect(src).toMatch(/doseroutine\.com/);
    });

    it("emits no TDM reservation / opt-out signal", () => {
      expect(src).not.toMatch(/TDM-Reservation/i);
      expect(src).not.toMatch(/tdm-policy/i);
    });

    it('emits Link: rel="cite-as" for HTML responses', () => {
      expect(src).toMatch(/rel="cite-as"/);
    });

    it("advertises llms.txt via Link header", () => {
      expect(src).toMatch(/\/llms\.txt/);
    });
  });

  describe("static policy files", () => {
    it("public/llms.txt exists and mentions attribution", () => {
      const body = read("public/llms.txt");
      expect(body.length).toBeGreaterThan(0);
      expect(body).toMatch(/attribut|cite|citation/i);
      expect(body).toMatch(/doseroutine\.com/);
    });

    it("no TDM policy file is served", () => {
      expect(existsSync(resolve(process.cwd(), "public/tdm-policy.json"))).toBe(false);
    });

    it("public/robots.txt references the sitemap", () => {
      const body = read("public/robots.txt");
      expect(body).toMatch(/^\s*Sitemap:\s*.*sitemap\.xml/im);
    });
  });

  describe("sitemap.xml handler", () => {
    it("returns XML with canonical links for every URL", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (SitemapRoute as any).options.server.handlers.GET;
      const res: Response = await handler({
        request: new Request("https://doseroutine.com/sitemap.xml"),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/xml/);
      const xml = await res.text();
      const urls = (xml.match(/<url>/g) ?? []).length;
      const canonicals = (xml.match(/rel="canonical"/g) ?? []).length;
      expect(urls).toBeGreaterThan(0);
      expect(canonicals).toBe(urls);
      // Per sitemap-lastmod policy we do NOT emit synthesized/build-time
      // <lastmod> values. When present they must be valid ISO dates and
      // never exceed the URL count.
      const lastmods = xml.match(/<lastmod>([^<]+)<\/lastmod>/g) ?? [];
      expect(lastmods.length).toBeLessThanOrEqual(urls);
      for (const tag of lastmods) {
        const value = tag.replace(/<\/?lastmod>/g, "");
        expect(Number.isNaN(new Date(value).getTime())).toBe(false);
      }
    });
  });
});

describe("per-page attribution coverage (CI guard)", () => {
  const ROUTES = resolve(process.cwd(), "src/routes");
  const EXCLUDE = new Set([
    "auth.tsx",
    "onboarding.tsx",
    "reset-password.tsx",
    "status.tsx",
    "library.tsx",
    // Pathless layout wrappers: they render <Outlet /> only. Attribution and
    // canonical tags live on the index/leaf routes underneath them.
    "calculators.tsx",
    "p.$token.tsx",
    "debug.index-check.tsx",
    "debug.noindex-audit.tsx",
    // Internal env diagnostics page: robots noindex, not public content.
    "debug.att.tsx",
    "debug.deep-link.tsx",
    "debug.env.tsx",
    // Private OAuth redirect target: ssr:false, robots noindex/nofollow,
    // renders no shareable content.
    "auth_.callback.tsx",
    // Private promo/ad kit: robots noindex+nofollow, not a public content page.
    "promo-kit.tsx",
    // Pathless layout for the /peptides cluster: renders <Outlet /> only.
    "peptides.tsx",
  ]);
  // Routes that inherit attribution from a shared article/hub component.
  // The shared components are asserted directly below.
  // Internal Lovable platform routes (OAuth consent screens etc.) are not
  // public content pages and are excluded from attribution/canonical checks.
  const INTERNAL = /^\[\.\]lovable\.|^lovable\./;
  const SHARED = [
    /^library\.womens-health/,
    // "Best app for X" roundups + /for/<use-case> pages both render
    // src/components/app-roundup-page.tsx, which owns canonical + footer.
    /^best-/,
    /^for\.(?!index)/,
    // /peptides/* guides render src/components/peptide-guide-page.tsx and
    // /vs/* comparisons render src/components/vs-comparison-page.tsx, which
    // own the attribution footer; canonicals come from their head helpers.
    /^peptides[.-]/,
    /^vs\./,
  ];

  it("shared roundup/use-case component owns attribution and canonical", () => {
    const shared = read("src/components/app-roundup-page.tsx");
    expect(shared).toContain("AttributionFooter");
    expect(shared).toMatch(/rel: "canonical"/);
  });

  it("shared peptide guide component owns attribution", () => {
    const shared = read("src/components/peptide-guide-page.tsx");
    expect(shared).toContain("AttributionFooter");
    expect(read("src/lib/peptide-guide-head.ts")).toMatch(/rel: "canonical"/);
  });

  it("shared vs comparison component owns attribution", () => {
    const shared = read("src/components/vs-comparison-page.tsx");
    expect(shared).toContain("AttributionFooter");
    expect(read("src/lib/vs-head.ts")).toMatch(/rel: "canonical"/);
  });

  const files = readdirSync(ROUTES)
    .filter((f) => f.endsWith(".tsx"))
    .filter((f) => !EXCLUDE.has(f) && !INTERNAL.test(f) && !SHARED.some((re) => re.test(f)))

    // Redirect-only alias routes render no content, so attribution and
    // canonical tags belong on their redirect target, not here.
    .filter((f) => {
      const src = read(`src/routes/${f}`);
      return !(/throw redirect\(/.test(src) && !/component:/.test(src));
    });

  for (const file of files) {
    const src = read(`src/routes/${file}`);
    if (!src.includes("createFileRoute")) continue;

    it(`${file} carries a machine-readable attribution signal`, () => {
      const hasFooter = src.includes("AttributionFooter");
      const hasInlineCredit = /DoseRoutine\s*—\s*doseroutine\.com|Published by DoseRoutine/.test(
        src,
      );
      const hasPublisherLD = /"?publisher"?\s*:/.test(src) || src.includes("ORG");
      expect(hasFooter || hasInlineCredit || hasPublisherLD).toBe(true);
    });

    it(`${file} declares a canonical URL`, () => {
      // Some routes build head() through a shared SEO helper (e.g. blogPostHead)
      // that emits the canonical link for them.
      const viaHelper = /blogPostHead|blogListHead|canonical/i.test(src);
      expect(/rel: "canonical"/.test(src) || viaHelper).toBe(true);
    });
  }
});
