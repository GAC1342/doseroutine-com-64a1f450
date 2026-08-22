/**
 * Single source of truth for the article routes the perf/image/asset gates
 * crawl. Reads the drafts on disk so a new post is covered automatically.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DRAFTS_DIR = join(process.cwd(), "src", "content", "article-drafts");

export function articleSlugs(): string[] {
  return readdirSync(DRAFTS_DIR)
    .filter((file) => file.endsWith(".md") && !file.startsWith("INTERNAL-LINKING-PLAN"))
    .map(
      (file) =>
        /^(?:suggested_)?slug:\s*(\S+)\s*$/m.exec(
          readFileSync(join(DRAFTS_DIR, file), "utf8"),
        )?.[1],
    )
    .filter((slug): slug is string => Boolean(slug))
    .sort();
}

export function articlePaths(): string[] {
  return ["/articles", ...articleSlugs().map((slug) => `/articles/${slug}`)];
}
