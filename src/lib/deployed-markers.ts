/**
 * Contract for what a deployed /library/<compound> page must (and must not)
 * contain in its server-rendered HTML.
 *
 * The patterns themselves live in scripts/deployed-markers.json so the vitest
 * integration test and the production shell/node smoke check can never drift
 * apart. Edit that JSON when a marker is added or retired.
 */

import contract from "../../scripts/deployed-markers.json";

/** Default origin checked when DEPLOY_BASE_URL is not set. */
export const DEFAULT_DEPLOY_BASE_URL = "https://doseroutine.com";

/** Compound pages sampled by the integration test. */
export const SAMPLE_COMPOUND_PATHS: readonly string[] = contract.paths;

export interface Marker {
  /** Human-readable name used in assertion messages. */
  label: string;
  /** Pattern searched for in the decompressed server-rendered HTML. */
  pattern: RegExp;
}

function compile(entries: { label: string; pattern: string; flags?: string }[]): Marker[] {
  return entries.map((m) => ({ label: m.label, pattern: new RegExp(m.pattern, m.flags || "") }));
}

/** Markers that MUST appear on every deployed compound page. */
export const REQUIRED_MARKERS: readonly Marker[] = compile(contract.required);

/** Markers that MUST NOT appear — retired opt-out / legacy signals. */
export const FORBIDDEN_MARKERS: readonly Marker[] = compile(contract.forbidden);

export interface MarkerAudit {
  missing: string[];
  forbidden: string[];
}

/** Audit one page's decompressed HTML against the marker contract. */
export function auditMarkers(html: string): MarkerAudit {
  return {
    missing: REQUIRED_MARKERS.filter((m) => !m.pattern.test(html)).map((m) => m.label),
    forbidden: FORBIDDEN_MARKERS.filter((m) => m.pattern.test(html)).map((m) => m.label),
  };
}

/** Fallback sample used when sitemap discovery is unavailable. */
export const FALLBACK_COMPOUND_PATHS: readonly string[] = contract.paths;

/** Concurrency used when probing the full deployed page set. */
export const PROBE_CONCURRENCY: number = contract.discovery?.concurrency ?? 8;
