#!/usr/bin/env node
/**
 * robots-lang-guard
 *
 * Fetches robots.txt from both the www and non-www hosts and fails if any
 * rule blocks language-parameter URLs (?lang= / &lang= / lang= paths).
 *
 * Those URLs must stay crawlable so Googlebot can see their 301 redirects to
 * the clean canonical paths. A Disallow on them strands the redirect and the
 * link equity with it (see the Aug 2026 robots/lang incident).
 *
 * Usage:  node scripts/robots-lang-guard.mjs
 *         ROBOTS_HOSTS="https://a.com,https://b.com" node scripts/robots-lang-guard.mjs
 */

export const DEFAULT_HOSTS = [
  "https://doseroutine.com",
  "https://www.doseroutine.com",
];

/**
 * Returns every offending Disallow line that would block a lang-parameter URL.
 * @param {string} robotsTxt
 * @returns {{ line: number; userAgent: string; rule: string }[]}
 */
export function findLangBlockingRules(robotsTxt) {
  const offenders = [];
  let userAgent = "*";

  robotsTxt.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.split("#")[0].trim();
    if (!line) return;

    const uaMatch = /^user-agent\s*:\s*(.+)$/i.exec(line);
    if (uaMatch) {
      userAgent = uaMatch[1].trim();
      return;
    }

    const disallow = /^disallow\s*:\s*(.*)$/i.exec(line);
    if (!disallow) return;

    const value = disallow[1].trim();
    if (!value) return; // "Disallow:" alone allows everything

    // A bare "Disallow: /" blocks lang URLs too.
    const blocksEverything = value === "/";
    const mentionsLang = /(\?|&|\*)?\s*lang\s*=/i.test(value);

    if (blocksEverything || mentionsLang) {
      offenders.push({ line: i + 1, userAgent, rule: `Disallow: ${value}` });
    }
  });

  return offenders;
}

async function fetchRobots(host) {
  const url = `${host.replace(/\/$/, "")}/robots.txt`;
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "DoseRoutine-RobotsGuard/1.0" },
  });
  const body = await res.text();
  return { url, status: res.status, body };
}

async function main() {
  const hosts = (process.env.ROBOTS_HOSTS || DEFAULT_HOSTS.join(","))
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  let failed = false;

  for (const host of hosts) {
    let result;
    try {
      result = await fetchRobots(host);
    } catch (err) {
      console.error(`FAIL  ${host}/robots.txt — request error: ${err.message}`);
      failed = true;
      continue;
    }

    if (result.status !== 200) {
      console.error(`FAIL  ${result.url} — HTTP ${result.status}`);
      failed = true;
      continue;
    }

    const offenders = findLangBlockingRules(result.body);
    if (offenders.length) {
      failed = true;
      console.error(`FAIL  ${result.url} — lang-blocking rule(s) present:`);
      for (const o of offenders) {
        console.error(`        line ${o.line} [User-agent: ${o.userAgent}] ${o.rule}`);
      }
    } else {
      console.log(`OK    ${result.url} — no lang-blocking rules`);
    }
  }

  if (failed) {
    console.error(
      "\nLanguage-parameter URLs must stay crawlable so Googlebot can follow their 301 redirects.",
    );
    process.exit(1);
  }

  console.log("\nAll hosts pass the robots lang guard.");
}

const isDirectRun =
  process.argv[1] && process.argv[1].endsWith("robots-lang-guard.mjs");
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
