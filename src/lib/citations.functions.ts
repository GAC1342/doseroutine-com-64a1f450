import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CitationResult = {
  url: string;
  source: string;
  title: string;
  snippet: string;
  meta?: {
    authors?: string;
    journal?: string;
    year?: string;
    pmid?: string;
  };
};

import { classifyCitationUrl } from "./citation-allowlist";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const m =
    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : undefined;
}

function extractDescription(html: string): string | undefined {
  const m =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ??
    html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  return m ? m[1].trim() : undefined;
}

/**
 * Fetch options shared by every outbound request in this module.
 *
 * `redirect: "manual"` is critical for the SSRF guard: the allowlist
 * classifies the ORIGINAL URL, but stock `fetch` follows 3xx responses
 * transparently, so an allowlisted host could redirect the worker to an
 * internal or attacker-controlled destination and the response body would
 * come back through the citation preview. Refusing to follow redirects
 * closes that bypass. Any 3xx status is treated as a hard failure.
 */
const SAFE_FETCH_INIT: RequestInit = { redirect: "manual" };

function assertNotRedirect(res: Response): void {
  // With redirect: "manual", browsers set res.type === "opaqueredirect" and
  // status 0; workerd/undici expose the actual 3xx status. Handle both.
  if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
    throw new Error("Citation source attempted to redirect; refused for safety.");
  }
}

async function fetchPubmed(pmid: string, url: string): Promise<CitationResult> {
  // esummary for metadata (JSON), efetch for abstract (text).
  const [summaryRes, abstractRes] = await Promise.all([
    fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`,
      {
        ...SAFE_FETCH_INIT,
        headers: { "User-Agent": "DoseRoutine/1.0 (+https://doseroutine.com)" },
      },
    ),
    fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`,
      {
        ...SAFE_FETCH_INIT,
        headers: { "User-Agent": "DoseRoutine/1.0 (+https://doseroutine.com)" },
      },
    ),
  ]);
  assertNotRedirect(summaryRes);
  assertNotRedirect(abstractRes);

  let title = `PubMed PMID ${pmid}`;
  let authors: string | undefined;
  let journal: string | undefined;
  let year: string | undefined;

  if (summaryRes.ok) {
    try {
      const j = (await summaryRes.json()) as {
        result?: Record<
          string,
          {
            title?: string;
            authors?: { name: string }[];
            fulljournalname?: string;
            source?: string;
            pubdate?: string;
          }
        >;
      };
      const rec = j.result?.[pmid];
      if (rec) {
        if (rec.title) title = rec.title.replace(/\.$/, "");
        if (rec.authors?.length) {
          const names = rec.authors.slice(0, 4).map((a) => a.name);
          authors = names.join(", ") + (rec.authors.length > 4 ? ", et al." : "");
        }
        journal = rec.fulljournalname ?? rec.source;
        year = rec.pubdate?.slice(0, 4);
      }
    } catch {
      /* ignore */
    }
  }

  let snippet = "Abstract unavailable.";
  if (abstractRes.ok) {
    const raw = (await abstractRes.text()).trim();
    // efetch returns citation header + abstract; keep it as-is but bounded.
    snippet = raw.length > 4000 ? raw.slice(0, 4000) + "…" : raw;
  }

  return {
    url,
    source: "PubMed / NIH National Library of Medicine",
    title,
    snippet,
    meta: { authors, journal, year, pmid },
  };
}

async function fetchGenericPage(url: string, sourceLabel: string): Promise<CitationResult> {
  const res = await fetch(url, {
    ...SAFE_FETCH_INIT,
    headers: {
      "User-Agent": "DoseRoutine/1.0 (+https://doseroutine.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  assertNotRedirect(res);
  if (!res.ok) {
    throw new Error(`Source returned HTTP ${res.status}`);
  }
  const html = await res.text();
  const title = extractTitle(html) ?? sourceLabel;
  const desc = extractDescription(html);
  const bodyText = stripHtml(html);
  // Prefer meta description + first chunk of body prose.
  let snippet = desc ? desc + "\n\n" : "";
  snippet += bodyText.slice(0, 2200);
  if (bodyText.length > 2200) snippet += "…";
  return { url, source: sourceLabel, title, snippet: snippet.trim() };
}

/**
 * Pure core of the citation preview. Exported so regression tests can drive
 * it directly with a stubbed global `fetch`, without going through the
 * server-function RPC layer. Server-fn handler below is a thin wrapper.
 */
export async function fetchCitationCore(url: string): Promise<CitationResult> {
  const target = classifyCitationUrl(url);
  if (target.kind === "reject") {
    throw new Error("Citation preview is not available for this source.");
  }
  if (target.kind === "pubmed") {
    return await fetchPubmed(target.pmid, url);
  }
  if (target.kind === "ods") {
    return await fetchGenericPage(url, "NIH Office of Dietary Supplements");
  }
  return await fetchGenericPage(url, target.host);
}

export const fetchCitation = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        url: z.string().url().max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<CitationResult> => {
    const url = data.url;
    try {
      return await fetchCitationCore(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load citation.";
      return {
        url,
        source: "Source",
        title: "Preview unavailable",
        snippet: `${message}\n\nOpen the full source in a new tab to read it directly.`,
      };
    }
  });
