/**
 * check-sitemap-coverage.ts — ask Google Search Console how many URLs it has
 * for our sitemap (submitted / indexed) and report anomalies against the
 * sitemap we actually serve.
 *
 * Read-only: it never submits or resubmits anything.
 *
 * Usage (bun):
 *   LOVABLE_API_KEY=... GOOGLE_SEARCH_CONSOLE_API_KEY=... \
 *     bun run scripts/check-sitemap-coverage.ts
 *   bun run scripts/check-sitemap-coverage.ts --json
 *
 * Exit codes: 0 clean (or warnings only), 1 error-severity anomaly,
 * 2 could not reach Search Console.
 */
import {
  detectCoverageAnomalies,
  formatCoverageReport,
  type CoverageInput,
} from "../src/lib/sitemap-coverage";
import { parseSitemap } from "../src/lib/sitemap-diff";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const BASE = (process.env["BASE_URL"] ?? "https://doseroutine.com").replace(/\/+$/, "");
const SITEMAP_URL = `${BASE}/sitemap.xml`;
const GSC_SITE_URL = process.env["GSC_SITE_URL"] ?? "sc-domain:doseroutine.com";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sumContents(entry: Record<string, unknown>, key: string): number | null {
  const contents = Array.isArray(entry["contents"])
    ? (entry["contents"] as Record<string, unknown>[])
    : [];
  let total = 0;
  let seen = false;
  for (const c of contents) {
    const n = num(c[key]);
    if (n !== null) {
      total += n;
      seen = true;
    }
  }
  return seen ? total : null;
}

async function main() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["GOOGLE_SEARCH_CONSOLE_API_KEY"];
  if (!apiKey || !connKey) {
    console.error(
      "[sitemap-coverage] LOVABLE_API_KEY and GOOGLE_SEARCH_CONSOLE_API_KEY are required",
    );
    process.exit(2);
  }
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": connKey };

  let servedUrlCount: number | null = null;
  let servedImageCount: number | null = null;
  try {
    const res = await fetch(SITEMAP_URL, { headers: { accept: "application/xml" } });
    if (res.ok) {
      const parsed = parseSitemap(await res.text());
      servedUrlCount = parsed.urlCount;
      servedImageCount = parsed.imageCount;
    }
  } catch {
    servedUrlCount = null;
  }

  const res = await fetch(
    `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/sitemaps`,
    { headers },
  );
  if (!res.ok) {
    console.error(
      `[sitemap-coverage] Search Console request failed [${res.status}]:`,
      await res.text(),
    );
    process.exit(2);
  }
  const data = (await res.json()) as { sitemap?: Record<string, unknown>[] };
  const list = Array.isArray(data.sitemap) ? data.sitemap : [];
  const entry = list.find((s) => s["path"] === SITEMAP_URL) ?? list[0];
  if (!entry) {
    console.error(`[sitemap-coverage] no sitemap submitted for ${GSC_SITE_URL}`);
    process.exit(1);
  }

  const input: CoverageInput = {
    servedUrlCount,
    servedImageCount,
    submittedUrls: sumContents(entry, "submitted"),
    indexedUrls: sumContents(entry, "indexed"),

    errors: num(entry["errors"]),
    warnings: num(entry["warnings"]),
    lastDownloaded: typeof entry["lastDownloaded"] === "string" ? entry["lastDownloaded"] : null,
    isPending: typeof entry["isPending"] === "boolean" ? (entry["isPending"] as boolean) : null,
  };
  const anomalies = detectCoverageAnomalies(input);

  if (JSON_OUT) console.log(JSON.stringify({ sitemap: entry["path"], input, anomalies }, null, 2));
  else console.log(formatCoverageReport(input, anomalies));

  process.exit(anomalies.some((a) => a.severity === "error") ? 1 : 0);
}

main().catch((err) => {
  console.error("[sitemap-coverage] failed:", err instanceof Error ? err.message : err);
  process.exit(2);
});
