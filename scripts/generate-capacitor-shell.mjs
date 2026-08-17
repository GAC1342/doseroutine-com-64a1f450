#!/usr/bin/env node
// Generates a static index.html shell inside dist/client so Capacitor can
// bundle the app as a native binary. TanStack Start's Cloudflare build does
// not emit a static index.html (it's SSR-only), but the client entry JS in
// dist/client/assets/client-*.js can boot the entire router in a browser.
//
// Build target quirk: locally the plugin emits to `dist/{client,server}`,
// while on some CI environments (Codemagic) it emits to `.output/{public,server}`.
// If dist/client is missing but .output/public exists, we mirror it so
// Capacitor's webDir ('dist/client') always resolves.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";

const CLIENT_DIR = "dist/client";
const FALLBACK_DIR = ".output/public";

if (!existsSync(CLIENT_DIR)) {
  if (existsSync(FALLBACK_DIR)) {
    console.log(`dist/client missing — mirroring from ${FALLBACK_DIR}`);
    mkdirSync("dist", { recursive: true });
    cpSync(FALLBACK_DIR, CLIENT_DIR, { recursive: true });
  } else {
    console.error(
      `ERROR: neither ${CLIENT_DIR} nor ${FALLBACK_DIR} exist. Run 'npm run build' first.`,
    );
    process.exit(1);
  }
}

const ASSETS_DIR = join(CLIENT_DIR, "assets");
if (!existsSync(ASSETS_DIR)) {
  console.error(`ERROR: ${ASSETS_DIR} does not exist. Vite build did not emit assets.`);
  process.exit(1);
}

const files = readdirSync(ASSETS_DIR);

// The client entry chunk name is not stable across builds (it has been
// `client-*.js` and `index-*.js` depending on the bundler/version), so resolve
// it from the generated server manifest, which records the real entry as
// `src: "/assets/<entry>.js"`. Fall back to filename heuristics.
function entryFromServerManifest() {
  for (const dir of ["dist/server", ".output/server"]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!/\.(mjs|js)$/.test(f)) continue;
      let text;
      try {
        text = readFileSync(join(dir, f), "utf8");
      } catch {
        continue;
      }
      const m = text.match(/src:\s*["']\/assets\/([A-Za-z0-9_.-]+\.js)["']/);
      if (m && files.includes(m[1])) return m[1];
    }
  }
  return undefined;
}

const clientEntry =
  entryFromServerManifest() ??
  files.find((f) => /^client-[A-Za-z0-9_-]+\.js$/.test(f)) ??
  files.find((f) => /^(index|main|entry|start)-[A-Za-z0-9_-]+\.js$/.test(f));

if (!clientEntry) {
  console.error("ERROR: could not resolve the client entry chunk in dist/client/assets.");
  console.error("Files present:", files.slice(0, 30));
  process.exit(1);
}
const cssEntry =
  files.find((f) => /\.css$/.test(f) && /^(client|index|main|styles)-/.test(f)) ??
  files.find((f) => /\.css$/.test(f));

const cssLink = cssEntry ? `<link rel="stylesheet" href="/assets/${cssEntry}">` : "";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0b1220" />
    <title>DoseRoutine</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    ${cssLink}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${clientEntry}"></script>
  </body>
</html>
`;

writeFileSync(join(CLIENT_DIR, "index.html"), html);
console.log(`OK: wrote ${CLIENT_DIR}/index.html referencing /assets/${clientEntry}`);
if (cssEntry) console.log(`     stylesheet: /assets/${cssEntry}`);
