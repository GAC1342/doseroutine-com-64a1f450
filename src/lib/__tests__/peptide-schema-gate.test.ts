import { describe, expect, it } from "vitest";
import { PEPTIDE_CLUSTER_PATHS } from "@/lib/peptide-cluster-links";

/**
 * Build-time JSON-LD gate for the /peptides education cluster.
 *
 * Every page in the cluster must ship a valid, complete structured-data set:
 * BreadcrumbList, an Article-family node, and FAQPage with real questions.
 * Rich results are silently dropped when a required property is missing, so
 * this test fails the build rather than letting a page ship without them.
 */

/** Route module file for each cluster path. */
const ROUTE_FILES: Record<string, string> = {
  "/peptides": "peptides.index",
  "/peptides-calculator": "peptides-calculator",
  "/peptides/bpc-157": "peptides.bpc-157",
  "/peptides/tb-500": "peptides.tb-500",
  "/peptides/semax": "peptides.semax",
  "/peptides/peptide-bond": "peptides.peptide-bond",
  "/peptides/collagen-peptides": "peptides.collagen-peptides",
  "/peptides/cell-penetrating-peptides": "peptides.cell-penetrating-peptides",
  "/peptides/how-to-vet-a-peptide-supplier": "peptides.how-to-vet-a-peptide-supplier",
  "/peptides/bacteriostatic-water": "peptides.bacteriostatic-water",
  "/peptides/how-to-reconstitute-peptides": "peptides.how-to-reconstitute-peptides",
  "/peptides/peptide-dosage-chart": "peptides.peptide-dosage-chart",
  "/peptides/cjc-1295-ipamorelin": "peptides.cjc-1295-ipamorelin",
  "/peptides/retatrutide-dosing": "peptides.retatrutide-dosing",
};

type HeadScript = { type?: string; children?: string };
type HeadPayload = {
  meta?: Array<Record<string, string>>;
  links?: Array<Record<string, string>>;
  scripts?: HeadScript[];
};

const ARTICLE_TYPES = new Set(["Article", "TechArticle", "MedicalWebPage", "BlogPosting"]);

async function headFor(path: string): Promise<HeadPayload> {
  const file = ROUTE_FILES[path];
  const mod = (await import(`../../routes/${file}.tsx`)) as {
    Route: { options: { head?: (ctx: unknown) => HeadPayload } };
  };
  const head = mod.Route.options.head;
  expect(head, `${path} must define head()`).toBeTypeOf("function");
  return head!({ params: {}, loaderData: undefined, matches: [] });
}

/** Parses every JSON-LD script on the page into a flat list of nodes. */
function jsonLdNodes(head: HeadPayload): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const script of head.scripts ?? []) {
    if (script.type !== "application/ld+json") continue;
    expect(script.children, "JSON-LD script must have children").toBeTruthy();
    const parsed = JSON.parse(script.children!) as Record<string, unknown>;
    const graph = parsed["@graph"];
    if (Array.isArray(graph)) out.push(...(graph as Array<Record<string, unknown>>));
    else out.push(parsed);
  }
  return out;
}

function nodesOfType(nodes: Array<Record<string, unknown>>, type: string) {
  return nodes.filter((n) => {
    const t = n["@type"];
    return Array.isArray(t) ? t.includes(type) : t === type;
  });
}

