// Core structured-data (JSON-LD) validator. Server-only.
// Used by:
//  - src/routes/api/public/hooks/schema-validation.ts (scheduled cron)
//  - src/lib/schema-validation.functions.ts (on-demand admin server fn)

const SITE = "https://doseroutine.com";
const SITEMAP_URL = `${SITE}/sitemap.xml`;
const UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) DoseRoutineSchemaCheck/1.0";
const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;

export interface SchemaIssue {
  severity: "error" | "warning";
  message: string;
  blockIndex: number;
  typeHint?: string;
}

export interface UrlReport {
  url: string;
  status: number | null;
  blockCount: number;
  types: string[];
  issues: SchemaIssue[];
  fetchError?: string;
}

export interface SchemaReport {
  checkedAt: string;
  sitemapUrl: string;
  totalUrls: number;
  checkedUrls: number;
  urlsWithIssues: number;
  errorCount: number;
  warningCount: number;
  totalBlocks: number;
  reports: UrlReport[];
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

function parseSitemap(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) urls.push(m[1].trim());
  return urls;
}

function extractJsonLd(html: string): { parsed: unknown; parseError?: string }[] {
  const blocks: { parsed: unknown; parseError?: string }[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) {
      blocks.push({ parsed: null, parseError: "Empty JSON-LD block" });
      continue;
    }
    try {
      blocks.push({ parsed: JSON.parse(raw) });
    } catch (e) {
      blocks.push({
        parsed: null,
        parseError: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return blocks;
}

function typesOf(node: Record<string, unknown>): string[] {
  const t = node["@type"];
  if (Array.isArray(t)) return t.filter((x) => typeof x === "string") as string[];
  if (typeof t === "string") return [t];
  return [];
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function validateNode(node: unknown, blockIndex: number, inheritedContext = false): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  if (!isRecord(node)) {
    issues.push({
      severity: "error",
      blockIndex,
      message: "JSON-LD root is not an object",
    });
    return issues;
  }
  const ctx = node["@context"];
  if (!ctx && !inheritedContext) {
    issues.push({ severity: "error", blockIndex, message: "Missing @context" });
  } else if (typeof ctx === "string" && !ctx.includes("schema.org")) {
    issues.push({
      severity: "warning",
      blockIndex,
      message: `@context is not schema.org (${ctx})`,
    });
  }
  const graph = node["@graph"];
  const types = typesOf(node);
  if (types.length === 0 && Array.isArray(graph)) {
    for (const child of graph) {
      issues.push(...validateNode(child, blockIndex, Boolean(ctx) || inheritedContext));
    }
    return issues;
  }
  if (types.length === 0) {
    issues.push({ severity: "error", blockIndex, message: "Missing @type" });
    return issues;
  }

  for (const t of types) {
    const push = (severity: SchemaIssue["severity"], message: string) =>
      issues.push({ severity, blockIndex, typeHint: t, message });

    switch (t) {
      case "Article":
      case "NewsArticle":
      case "BlogPosting":
        if (!node.headline && !node.name) push("error", `${t} missing headline`);
        if (!node.author) push("warning", `${t} missing author`);
        if (!node.datePublished) push("warning", `${t} missing datePublished`);
        break;
      case "BreadcrumbList": {
        const items = node.itemListElement;
        if (!Array.isArray(items) || items.length === 0) {
          push("error", "BreadcrumbList missing itemListElement");
          break;
        }
        items.forEach((it: unknown, i: number) => {
          if (!isRecord(it)) {
            push("error", `BreadcrumbList item ${i} is not an object`);
            return;
          }
          if (it["@type"] !== "ListItem")
            push("error", `BreadcrumbList item ${i} @type is not ListItem`);
          if (typeof it.position !== "number")
            push("error", `BreadcrumbList item ${i} missing numeric position`);
          if (!it.name) push("error", `BreadcrumbList item ${i} missing name`);
          if (!it.item) push("error", `BreadcrumbList item ${i} missing item URL`);
        });
        break;
      }
      case "ItemList": {
        const items = node.itemListElement;
        if (!Array.isArray(items) || items.length === 0) {
          push("error", "ItemList missing itemListElement");
          break;
        }
        items.forEach((it: unknown, i: number) => {
          if (!isRecord(it)) {
            push("error", `ItemList item ${i} is not an object`);
            return;
          }
          if (typeof it.position !== "number")
            push("error", `ItemList item ${i} missing numeric position`);
          if (!it.url && !it.item) push("error", `ItemList item ${i} missing url/item`);
        });
        break;
      }
      case "CollectionPage":
      case "MedicalWebPage":
      case "WebPage":
        if (!node.name && !node.headline) push("error", `${t} missing name`);
        if (!node.url) push("warning", `${t} missing url`);
        break;
      case "FAQPage": {
        const items = node.mainEntity;
        if (!Array.isArray(items) || items.length === 0) {
          push("error", "FAQPage missing mainEntity");
          break;
        }
        items.forEach((q: unknown, i: number) => {
          if (!isRecord(q)) return;
          if (q["@type"] !== "Question") push("error", `FAQPage entry ${i} @type is not Question`);
          if (!q.name) push("error", `FAQPage entry ${i} missing name`);
          const ans = q.acceptedAnswer;
          if (!isRecord(ans) || !ans.text)
            push("error", `FAQPage entry ${i} missing acceptedAnswer.text`);
        });
        break;
      }
      case "MedicalSubstance":
      case "Drug":
        if (!node.name) push("error", `${t} missing name`);
        break;
      case "Organization":
      case "WebSite":
        if (!node.name) push("warning", `${t} missing name`);
        if (!node.url) push("warning", `${t} missing url`);
        break;
    }
  }
  return issues;
}

async function checkUrl(url: string): Promise<UrlReport> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return {
        url,
        status: res.status,
        blockCount: 0,
        types: [],
        issues: [
          {
            severity: "error",
            blockIndex: -1,
            message: `HTTP ${res.status}`,
          },
        ],
      };
    }
    const html = await res.text();
    const blocks = extractJsonLd(html);
    const issues: SchemaIssue[] = [];
    const types: string[] = [];

    if (blocks.length === 0) {
      issues.push({
        severity: "warning",
        blockIndex: -1,
        message: "No JSON-LD found on page",
      });
    }

    blocks.forEach((b, i) => {
      if (b.parseError) {
        issues.push({
          severity: "error",
          blockIndex: i,
          message: `Invalid JSON: ${b.parseError}`,
        });
        return;
      }
      const nodes = Array.isArray(b.parsed) ? b.parsed : [b.parsed];
      for (const node of nodes) {
        if (isRecord(node)) {
          const graph = node["@graph"];
          if (Array.isArray(graph)) {
            for (const child of graph) {
              if (isRecord(child)) types.push(...typesOf(child));
            }
          } else {
            types.push(...typesOf(node));
          }
        }
        issues.push(...validateNode(node, i));
      }
    });

    return {
      url,
      status: res.status,
      blockCount: blocks.length,
      types: Array.from(new Set(types)),
      issues,
    };
  } catch (err) {
    return {
      url,
      status: null,
      blockCount: 0,
      types: [],
      issues: [],
      fetchError: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runPool<T, R>(
  items: T[],
  worker: (t: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

export interface RunOptions {
  /** If set, only checks the first N sitemap URLs. Useful for on-demand admin runs. */
  limit?: number;
}

export async function runSchemaValidation(opts: RunOptions = {}): Promise<SchemaReport> {
  const sitemapRes = await fetchWithTimeout(SITEMAP_URL);
  if (!sitemapRes.ok) {
    throw new Error(`Sitemap fetch failed: HTTP ${sitemapRes.status}`);
  }
  const xml = await sitemapRes.text();
  let urls = parseSitemap(xml).filter((u) => u.startsWith(SITE));
  const totalUrls = urls.length;
  if (opts.limit && opts.limit > 0) urls = urls.slice(0, opts.limit);

  const reports = await runPool(urls, checkUrl, CONCURRENCY);

  let errorCount = 0;
  let warningCount = 0;
  let urlsWithIssues = 0;
  let totalBlocks = 0;
  for (const r of reports) {
    totalBlocks += r.blockCount;
    const errs = r.issues.filter((i) => i.severity === "error").length;
    const warns = r.issues.filter((i) => i.severity === "warning").length;
    errorCount += errs;
    warningCount += warns;
    if (errs > 0 || warns > 0 || r.fetchError) urlsWithIssues++;
  }

  return {
    checkedAt: new Date().toISOString(),
    sitemapUrl: SITEMAP_URL,
    totalUrls,
    checkedUrls: reports.length,
    urlsWithIssues,
    errorCount,
    warningCount,
    totalBlocks,
    reports,
  };
}

export { SITE, SITEMAP_URL };
