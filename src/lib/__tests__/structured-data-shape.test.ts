import { describe, expect, it } from "vitest";
import {
  formatShape,
  normalizeUrlValue,
  readJsonLdNodes,
  readMicrodata,
  structuredDataShape,
} from "../structured-data-shape";

const HTML = `
<body itemscope itemtype="https://schema.org/WebPage">
  <div itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
    <span itemprop="name">DoseRoutine</span>
    <a itemprop="url" href="https://doseroutine.com/"></a>
  </div>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"Organization","@id":"https://doseroutine.com/#org","name":"DoseRoutine","logo":"/logo.png"},
      {"@type":["WebSite","CreativeWork"],"url":"https://doseroutine.com/","name":"DoseRoutine"}
    ]}
  </script>
</body>`;

describe("structuredDataShape", () => {
  it("collapses absolute URLs so snapshots survive a host change", () => {
    expect(normalizeUrlValue("https://doseroutine.com/blog?p=1")).toBe("{origin}/blog?p=1");
    expect(normalizeUrlValue("http://localhost:8080/blog?p=1")).toBe("{origin}/blog?p=1");
    expect(normalizeUrlValue("https://schema.org/Article")).toBe("https://schema.org/Article");
    expect(normalizeUrlValue("/relative")).toBe("/relative");
  });

  it("flattens @graph nodes and joins multi-type nodes", () => {
    const types = readJsonLdNodes(HTML).map((n) => n["@type"]);
    expect(types).toContainEqual("Organization");
    const shape = structuredDataShape(HTML);
    expect(shape.jsonLd.map((n) => n.type)).toContain("CreativeWork+WebSite");
  });

  it("records field names without the volatile values", () => {
    const org = structuredDataShape(HTML).jsonLd.find((n) => n.type === "Organization")!;
    expect(org.fields).toEqual(["@id", "@type", "logo", "name"]);
    expect(org.identity["@id"]).toBe("{origin}/#org");
    expect(org.identity["name"]).toBe("DoseRoutine");
  });

  it("captures microdata scopes and their itemprops", () => {
    const microdata = readMicrodata(HTML);
    expect(microdata.map((m) => m.itemtype)).toEqual([
      "https://schema.org/Organization",
      "https://schema.org/WebPage",
    ]);
    const org = microdata.find((m) => m.itemtype.endsWith("Organization"))!;
    expect(org.itemprops).toEqual(["name", "url"]);
    const page = microdata.find((m) => m.itemtype.endsWith("WebPage"))!;
    expect(page.itemprops).toContain("publisher");
  });

  it("detects a dropped field as a shape change", () => {
    const without = HTML.replace('"name":"DoseRoutine","logo":"/logo.png"', '"logo":"/logo.png"');
    expect(formatShape(structuredDataShape(without))).not.toBe(
      formatShape(structuredDataShape(HTML)),
    );
  });

  it("ignores prose edits inside the markup", () => {
    const reworded = HTML.replace('"logo":"/logo.png"', '"logo":"/logo-v2.png"');
    expect(formatShape(structuredDataShape(reworded))).toBe(formatShape(structuredDataShape(HTML)));
  });

  it("survives a malformed JSON-LD block without throwing", () => {
    const broken = `${HTML}<script type="application/ld+json">{oops</script>`;
    expect(() => structuredDataShape(broken)).not.toThrow();
  });
});
