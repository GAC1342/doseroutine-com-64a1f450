import { createFileRoute } from "@tanstack/react-router";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { DOSEROUTINE_DESCRIPTION_SUFFIX } from "@/lib/seo-description";
import { GSC_SITE_URL, SEO_MONITOR_URLS, SITE_ORIGIN, absoluteUrl } from "@/lib/seo-monitor-urls";
import type { SeoRegression } from "@/lib/email-templates/seo-monitor-report";

// Daily SEO monitor.
// - For each priority URL: calls GSC URL Inspection to read the indexing
//   verdict + rich-result state, and crawls the page to verify the
//   DoseRoutine description suffix + JSON-LD types are still present.
// - Compares to the last snapshot in seo_page_snapshots and emails Nikk
//   only when a regression is detected (or ?force=summary).
// Guarded by SEO_MONITOR_SECRET via x-admin-secret header. Scheduled daily
// via pg_cron.

const CONCURRENCY = 4;
const TIMEOUT_MS = 15_000;
const UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) DoseRoutineSeoMonitor/1.0";

interface PageState {
  url: string;
  fetchOk: boolean;
  hasSuffix: boolean | null;
  metaDescription: string | null;
  richTypes: string[];
  indexingVerdict: string | null;
  coverageState: string | null;
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { redirect: "follow", headers, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function extractMetaDescription(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractJsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const nodes: any[] = [];
      const push = (n: any) => {
        if (!n) return;
        if (Array.isArray(n)) n.forEach(push);
        else if (n["@graph"]) push(n["@graph"]);
        else nodes.push(n);
      };
      push(parsed);
      for (const n of nodes) {
        const t = n?.["@type"];
        if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
        else if (typeof t === "string") types.add(t);
      }
    } catch {
      /* ignore malformed block */
    }
  }
  return Array.from(types).sort();
}

async function fetchPageState(pathOrUrl: string): Promise<PageState> {
  const url = absoluteUrl(pathOrUrl);
  const base: PageState = {
    url,
    fetchOk: false,
    hasSuffix: null,
    metaDescription: null,
    richTypes: [],
    indexingVerdict: null,
    coverageState: null,
  };
  try {
    const res = await fetchWithTimeout(url, { "User-Agent": UA, Accept: "text/html" });
    if (!res.ok) return base;
    const html = await res.text();
    const desc = extractMetaDescription(html);
    return {
      ...base,
      fetchOk: true,
      metaDescription: desc,
      hasSuffix: desc ? desc.includes(DOSEROUTINE_DESCRIPTION_SUFFIX) : false,
      richTypes: extractJsonLdTypes(html),
    };
  } catch {
    return base;
  }
}

