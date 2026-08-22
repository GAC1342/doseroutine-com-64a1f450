import { describe, expect, it } from "vitest";
import { prettifySlug, resolveTrail, shouldRenderTrail } from "@/lib/site-breadcrumbs";

describe("shouldRenderTrail", () => {
  it("skips the homepage and app screens", () => {
    expect(shouldRenderTrail("/")).toBe(false);
    expect(shouldRenderTrail("/today")).toBe(false);
    expect(shouldRenderTrail("/settings/notifications")).toBe(false);
    expect(shouldRenderTrail("/auth")).toBe(false);
  });

  it("skips pages that already render their own trail", () => {
    expect(shouldRenderTrail("/library/testosterone-trt")).toBe(false);
    expect(shouldRenderTrail("/interactions/zinc-and-levothyroxine")).toBe(false);
    expect(shouldRenderTrail("/calculators/bpc-157-dosage-calculator")).toBe(false);
    expect(shouldRenderTrail("/blog/tag/compound/semaglutide")).toBe(false);
  });

  it("renders for public content pages that lacked one", () => {
    for (const path of [
      "/about",
      "/articles/glp-1-protein",
      "/help/getting-started",
      "/goals/fertility",
      "/peptides/bpc-157",
      "/vs/bearable",
      "/for/trt",
      "/library",
      "/library/guides/hexarelin-protocol",
    ]) {
      expect(shouldRenderTrail(path), path).toBe(true);
    }
  });

  it("ignores query strings and trailing slashes", () => {
    expect(shouldRenderTrail("/blog?page=3")).toBe(true);
    expect(resolveTrail("/about/")).toEqual([{ label: "About", path: "/about" }]);
    expect(resolveTrail("/blog?page=3")).toEqual([{ label: "Blog", path: "/blog" }]);
  });
});

describe("resolveTrail", () => {
  it("builds a section + page trail", () => {
    expect(resolveTrail("/peptides/bpc-157")).toEqual([
      { label: "Peptides", path: "/peptides" },
      { label: "BPC 157", path: "/peptides/bpc-157" },
    ]);
  });

  it("nests legal pages under /legal", () => {
    expect(resolveTrail("/cookies")).toEqual([
      { label: "Legal", path: "/legal" },
      { label: "Cookies", path: "/cookies" },
    ]);
  });

  it("drops the non-page /library/guides segment", () => {
    expect(resolveTrail("/library/guides/hexarelin-protocol")).toEqual([
      { label: "Library", path: "/library" },
      { label: "Hexarelin protocol", path: "/library/guides/hexarelin-protocol" },
    ]);
  });

  it("returns null where a page owns its trail", () => {
    expect(resolveTrail("/")).toBeNull();
    expect(resolveTrail("/library/tamoxifen")).toBeNull();
  });

  it("never produces an empty label", () => {
    for (const path of [
      "/articles/how-much-protein-while-on-a-glp-1",
      "/help/reminders",
      "/vs/dosecast",
    ]) {
      const trail = resolveTrail(path)!;
      expect(trail.length).toBeGreaterThan(0);
      trail.forEach((c) => expect(c.label.trim().length).toBeGreaterThan(0));
    }
  });
});

describe("prettifySlug", () => {
  it("upper-cases known acronyms and keeps codes", () => {
    expect(prettifySlug("trt-dosage")).toBe("TRT dosage");
    expect(prettifySlug("bpc-157")).toBe("BPC 157");
    expect(prettifySlug("glp-1-protein")).toBe("GLP-1 protein");
  });

  it("sentence-cases ordinary slugs", () => {
    expect(prettifySlug("getting-started-with-reminders")).toBe("Getting started with reminders");
  });
});
