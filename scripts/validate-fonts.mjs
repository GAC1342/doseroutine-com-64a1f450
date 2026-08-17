#!/usr/bin/env node
/**
 * Font-loading drift validator.
 *
 * Asserts that the three places fonts are declared stay in sync:
 *   1. src/styles.css        — which @fontsource subsets/weights are imported
 *   2. node_modules/@fontsource — the actual @font-face family/weight/display/src
 *   3. src/routes/__root.tsx — which woff2 files are <link rel=preload>ed
 *   4. src/**\/*.tsx          — font-weight classes applied to display-font elements
 *
 * Any divergence (a preload for a face we no longer ship, a weight class the
 * loaded faces can't render, a missing font-display: swap, a dead file path)
 * fails the run so performance/typography regressions can't land silently.
 *
 * Usage: node scripts/validate-fonts.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The contract. Change here first, then change the code. */
export const FONT_CONTRACT = {
  family: "Space Grotesk",
  package: "@fontsource/space-grotesk",
  weights: [600, 700],
  subsets: ["latin", "latin-ext"],
  /** Only these subsets are preloaded (above-the-fold critical path). */
  preloadSubsets: ["latin"],
  fontDisplay: "swap",
  /** Families that must NOT ship any @font-face (system/local only). */
  disallowedBundledFamilies: ["Inter"],
};

