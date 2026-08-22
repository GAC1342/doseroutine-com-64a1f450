/**
 * Canonical-URL policy for the short slugs (/blog, /for) and their descriptive
 * SEO aliases (/health-tracking-blog, /who-doseroutine-is-for).
 *
 * Two invariants must hold together, or the alias trick backfires:
 *
 *  1. The sitemap advertises ONLY the canonical slug. An alias in the sitemap
 *     tells Google "index this too", which is the duplicate we were avoiding.
 *  2. robots.txt must not Disallow the alias or the canonical. A blocked alias
 *     can never be crawled, so its 301 is never followed and no signal is
 *     consolidated onto the canonical URL.
 *
 * Pure functions only — used by unit tests against the committed files and by
 * the integration test that fetches the live /sitemap.xml and /robots.txt.
 */
import { URL_ALIASES, type UrlAlias } from "@/lib/url-aliases";
import { decidePath, groupFor, type RobotsGroup } from "@/lib/robots-policy";

/** Canonical destinations that the aliases point at (/blog, /for). */
export const CANONICAL_ALIAS_TARGETS: string[] = Array.from(
  new Set(URL_ALIASES.map((a) => a.canonical)),
);

export type SitemapAliasProblem = {
  url: string;
  reason: string;
};

/** Strip the origin + trailing slash so /blog/ and https://x/blog compare equal. */
export function pathOf(url: string): string {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.split("?")[0] ?? url;
  }
  return path.replace(/\/+$/, "").toLowerCase() || "/";
}

/**
 * Sitemap URLs must never contain an alias path, and each canonical target
 * must appear exactly once (no trailing-slash or query duplicates).
 */
export function findSitemapAliasProblems(
  locs: string[],
  aliases: UrlAlias[] = URL_ALIASES,
): SitemapAliasProblem[] {
  const problems: SitemapAliasProblem[] = [];
  const aliasPaths = new Set(aliases.map((a) => pathOf(a.alias)));

  for (const loc of locs) {
    const path = pathOf(loc);
    if (aliasPaths.has(path)) {
      problems.push({
        url: loc,
        reason: `alias path ${path} must not be listed — it 301s to its canonical slug`,
      });
    }
    const query = loc.includes("?") ? loc.slice(loc.indexOf("?") + 1) : "";
    if (query && CANONICAL_ALIAS_TARGETS.some((c) => pathOf(c) === path)) {
      // Pagination is a distinct canonical page (/blog?page=2). Any other
      // parameter — ?lang=, tracking, sort — is a duplicate of the canonical.
      if (!/^page=\d+$/.test(query)) {
        problems.push({
          url: loc,
          reason: `${path} may only carry a page= parameter, got "?${query}"`,
        });
      }
    }
  }

  for (const canonical of CANONICAL_ALIAS_TARGETS) {
    // Count only the unparameterised URL: /blog?page=2 is a paginated sibling,
    // not a second copy of /blog.
    const matches = locs.filter((loc) => !loc.includes("?") && pathOf(loc) === pathOf(canonical));
    if (matches.length === 0) {
      problems.push({ url: canonical, reason: "canonical slug is missing from the sitemap" });
    } else if (matches.length > 1) {
      problems.push({
        url: canonical,
        reason: `canonical slug listed ${matches.length} times: ${matches.join(", ")}`,
      });
    }
  }

  return problems;
}

export type RobotsAliasProblem = {
  agent: string;
  path: string;
  reason: string;
};

/**
 * Every crawler group must be able to fetch both the alias (so the 301 is
 * followed) and the canonical destination (so it can be indexed).
 */
export function findRobotsAliasConflicts(
  groups: RobotsGroup[],
  agents: string[] = ["*", "Googlebot", "Bingbot"],
  aliases: UrlAlias[] = URL_ALIASES,
): RobotsAliasProblem[] {
  const problems: RobotsAliasProblem[] = [];
  const paths = [...aliases.map((a) => a.alias), ...CANONICAL_ALIAS_TARGETS];

  for (const agent of agents) {
    const group = groupFor(groups, agent) ?? groupFor(groups, "*");
    if (!group) continue;
    for (const path of paths) {
      const decision = decidePath(group, path);
      if (!decision.allowed) {
        problems.push({
          agent,
          path,
          reason: `blocked by "${decision.rule ?? "Disallow"}" — the redirect can never be crawled`,
        });
      }
    }
  }

  return problems;
}
