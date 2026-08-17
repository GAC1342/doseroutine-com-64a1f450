/** Bundle entry so scripts/anchor-lint-report.mjs can import the TS sources. */
export { lintAnchorText } from "@/lib/anchor-text-lint";
export { fetchHtml, fetchSitemapPaths, mapWithConcurrency } from "@/lib/crawl-cache";
export { crawlSitemap, crawlCacheStats } from "@/lib/crawl-cache";
