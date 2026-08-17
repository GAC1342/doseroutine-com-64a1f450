/**
 * Node-only loader for `seo-score.config.json`.
 *
 * Used by the CI test and the report script. Kept out of the pure scoring
 * module so nothing in the app bundle reaches for `node:fs`.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_SEO_SCORE_CONFIG,
  applyEnvOverrides,
  mergeSeoScoreConfig,
  type SeoScoreConfig,
} from "@/lib/seo-score-config";

export const SEO_SCORE_CONFIG_FILE = "seo-score.config.json";

/**
 * Reads the config file (path overridable with SEO_SCORE_CONFIG), merges it
 * over the defaults and applies env overrides. Falls back to the defaults when
 * the file is absent; a malformed file throws so CI fails loudly.
 */
export function loadSeoScoreConfig(
  cwd: string = process.cwd(),
  env: Record<string, string | undefined> = process.env,
): SeoScoreConfig {
  const file = env["SEO_SCORE_CONFIG"]
    ? path.resolve(cwd, env["SEO_SCORE_CONFIG"])
    : path.resolve(cwd, SEO_SCORE_CONFIG_FILE);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return applyEnvOverrides(DEFAULT_SEO_SCORE_CONFIG, env);
    }
    throw new Error(`Could not read ${file}: ${(err as Error).message}`);
  }
  if (raw && typeof raw === "object") delete (raw as Record<string, unknown>)["$comment"];
  return applyEnvOverrides(mergeSeoScoreConfig(raw), env);
}