const WEIGHT_CLASSES = {
  "font-thin": 100,
  "font-extralight": 200,
  "font-light": 300,
  "font-normal": 400,
  "font-medium": 500,
  "font-semibold": 600,
  "font-bold": 700,
  "font-extrabold": 800,
  "font-black": 900,
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function parseFontFaces(css, cssPath) {
  const faces = [];
  for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
    const pick = (prop) => block.match(new RegExp(`${prop}\\s*:\\s*([^;]+);`))?.[1]?.trim();
    faces.push({
      cssPath,
      family: pick("font-family")?.replace(/^['"]|['"]$/g, ""),
      weight: Number(pick("font-weight")),
      display: pick("font-display"),
      srcs: [...block.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, "")),
    });
  }
  return faces;
}

/**
 * Derives the critical preload URL list from the real @font-face definitions.
 *
 * A face is critical when its subset (taken from the @fontsource CSS file it
 * came from, e.g. "latin-600.css") is in FONT_CONTRACT.preloadSubsets and its
 * weight is contracted. The emitted specs are the woff2 `src` urls resolved
 * back to package-relative module specifiers — exactly what __root.tsx must
 * `import ... ?url`. Nothing is templated: if the CSS stops shipping a face,
 * it drops out of this list automatically.
 */
export function deriveCriticalPreloads(faces, contract = FONT_CONTRACT) {
  const specs = [];
  for (const face of faces) {
    const subset = path.basename(face.cssPath, ".css").replace(/-\d{3}$/, "");
    if (!contract.preloadSubsets.includes(subset)) continue;
    if (!contract.weights.includes(face.weight)) continue;
    if (face.family !== contract.family) continue;

    const woff2 = face.srcs.find((s) => s.split("?")[0].endsWith(".woff2"));
    if (!woff2) continue;

    // "@fontsource/space-grotesk/latin-600.css" + "./files/x.woff2"
    //   -> "@fontsource/space-grotesk/files/x.woff2"
    const spec = path.posix
      .normalize(path.posix.join(path.posix.dirname(face.cssPath), woff2))
      .replace(/^\.\//, "");
    if (!specs.includes(spec)) specs.push(spec);
  }
  return specs.sort();
}

export function runFontValidation() {
  const errors = [];
  const info = {};
  const fail = (msg) => errors.push(msg);

  // ---- 1. styles.css imports -------------------------------------------
  const stylesPath = path.join(ROOT, "src/styles.css");
  const styles = readFileSync(stylesPath, "utf8");
  const imports = [...styles.matchAll(/@import\s+["']([^"']+)["']/g)].map((m) => m[1]);
  const fontImports = imports.filter((s) => s.startsWith("@fontsource"));
  info.fontImports = fontImports;

  const expectedImports = FONT_CONTRACT.subsets.flatMap((subset) =>
    FONT_CONTRACT.weights.map((w) => `${FONT_CONTRACT.package}/${subset}-${w}.css`),
  );
  for (const want of expectedImports) {
    if (!fontImports.includes(want)) fail(`src/styles.css is missing @import "${want}"`);
  }
  for (const got of fontImports) {
    if (!expectedImports.includes(got)) {
      fail(
        `src/styles.css imports unexpected font CSS "${got}" (contract allows only ${expectedImports.join(", ")})`,
      );
    }
  }

  // ---- 2. actual @font-face definitions on disk ------------------------
  const faces = [];
  for (const spec of fontImports) {
    const cssPath = path.join(ROOT, "node_modules", spec);
    if (!existsSync(cssPath)) {
      fail(`@import "${spec}" does not resolve — ${path.relative(ROOT, cssPath)} is missing`);
      continue;
    }
    const parsed = parseFontFaces(readFileSync(cssPath, "utf8"), spec);
    if (parsed.length === 0) fail(`${spec} declares no @font-face rules`);
    faces.push(...parsed);
  }
  info.faces = faces.map((f) => ({
    css: f.cssPath,
    family: f.family,
    weight: f.weight,
    display: f.display,
  }));

  for (const face of faces) {
    if (face.family !== FONT_CONTRACT.family) {
      fail(
        `${face.cssPath} declares font-family "${face.family}", expected "${FONT_CONTRACT.family}"`,
      );
    }
    if (!FONT_CONTRACT.weights.includes(face.weight)) {
      fail(
        `${face.cssPath} declares font-weight ${face.weight}, outside the contract (${FONT_CONTRACT.weights.join("/")})`,
      );
    }
    if (face.display !== FONT_CONTRACT.fontDisplay) {
      fail(
        `${face.cssPath} uses font-display: ${face.display ?? "<none>"}, expected ${FONT_CONTRACT.fontDisplay}`,
      );
    }
    for (const src of face.srcs) {
      const resolved = path.resolve(
        path.dirname(path.join(ROOT, "node_modules", face.cssPath)),
        src,
      );
      if (!existsSync(resolved)) fail(`${face.cssPath} points at a missing font file: ${src}`);
    }
  }

  const loadedWeights = [...new Set(faces.map((f) => f.weight))].sort();
  info.loadedWeights = loadedWeights;
  for (const w of FONT_CONTRACT.weights) {
    if (!loadedWeights.includes(w))
      fail(`No @font-face found for ${FONT_CONTRACT.family} weight ${w}`);
  }

  for (const banned of FONT_CONTRACT.disallowedBundledFamilies) {
    if (imports.some((s) => s.toLowerCase().includes(banned.toLowerCase()))) {
      fail(
        `src/styles.css bundles "${banned}" webfont CSS — it must stay a local/system fallback only`,
      );
    }
  }

  // ---- 3. preloads in __root.tsx ---------------------------------------
  const rootPath = path.join(ROOT, "src/routes/__root.tsx");
  const rootSrc = readFileSync(rootPath, "utf8");
  const fontUrlImports = [
    ...rootSrc.matchAll(/import\s+(\w+)\s+from\s+["'](@fontsource\/[^"']+\.woff2)\?url["']/g),
  ].map((m) => ({ binding: m[1], spec: m[2] }));
  info.preloadImports = fontUrlImports.map((i) => i.spec);

  // Generated from the real @font-face rules parsed above — not hand-listed.
  const expectedPreloads = deriveCriticalPreloads(faces);
  info.derivedPreloads = expectedPreloads;
  if (expectedPreloads.length === 0) {
    fail(
      `No critical @font-face found for subsets ${FONT_CONTRACT.preloadSubsets.join("/")} at weights ${FONT_CONTRACT.weights.join("/")} — nothing to preload`,
    );
  }
  for (const want of expectedPreloads) {
    if (!fontUrlImports.some((i) => i.spec === want))
      fail(`src/routes/__root.tsx does not preload ${want}`);
  }

  const preloadLinks = [...rootSrc.matchAll(/{[^{}]*rel:\s*"preload"[^{}]*}/g)].filter((m) =>
    m[0].includes('as: "font"'),
  );
  info.preloadLinkCount = preloadLinks.length;
  if (preloadLinks.length !== expectedPreloads.length) {
    fail(
      `src/routes/__root.tsx has ${preloadLinks.length} font preload link(s), expected exactly ${expectedPreloads.length} (${expectedPreloads.length} critical latin face(s))`,
    );
  }

  for (const { binding, spec } of fontUrlImports) {
    if (!expectedPreloads.includes(spec)) {
      fail(`src/routes/__root.tsx preloads ${spec}, which is not a contracted critical face`);
    }
    const filePath = path.join(ROOT, "node_modules", spec);
    if (!existsSync(filePath)) fail(`Preloaded font file does not exist on disk: ${spec}`);

    const weight = Number(spec.match(/-(\d{3})-normal\.woff2$/)?.[1]);
    if (!loadedWeights.includes(weight)) {
      fail(`Preload ${spec} is weight ${weight}, but no @font-face declares that weight`);
    }
    // Every preloaded file must actually be referenced by one of the @font-face src urls.
    const referenced = faces.some((f) =>
      f.srcs.some((s) => path.basename(s) === path.basename(spec)),
    );
    if (!referenced)
      fail(`Preload ${spec} is never referenced by any @font-face src — dead preload`);

    const link = preloadLinks.find((m) => m[0].includes(`href: ${binding}`));
    if (!link) {
      fail(`Font url import "${binding}" (${spec}) is not used by any rel="preload" link`);
      continue;
    }
    if (!link[0].includes('type: "font/woff2"'))
      fail(`Preload link for ${spec} is missing type: "font/woff2"`);
    if (!link[0].includes('crossOrigin: "anonymous"'))
      fail(`Preload link for ${spec} is missing crossOrigin: "anonymous"`);
  }

  // ---- 4. class usage vs loaded weights --------------------------------
  const displayToken = styles.match(/--font-display:\s*([^;]+);/)?.[1] ?? "";
  if (!displayToken.includes(`"${FONT_CONTRACT.family}"`)) {
    fail(
      `--font-display token does not use "${FONT_CONTRACT.family}" (got: ${displayToken.trim() || "<missing>"})`,
    );
  }
  const headingRule = styles.match(/h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*{[^}]*}/)?.[0] ?? "";
  const headingWeight = Number(headingRule.match(/font-weight:\s*(\d{3})/)?.[1]);
  if (!headingRule.includes("var(--font-display)")) {
    fail("src/styles.css heading rule no longer applies var(--font-display)");
  }
  if (!FONT_CONTRACT.weights.includes(headingWeight)) {
    fail(
      `Heading base font-weight is ${headingWeight || "<unset>"}, which has no loaded ${FONT_CONTRACT.family} face`,
    );
  }

  const offenders = [];
  for (const file of walk(path.join(ROOT, "src"))) {
    const src = readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    // Headings (display family via the global rule) + explicit font-display utilities.
    const candidates = [
      ...src.matchAll(/<h[1-6][^>]*className=(?:"([^"]*)"|{`([^`]*)`})/g),
      ...src.matchAll(/className=(?:"([^"]*font-display[^"]*)"|{`([^`]*font-display[^`]*)`})/g),
    ];
    for (const m of candidates) {
      const classes = (m[1] ?? m[2] ?? "").split(/\s+/);
      for (const cls of classes) {
        const bare = cls.replace(/^\w+:/, "");
        const weight = WEIGHT_CLASSES[bare];
        if (weight && !loadedWeights.includes(weight)) {
          offenders.push(
            `${rel}: "${cls}" (${weight}) on a ${FONT_CONTRACT.family} element — only ${loadedWeights.join("/")} are loaded`,
          );
        }
      }
    }
  }
  info.classOffenders = offenders;
  for (const o of offenders) fail(o);

  return { errors, info };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { errors, info } = runFontValidation();
  console.log(`Font contract: ${FONT_CONTRACT.family} ${FONT_CONTRACT.weights.join("/")}`);
  console.log(`  @import faces : ${info.fontImports.length} css / ${info.faces.length} @font-face`);
  console.log(`  loaded weights: ${info.loadedWeights.join(", ")}`);
  console.log(`  generated     : ${info.derivedPreloads.join(", ") || "<none>"}`);
  console.log(
    `  preloads      : ${info.preloadLinkCount} link(s) -> ${info.preloadImports.join(", ")}`,
  );
  if (errors.length) {
    console.error(`\n✗ ${errors.length} font drift issue(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("\n✓ Fonts, weights, preloads and class usage are all in sync.");
}
