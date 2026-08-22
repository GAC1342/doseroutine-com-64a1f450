import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Server-rendered structured-data contract.
 *
 * Audit crawlers and most answer engines read the raw HTML response — they do
 * not run our JavaScript. So this spec never opens a browser page: it fetches
 * the HTML over HTTP and parses it directly, which is exactly what Google's
 * rich-results parser, Bing, and the site-audit bots see.
 *
 * It asserts three things per route:
 *   1. Microdata is present in the response body (body itemscope WebPage, the
 *      Organization publisher block, isPartOf pointing at the WebSite node).
 *   2. JSON-LD parses and contains the expected node types with valid fields.
 *   3. The two describe the SAME entity — a microdata publisher named
 *      "DoseRoutine" and a JSON-LD Organization named something else would be
 *      a silent conflict that degrades trust in rich results.
 */

const ROUTES = ["/", "/blog", "/for", "/library/creatine"];

const ORG_NAME = "DoseRoutine";
const SITE_ORIGIN = "https://doseroutine.com";

type JsonLdNode = Record<string, unknown>;

async function fetchHtml(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path, { headers: { accept: "text/html" } });
  expect(res.status(), `${path} should render server-side`).toBe(200);
  return await res.text();
}

/** All JSON-LD objects in the document, flattened out of arrays and @graph. */
function readJsonLd(html: string): JsonLdNode[] {
  const blocks = Array.from(
    html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ).map((m) => m[1]);
  expect(blocks.length, "page has at least one JSON-LD block").toBeGreaterThan(0);

  const nodes: JsonLdNode[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) return void value.forEach(push);
    if (!value || typeof value !== "object") return;
    const obj = value as JsonLdNode;
    nodes.push(obj);
    if (obj["@graph"]) push(obj["@graph"]);
  };

  for (const raw of blocks) {
    const decoded = raw.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(decoded);
    }, "JSON-LD block is valid JSON").not.toThrow();
    push(parsed);
  }
  return nodes;
}

function typesOf(node: JsonLdNode): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function nodesOfType(nodes: JsonLdNode[], type: string): JsonLdNode[] {
  return nodes.filter((n) => typesOf(n).includes(type));
}

