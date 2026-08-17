import { test, expect, type Page } from "@playwright/test";

/**
 * Structured-data contract test.
 *
 * Search engines read the JSON-LD `citation[]` array; readers read the visible
 * "Sources and references" list. If those two drift — a different order, a
 * missing entry, an `@id` that points at an anchor that isn't on the page —
 * the page claims sources it doesn't visibly show, which is exactly the kind of
 * mismatch that costs trust in rich results.
 *
 * This spec asserts, per page, that every JSON-LD citation node lines up with
 * the numbered reference it claims to be: same position, same anchor id, same
 * URL, same publisher, same title.
 */

const PAGES = ["/library/creatine", "/library/retatrutide", "/library/bpc-157"];

type CitationNode = {
  "@type"?: string | string[];
  "@id"?: string;
  position?: number;
  name?: string;
  url?: string;
  publisher?: { "@type"?: string; name?: string };
};

/** Every JSON-LD object on the page, flattened out of @graph containers. */
async function readJsonLdNodes(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
  const nodes: Record<string, unknown>[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    nodes.push(obj);
    if (obj["@graph"]) push(obj["@graph"]);
  };
  for (const raw of blocks) {
    expect(() => JSON.parse(raw), "JSON-LD block is not valid JSON").not.toThrow();
    push(JSON.parse(raw));
  }
  return nodes;
}

/**
 * The first load of a page can be interrupted by a reload (dev-server module
 * discovery), which destroys the execution context mid-read. Retry the read
 * rather than failing on an infrastructure hiccup.
 */
async function stableRead<T>(page: Page, read: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      await page.waitForLoadState("load").catch(() => undefined);
      await page.locator('li[id^="source-"]').first().waitFor({ timeout: 15_000 });
    }
  }
  throw lastError;
}

/** The visible numbered reference list, read straight out of the DOM. */
async function readVisibleReferences(page: Page) {
  return page.locator('li[id^="source-"]').evaluateAll((els) =>
    els.map((el) => {
      const link = el.querySelector("a[href]") as HTMLAnchorElement | null;
      const label = el.getAttribute("aria-label") ?? "";
      // aria-label is "Reference <n>: <title>, <publisher>"
      const match = /^Reference (\d+): (.*), ([^,]+)$/.exec(label);
      return {
        id: el.id,
        n: Number(el.id.replace("source-", "")),
        url: link?.href ?? null,
        title: match?.[2] ?? null,
        publisher: match?.[3] ?? null,
      };
    }),
  );
}

for (const path of PAGES) {
  test(`JSON-LD citation[] matches the visible reference list on ${path}`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${path} did not load`).toBeLessThan(400);

    const nodes = await stableRead(page, () => readJsonLdNodes(page));
    expect(nodes.length, "expected JSON-LD on the page").toBeGreaterThan(0);

    const withCitations = nodes.filter((n) => Array.isArray(n["citation"]));
    expect(withCitations.length, "expected a JSON-LD node carrying citation[]").toBeGreaterThan(0);

    const visible = await stableRead(page, () => readVisibleReferences(page));
    expect(visible.length, "expected a visible numbered reference list").toBeGreaterThan(0);

    // The visible list is the source of truth; only linkable entries are cited.
    const linkable = visible.filter((v) => v.url);

    for (const node of withCitations) {
      const raw = node["citation"] as unknown[];
      const nodeName = String(node["@type"] ?? "unknown");

      // citation[] legitimately mixes a self-citation string and
      // ScholarlyArticle records for primary literature. The reference-list
      // contract only covers the numbered source nodes (@id "...#source-n").
      const citations = raw.filter(
        (c): c is CitationNode =>
          !!c && typeof c === "object" && typeof (c as CitationNode)["@id"] === "string" &&
          (c as CitationNode)["@id"]!.includes("#source-"),
      );

      expect(
        citations.length,
        `${nodeName}: citation[] carries ${citations.length} numbered sources but the page shows ${linkable.length} linked references`,
      ).toBe(linkable.length);

      citations.forEach((c, i) => {
        const ref = linkable[i]!;
        const where = `${nodeName} citation[${i}]`;

        // schema.org structure: a typed node with a name, url and publisher.
        expect(c["@type"], `${where} is missing @type`).toBeTruthy();
        expect(c.url, `${where} is missing url`).toBeTruthy();
        expect(c.publisher?.["@type"], `${where}.publisher is not an Organization`).toBe(
          "Organization",
        );

        // Numbering: position must equal the visible reference number.
        expect(c.position, `${where}.position must match visible reference ${ref.n}`).toBe(ref.n);

        // Anchor: @id must resolve to the exact list item on this page.
        expect(
          c["@id"]!.endsWith(`#${ref.id}`),
          `${where}.@id "${c["@id"]}" does not point at #${ref.id}`,
        ).toBe(true);

        // Content: same destination, publisher and title the reader sees.
        expect(c.url, `${where}.url differs from the visible link`).toBe(ref.url);
        expect(c.publisher?.name, `${where}.publisher.name differs from reference ${ref.n}`).toBe(
          ref.publisher,
        );
        expect(c.name, `${where}.name differs from reference ${ref.n}`).toBe(ref.title);
      });

      // Anchors must be unique within a single citation[] array too.
      const ids = citations.map((c) => c["@id"]);
      expect(new Set(ids).size, `${nodeName}: duplicate citation @id values`).toBe(ids.length);
    }

    // Every cited anchor must actually exist, exactly once, in the document.
    const anchorIds = [
      ...new Set(
        (withCitations[0]!["citation"] as unknown[])
          .map((c) =>
            c && typeof c === "object" ? ((c as CitationNode)["@id"]?.split("#")[1] ?? "") : "",
          )
          .filter((id) => id.startsWith("source-")),
      ),
    ];
    expect(anchorIds.length, "expected numbered citation anchors").toBeGreaterThan(0);
    for (const id of anchorIds) {
      await expect(page.locator(`#${id}`), `#${id} from JSON-LD is missing or duplicated`).toHaveCount(
        1,
      );
    }
  });
}

