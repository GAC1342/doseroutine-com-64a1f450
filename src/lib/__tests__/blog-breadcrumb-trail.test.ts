import { describe, expect, it } from "vitest";
import {
  blogTagArchiveTrail,
  blogTagHubTrail,
  trailToSchemaCrumbs,
} from "@/lib/blog-breadcrumb-trail";
import { breadcrumbSchema } from "@/lib/breadcrumb-schema";

describe("blog tag breadcrumb trail", () => {
  it("builds the hub trail", () => {
    expect(blogTagHubTrail().map((c) => c.label)).toEqual(["Home", "Research & Updates", "Tags"]);
  });

  it("ends an archive trail on the tag with no link", () => {
    const trail = blogTagArchiveTrail("compound", "Retatrutide", "retatrutide");
    expect(trail.map((c) => c.label)).toEqual([
      "Home",
      "Research & Updates",
      "Tags",
      "Compound",
      "Retatrutide",
    ]);
    expect(trail[trail.length - 1].link).toBeUndefined();
    expect(trail.slice(0, -1).every((c) => !!c.link)).toBe(true);
  });

  it("points the kind crumb at the matching hub section", () => {
    const trail = blogTagArchiveTrail("phase", "Phase 3", "phase-3");
    expect(trail[3].link).toEqual({ to: "/blog/tag", hash: "phase" });
    expect(trail[3].path).toBe("/blog/tag#phase");
  });

  it("emits BreadcrumbList items in the same order as the visible trail", () => {
    const trail = blogTagArchiveTrail(
      "mechanism",
      "GLP-1 receptor agonist",
      "glp-1-receptor-agonist",
    );
    const schema = breadcrumbSchema(
      "https://doseroutine.com/blog/tag/mechanism/glp-1-receptor-agonist",
      trailToSchemaCrumbs(trail),
    );
    expect(schema.itemListElement.map((i) => i.name)).toEqual(trail.map((c) => c.label));
    expect(schema.itemListElement.map((i) => i.position)).toEqual([1, 2, 3, 4, 5]);
    expect(schema.itemListElement[4].item).toBe(
      "https://doseroutine.com/blog/tag/mechanism/glp-1-receptor-agonist",
    );
  });
});
