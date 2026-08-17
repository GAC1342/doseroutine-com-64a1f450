#!/usr/bin/env node
/**
 * Force a clean crawl-cache run by deleting the disk cache directory.
 *
 * Respects the same env var used by src/lib/crawl-cache.ts:
 *   CRAWL_CACHE_DIR=<path>  override the default node_modules/.cache/doseroutine-crawl
 */
import { rm } from "node:fs/promises";
import { join } from "node:path";

const cacheDir =
  process.env["CRAWL_CACHE_DIR"] ??
  join(process.cwd(), "node_modules", ".cache", "doseroutine-crawl");

try {
  await rm(cacheDir, { recursive: true, force: true });
  console.log(`Cleared crawl cache: ${cacheDir}`);
} catch (err) {
  console.error(`Failed to clear crawl cache at ${cacheDir}:`, err?.message ?? err);
  process.exit(1);
}
