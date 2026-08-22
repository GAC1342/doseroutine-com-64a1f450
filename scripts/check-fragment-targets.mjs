#!/usr/bin/env node
/**
 * check-fragment-targets.mjs — fail when an in-page fragment link points at an
 * id that the page never renders.
 *
 * Dead fragments (`#benefits`, `#side-effects`, `#timing`, …) look fine to a
 * crawler but do nothing for a reader: the browser stays put, and Google can
 * report the target as a missing section. This crawls a set of pages, collects
 * every same-page `href="#id"`, and checks the id exists in the served HTML.
 *
 * Because the app renders some sections inside collapsed accordions, the check
 * runs against the raw SSR HTML (ids are present even when the panel is shut).
 *
 * Usage:
 *   node scripts/check-fragment-targets.mjs [--base http://localhost:8080]
 *                                           [--paths /a,/b] [--max 200]
 *
 * Exit code 1 when any fragment has no matching id.
 */
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const BASE = flag("base", process.env["FRAGMENT_CHECK_BASE"] ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const MAX = Number(flag("max", "200")) || 200;
const CONCURRENCY = 6;

/** Same-page fragment links: href="#foo". Ignores "#" and "#/". */
function fragmentsIn(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="#([^"\s/][^"\s]*)"/g)) {
    out.add(decodeURIComponent(m[1]));
  }
  return [...out];
}

function idsIn(html) {
  const out = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) out.add(m[1]);
  // Radix/aria patterns sometimes expose the target through a name anchor.
  for (const m of html.matchAll(/\sname="([^"]+)"/g)) out.add(m[1]);
  return out;
}

async function pathsToCheck() {
  const explicit = flag("paths", "");
  if (explicit)
    return explicit
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return locs
    .map((loc) => {
      try {
        return new URL(loc).pathname;
      } catch {
        return null;
      }
    })
    .filter((p) => typeof p === "string");
}

async function run() {
  const all = await pathsToCheck();
  const paths = all.slice(0, MAX);
  const failures = [];
  let checked = 0;

  const queue = [...paths];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const path = queue.shift();
      if (!path) return;
      let html;
      try {
        const res = await fetch(`${BASE}${path}`, { headers: { accept: "text/html" } });
        if (!res.ok) continue;
        html = await res.text();
      } catch {
        continue;
      }
      checked += 1;
      const ids = idsIn(html);
      for (const frag of fragmentsIn(html)) {
        if (!ids.has(frag)) failures.push({ path, fragment: `#${frag}` });
      }
    }
  });
  await Promise.all(workers);

  console.log(`Checked ${checked} page(s) of ${all.length} sitemap URL(s) at ${BASE}`);
  if (failures.length === 0) {
    console.log("No dead in-page fragment links found.");
    return;
  }
  console.error(`\n${failures.length} dead fragment link(s):`);
  for (const f of failures.slice(0, 100)) console.error(`  ${f.path} -> ${f.fragment}`);
  if (failures.length > 100) console.error(`  …and ${failures.length - 100} more`);
  process.exitCode = 1;
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