/**
 * Marker-level contract.
 *
 * The visible inline markers ("[3]") are what a reader clicks; the JSON-LD
 * citation[] is what a crawler reads. This asserts they describe the same
 * reference: every marker number resolves to a citation node with the same
 * `position`, an `@id` anchored at that marker's target, and the same
 * publisher/title the marker announces.
 */
async function readMarkers(page: Page) {
  return page
    .locator('a[href^="#source-"][data-no-citation-modal="true"]')
    .evaluateAll((els) =>
      els.map((el) => {
        const href = el.getAttribute("href") ?? "";
        const label = el.getAttribute("aria-label") ?? "";
        const match = /^Reference (\d+): (.*), ([^,]+)$/.exec(label);
        return {
          href,
          n: Number(href.replace("#source-", "")),
          labelledN: match ? Number(match[1]) : null,
          title: match?.[2] ?? null,
          publisher: match?.[3] ?? null,
          text: (el.textContent ?? "").trim(),
        };
      }),
    );
}

for (const path of PAGES) {
  test(`JSON-LD citation[] matches the visible inline markers on ${path}`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${path} did not load`).toBeLessThan(400);

    const nodes = await stableRead(page, () => readJsonLdNodes(page));
    const citations = nodes
      .flatMap((n) => (Array.isArray(n["citation"]) ? (n["citation"] as unknown[]) : []))
      .filter(
        (c): c is CitationNode =>
          !!c &&
          typeof c === "object" &&
          typeof (c as CitationNode)["@id"] === "string" &&
          (c as CitationNode)["@id"]!.includes("#source-"),
      );
    expect(citations.length, "expected numbered JSON-LD citations").toBeGreaterThan(0);

    // Index citations by the anchor they claim, so a marker lookup is exact.
    // Several nodes (e.g. MedicalWebPage and Article) legitimately repeat the
    // same citation[] array, so a repeated anchor is fine as long as the two
    // copies describe the identical reference.
    const byAnchor = new Map<string, CitationNode>();
    for (const c of citations) {
      const anchor = c["@id"]!.split("#")[1]!;
      const seen = byAnchor.get(anchor);
      if (seen) {
        expect(
          JSON.stringify(c),
          `#${anchor} is described differently by two JSON-LD nodes`,
        ).toBe(JSON.stringify(seen));
        continue;
      }
      byAnchor.set(anchor, c);
    }

    const markers = await stableRead(page, () => readMarkers(page));
    expect(markers.length, "expected inline citation markers").toBeGreaterThan(0);

    for (const m of markers) {
      const anchor = `source-${m.n}`;
      const c = byAnchor.get(anchor);
      expect(c, `marker ${m.text} has no JSON-LD citation with @id "#${anchor}"`).toBeTruthy();

      // The visible glyph, the announced number and the schema position are all
      // the same reference number.
      expect(m.text, `marker for #${anchor} renders the wrong number`).toBe(`[${m.n}]`);
      expect(m.labelledN, `marker aria-label for #${anchor} announces the wrong number`).toBe(m.n);
      expect(c!.position, `citation for #${anchor} has a mismatched position`).toBe(m.n);
      expect(
        c!["@id"]!.endsWith(`#${anchor}`),
        `citation @id "${c!["@id"]}" does not anchor at #${anchor}`,
      ).toBe(true);

      // And they describe the same document.
      expect(c!.publisher?.name, `citation ${m.n} publisher differs from the marker`).toBe(
        m.publisher,
      );
      expect(c!.name, `citation ${m.n} name differs from the marker`).toBe(m.title);

      await expect(page.locator(`#${anchor}`), `#${anchor} is missing or duplicated`).toHaveCount(1);
    }
  });
}