describe.each(PEPTIDE_CLUSTER_PATHS)("JSON-LD contract: %s", (path) => {
  it("parses every JSON-LD block without error", async () => {
    const head = await headFor(path);
    expect(jsonLdNodes(head).length).toBeGreaterThan(0);
  });

  it("declares @context on every top-level block", async () => {
    const head = await headFor(path);
    for (const script of head.scripts ?? []) {
      if (script.type !== "application/ld+json") continue;
      const parsed = JSON.parse(script.children!) as Record<string, unknown>;
      expect(parsed["@context"], `${path} JSON-LD block missing @context`).toBe(
        "https://schema.org",
      );
    }
  });

  it("has a self-referencing canonical and og:url", async () => {
    const head = await headFor(path);
    const expected = `https://doseroutine.com${path}`;
    const canonical = (head.links ?? []).find((l) => l.rel === "canonical");
    expect(canonical?.href).toBe(expected);
    const ogUrl = (head.meta ?? []).find((m) => m.property === "og:url");
    expect(ogUrl?.content).toBe(expected);
  });

  it("has a complete BreadcrumbList ending on this page", async () => {
    const nodes = jsonLdNodes(await headFor(path));
    const [crumbs, ...extra] = nodesOfType(nodes, "BreadcrumbList");
    expect(crumbs, `${path} is missing BreadcrumbList`).toBeTruthy();
    expect(extra, `${path} has duplicate BreadcrumbList nodes`).toHaveLength(0);

    const items = crumbs!["itemListElement"] as Array<Record<string, unknown>>;
    expect(Array.isArray(items) && items.length > 0).toBe(true);
    items.forEach((item, i) => {
      expect(item["@type"]).toBe("ListItem");
      expect(item["position"]).toBe(i + 1);
      expect(String(item["name"] ?? "").length).toBeGreaterThan(0);
      expect(String(item["item"] ?? "")).toMatch(/^https:\/\/doseroutine\.com/);
    });
    expect(items.at(-1)!["item"]).toBe(`https://doseroutine.com${path}`);
  });

  it("has an Article-family node with the required properties", async () => {
    const nodes = jsonLdNodes(await headFor(path));
    const article = nodes.find((n) => {
      const t = n["@type"];
      const list = Array.isArray(t) ? t : [t];
      return list.some((x) => ARTICLE_TYPES.has(String(x)));
    });
    expect(article, `${path} is missing an Article/MedicalWebPage node`).toBeTruthy();

    const headline = String(article!["headline"] ?? article!["name"] ?? "");
    expect(headline.length, `${path} headline is empty`).toBeGreaterThan(10);
    expect(headline.length, `${path} headline exceeds 110 chars`).toBeLessThanOrEqual(110);
    expect(String(article!["description"] ?? "").length).toBeGreaterThan(50);

    for (const field of ["datePublished", "dateModified"] as const) {
      expect(String(article![field] ?? ""), `${path} ${field}`).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
    expect(article!["author"], `${path} article author`).toBeTruthy();
    expect(article!["publisher"], `${path} article publisher`).toBeTruthy();
  });

  it("has a FAQPage whose questions all carry an accepted answer", async () => {
    const nodes = jsonLdNodes(await headFor(path));
    const [faq, ...extra] = nodesOfType(nodes, "FAQPage");
    expect(faq, `${path} is missing FAQPage`).toBeTruthy();
    expect(extra, `${path} has duplicate FAQPage nodes`).toHaveLength(0);

    const questions = faq!["mainEntity"] as Array<Record<string, unknown>>;
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length, `${path} needs at least 3 FAQ entries`).toBeGreaterThanOrEqual(3);

    const seen = new Set<string>();
    for (const q of questions) {
      expect(q["@type"]).toBe("Question");
      const name = String(q["name"] ?? "");
      expect(name.length, `${path} FAQ question is empty`).toBeGreaterThan(5);
      expect(seen.has(name), `${path} duplicate FAQ question: ${name}`).toBe(false);
      seen.add(name);

      const answer = q["acceptedAnswer"] as Record<string, unknown> | undefined;
      expect(answer?.["@type"], `${path} answer for "${name}"`).toBe("Answer");
      expect(String(answer?.["text"] ?? "").length).toBeGreaterThan(30);
    }
  });
});

describe("cluster coverage", () => {
  it("maps every cluster path to a route module", () => {
    for (const path of PEPTIDE_CLUSTER_PATHS) {
      expect(ROUTE_FILES[path], `no route file mapped for ${path}`).toBeTruthy();
    }
  });
});
