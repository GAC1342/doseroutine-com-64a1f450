import { describe, expect, it } from "vitest";
import {
  MODULE_PRELOAD_BUDGET,
  capModulePreloads,
  countHeadChildren,
  mergeJsonLd,
} from "@/lib/head-budget";

function html(preloads: number): string {
  const links = Array.from(
    { length: preloads },
    (_, i) => `<link href="/assets/chunk-${i}.js" rel="modulepreload"/>`,
  ).join("");
  return `<html><head><meta charset="utf-8"/>${links}<title>t</title></head><body></body></html>`;
}

describe("capModulePreloads", () => {
  it("keeps every hint when under budget", () => {
    const out = capModulePreloads(html(5));
    expect(out.match(/rel="modulepreload"/g)).toHaveLength(5);
  });

  it("drops hints past the budget, keeping the earliest ones", () => {
    const out = capModulePreloads(html(30));
    expect(out.match(/rel="modulepreload"/g)).toHaveLength(MODULE_PRELOAD_BUDGET);
    expect(out).toContain("chunk-0.js");
    expect(out).not.toContain("chunk-29.js");
  });

  it("leaves other head tags untouched", () => {
    const out = capModulePreloads(html(30));
    expect(out).toContain("<title>t</title>");
    expect(out).toContain('<meta charset="utf-8"/>');
  });

  it("keeps head under the 60-child crawler warning threshold", () => {
    expect(countHeadChildren(capModulePreloads(html(40)))).toBeLessThan(60);
  });
});

describe("mergeJsonLd", () => {
  const a =
    '<script type="application/ld+json" nonce="n1">{"@context":"https://schema.org","@type":"Organization","name":"DoseRoutine"}</script>';
  const b =
    '<script type="application/ld+json" nonce="n1">{"@context":"https://schema.org","@graph":[{"@type":"FAQPage"},{"@type":"BreadcrumbList"}]}</script>';

  it("collapses blocks into one @graph script keeping every node", () => {
    const out = mergeJsonLd(`<head>${a}${b}</head>`);
    const tags = out.match(/type="application\/ld\+json"/g) ?? [];
    expect(tags).toHaveLength(1);
    const json = JSON.parse(/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(out)![1]);
    expect(json["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual([
      "Organization",
      "FAQPage",
      "BreadcrumbList",
    ]);
    expect(out).toContain('nonce="n1"');
  });

  it("leaves a single block untouched", () => {
    expect(mergeJsonLd(`<head>${a}</head>`)).toBe(`<head>${a}</head>`);
  });

  it("bails out when any block is unparseable", () => {
    const bad = '<script type="application/ld+json">{oops</script>';
    const html = `<head>${a}${bad}</head>`;
    expect(mergeJsonLd(html)).toBe(html);
  });
});