/** Microdata attributes are case-insensitive in HTML; SSR may emit either form. */
function hasAttr(html: string, attr: string, value?: string): boolean {
  const pattern = value
    ? new RegExp(`${attr}\\s*=\\s*"${value.replace(/[/.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i")
    : new RegExp(`${attr}\\s*=`, "i");
  return pattern.test(html);
}

/** Value of the element carrying itemprop="name" style microdata. */
function itemPropContent(html: string, prop: string): string | null {
  const re = new RegExp(`<(?:meta|link|a|span|div)[^>]*itemprop\\s*=\\s*"${prop}"[^>]*>`, "i");
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  return tag.match(/(?:content|href)\s*=\s*"([^"]*)"/i)?.[1] ?? null;
}

for (const route of ROUTES) {
  test.describe(`structured data on ${route}`, () => {
    test("microdata and JSON-LD are both server-rendered and agree", async ({ request }) => {
      const html = await fetchHtml(request, route);

      // --- 1. Microdata ------------------------------------------------
      const bodyTag = html.match(/<body[^>]*>/i)?.[0] ?? "";
      expect(bodyTag, "<body> carries itemscope").toMatch(/itemscope/i);
      expect(bodyTag, "<body> is typed as a WebPage").toMatch(
        /itemtype\s*=\s*"https:\/\/schema\.org\/WebPage"/i,
      );

      expect(
        hasAttr(html, "itemtype", "https://schema.org/Organization"),
        "publisher Organization microdata block is present",
      ).toBe(true);
      expect(
        itemPropContent(html, "publisher") !== null || /itemprop\s*=\s*"publisher"/i.test(html),
      ).toBe(true);

      const microName = itemPropContent(html, "name");
      const microUrl = itemPropContent(html, "url");
      const microLogo = itemPropContent(html, "logo");
      const microIsPartOf = itemPropContent(html, "isPartOf");

      expect(microName, "microdata publisher name").toBe(ORG_NAME);
      expect(microUrl, "microdata organization url").toBe(SITE_ORIGIN);
      expect(microLogo ?? "", "microdata logo is an absolute https URL").toMatch(
        /^https:\/\/[^"]+\.(png|jpg|jpeg|svg|webp)$/i,
      );
      expect(microIsPartOf, "page declares the WebSite it belongs to").toBe(
        `${SITE_ORIGIN}/#website`,
      );

      // --- 2. JSON-LD --------------------------------------------------
      const nodes = readJsonLd(html);

      const orgs = nodesOfType(nodes, "Organization");
      expect(orgs.length, "an Organization node exists").toBeGreaterThan(0);
      const org = orgs[0];
      expect(org["name"]).toBe(ORG_NAME);
      expect(String(org["url"] ?? "")).toMatch(/^https:\/\/doseroutine\.com\/?$/);

      const sites = nodesOfType(nodes, "WebSite");
      expect(sites.length, "a WebSite node exists").toBeGreaterThan(0);
      const site = sites[0];
      expect(String(site["@id"] ?? ""), "WebSite has the @id microdata points at").toBe(
        `${SITE_ORIGIN}/#website`,
      );
      expect(String(site["url"] ?? "")).toMatch(/^https:\/\/doseroutine\.com\/?$/);

      // Every node must be typed and use the schema.org context somewhere.
      for (const node of nodes) {
        if (node["@context"]) {
          expect(String(node["@context"])).toMatch(/schema\.org/);
        }
      }
      expect(nodes.every((n) => typesOf(n).length > 0 || "@graph" in n)).toBe(true);

      // Any URL-bearing field must be absolute — relative URLs are ignored by
      // consumers and are the most common silent structured-data defect.
      for (const node of nodes) {
        for (const key of ["url", "logo", "image", "sameAs"]) {
          const value = node[key];
          const values = Array.isArray(value) ? value : [value];
          for (const v of values) {
            if (typeof v === "string" && v.startsWith("/")) {
              throw new Error(`${route}: JSON-LD ${key} is relative ("${v}")`);
            }
          }
        }
      }

      // --- 3. Microdata and JSON-LD describe the same entity -----------
      expect(org["name"], "JSON-LD and microdata name the same publisher").toBe(microName);
      expect(String(org["url"]).replace(/\/$/, "")).toBe(microUrl);
      const jsonLogo =
        typeof org["logo"] === "string" ? org["logo"] : (org["logo"] as JsonLdNode)?.["url"];
      if (jsonLogo) expect(String(jsonLogo)).toBe(microLogo);
      expect(site["@id"], "isPartOf resolves to the declared WebSite node").toBe(microIsPartOf);
    });

    test("declares a canonical URL and an indexable robots directive", async ({ request }) => {
      const html = await fetchHtml(request, route);
      const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
      expect(canonical, `${route} has a canonical link`).toBeTruthy();
      expect(canonical!).toMatch(/^https:\/\/doseroutine\.com/);
      // Only real <meta> tags count — the preview-host guard script mentions
      // "noindex" in inline JS that never runs on the production domain.
      const robotsMetas = Array.from(html.matchAll(/<meta[^>]+name="robots"[^>]*>/gi)).map(
        (m) => m[0],
      );
      for (const meta of robotsMetas) {
        expect(meta, `${route} robots meta must stay indexable`).not.toMatch(/noindex/i);
      }
    });
  });
}

test("the WebSite node exposes a SearchAction with a query template", async ({ request }) => {
  const html = await fetchHtml(request, "/");
  const site = nodesOfType(readJsonLd(html), "WebSite")[0];
  const action = site?.["potentialAction"] as JsonLdNode | JsonLdNode[] | undefined;
  const first = Array.isArray(action) ? action[0] : action;
  expect(first, "WebSite declares a SearchAction").toBeTruthy();
  expect(typesOf(first as JsonLdNode)).toContain("SearchAction");
  const target = (first as JsonLdNode)["target"];
  const template =
    typeof target === "string" ? target : String((target as JsonLdNode)?.["urlTemplate"] ?? "");
  expect(template, "search target is an absolute template").toMatch(/^https:\/\/doseroutine\.com/);
  expect(template, "search target interpolates the query").toContain("{search_term_string}");
});