async function inspectViaGsc(
  url: string,
): Promise<{ verdict: string | null; coverage: string | null }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
  if (!apiKey || !connKey) return { verdict: null, coverage: null };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(
      "https://connector-gateway.lovable.dev/google_search_console/v1/urlInspection/index:inspect",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Connection-Api-Key": connKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inspectionUrl: url, siteUrl: GSC_SITE_URL }),
      },
    );
    if (!r.ok) return { verdict: null, coverage: null };
    const data = (await r.json()) as any;
    const idx = data?.inspectionResult?.indexStatusResult ?? {};
    return {
      verdict: idx.verdict ?? null,
      coverage: idx.coverageState ?? null,
    };
  } catch {
    return { verdict: null, coverage: null };
  } finally {
    clearTimeout(t);
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

function arraysDiffer(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return true;
  const s = new Set(a);
  return b.some((x) => !s.has(x));
}

function isBadVerdict(v: string | null): boolean {
  if (!v) return false;
  return v !== "PASS";
}

export const Route = createFileRoute("/api/public/hooks/seo-monitor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const seoSecret = process.env.SEO_MONITOR_SECRET;
        const cronSecret = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-admin-secret") || request.headers.get("x-cron-secret");
        const authorized =
          (seoSecret && provided === seoSecret) || (cronSecret && provided === cronSecret);
        if (!authorized) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const force = url.searchParams.get("force"); // 'summary' -> email even if clean
        const skipGsc = url.searchParams.get("skipGsc") === "1";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) Load prior snapshots for the priority URLs.
        const targetUrls = SEO_MONITOR_URLS.map(absoluteUrl);
        const { data: prior } = await supabaseAdmin
          .from("seo_page_snapshots")
          .select(
            "url, indexing_verdict, coverage_state, rich_result_types, has_description_suffix",
          )
          .in("url", targetUrls);

        const priorMap = new Map<string, any>();
        for (const row of prior ?? []) priorMap.set(row.url, row);

        // 2) Crawl each page + inspect via GSC.
        const states = await runPool(
          SEO_MONITOR_URLS,
          async (p) => {
            const [page, insp] = await Promise.all([
              fetchPageState(p),
              skipGsc
                ? Promise.resolve({ verdict: null, coverage: null })
                : inspectViaGsc(absoluteUrl(p)),
            ]);
            return { ...page, indexingVerdict: insp.verdict, coverageState: insp.coverage };
          },
          CONCURRENCY,
        );

        // 3) Detect regressions vs. prior snapshot.
        const regressions: SeoRegression[] = [];
        for (const s of states) {
          const before = priorMap.get(s.url);
          if (!s.fetchOk) {
            regressions.push({
              url: s.url,
              kind: "fetch_error",
              before: "ok",
              after: "unreachable",
            });
            continue;
          }
          // Suffix regression: only alert when we previously had it and now don't.
          if (before?.has_description_suffix === true && s.hasSuffix === false) {
            regressions.push({
              url: s.url,
              kind: "description_suffix",
              before: "present",
              after: "missing",
            });
          }
          // Rich result regression: any previously seen type is now missing.
          const priorTypes: string[] = before?.rich_result_types ?? [];
          const lostTypes = priorTypes.filter((t) => !s.richTypes.includes(t));
          if (priorTypes.length > 0 && lostTypes.length > 0) {
            regressions.push({
              url: s.url,
              kind: "rich_result",
              before: priorTypes.join(", "),
              after: s.richTypes.join(", ") || "(none)",
            });
          }
          // Indexing regression: PASS -> anything else, or coverage changed to a Not-indexed reason.
          if (s.indexingVerdict) {
            const wasPass = before?.indexing_verdict === "PASS";
            const nowBad = isBadVerdict(s.indexingVerdict);
            if (wasPass && nowBad) {
              regressions.push({
                url: s.url,
                kind: "indexing",
                before: `PASS (${before.coverage_state ?? "—"})`,
                after: `${s.indexingVerdict} (${s.coverageState ?? "—"})`,
              });
            } else if (
              before?.coverage_state &&
              s.coverageState &&
              before.coverage_state !== s.coverageState &&
              /(not indexed|blocked|error)/i.test(s.coverageState)
            ) {
              regressions.push({
                url: s.url,
                kind: "indexing",
                before: before.coverage_state,
                after: s.coverageState,
              });
            }
          }
        }

        // 4) Upsert new snapshot.
        const rows = states
          .filter((s) => s.fetchOk)
          .map((s) => ({
            url: s.url,
            indexing_verdict: s.indexingVerdict,
            coverage_state: s.coverageState,
            rich_result_types: s.richTypes,
            has_description_suffix: s.hasSuffix,
            meta_description: s.metaDescription,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        if (rows.length > 0) {
          await supabaseAdmin.from("seo_page_snapshots").upsert(rows, { onConflict: "url" });
        }

        // 5) Summary + email.
        const summary = {
          indexed: states.filter((s) => s.indexingVerdict === "PASS").length,
          notIndexed: states.filter((s) => s.indexingVerdict && s.indexingVerdict !== "PASS")
            .length,
          missingSuffix: states.filter((s) => s.fetchOk && s.hasSuffix === false).length,
          missingRichResults: states.filter((s) => s.fetchOk && s.richTypes.length === 0).length,
        };

        const shouldEmail = regressions.length > 0 || force === "summary";
        let emailed = false;
        if (shouldEmail) {
          const result = await sendTemplateEmail("seo-monitor-report", "Nikk.delibasic@gmail.com", {
            templateData: {
              checkedAt: new Date().toISOString(),
              totalChecked: states.length,
              regressions,
              summary,
            },
            idempotencyKey: `seo-monitor-${new Date().toISOString().slice(0, 10)}-${regressions.length}`,
          });
          emailed = result.sent;
        }

        return Response.json({
          ok: true,
          site: SITE_ORIGIN,
          totalChecked: states.length,
          regressions: regressions.slice(0, 20),
          summary,
          emailed,
        });
      },
    },
  },
});
