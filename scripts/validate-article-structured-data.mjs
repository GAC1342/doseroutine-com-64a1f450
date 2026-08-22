#!/usr/bin/env node
/**
 * Structured-data validation for every snapshotted CMS article.
 *
 * Fetches each /articles/<slug> page from a running server, extracts the
 * JSON-LD graph, and checks the fields Google actually requires for the
 * Article and FAQPage rich results (plus BreadcrumbList and the hero image
 * renditions). Prints a per-article table and exits non-zero on any error so
 * it can gate CI.
 *
 *   node scripts/validate-article-structured-data.mjs [--base http://localhost:8080] [--json report.json]
 */
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const BASE = (arg("--base", "http://localhost:8080") ?? "").replace(/\/$/, "");
const JSON_OUT = arg("--json", null);

const SLUGS = [
  "armodafinil",
  "boldenone",
  "carbetocin",
  "carbetocin-dose",
  "clonidine",
  "extended-release-melatonin",
  "intuniv",
  "lisdexamfetamine-brand-name",
  "longevity",
  "longevity-peptides",
  "meal-planning-app",
  "pastillas-para-bajar-de-peso",
  "ramelteon-drug-class",
  "ranitidine-drug",
  "science-of-longevity",
  "what-is-guanfacine-used-for",
  "yuka-app",
  "zinc-bisglycinate-supplement",
];

const HERO_WIDTHS = [400, 600, 900, 1200];

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    // The runtime emits JSON-LD verbatim inside the script tag, so the payload
    // is already valid JSON. Only `&` needs decoding when a serializer escaped
    // it; decoding &quot; would corrupt the JSON string delimiters.
    const raw = m[1].trim();
    try {
      out.push(JSON.parse(raw));
    } catch (err) {
      out.push({ __parseError: String(err), __raw: raw.slice(0, 200) });
    }
  }
  return out;
}

function flatten(nodes) {
  const flat = [];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (Array.isArray(node["@graph"])) flat.push(...node["@graph"]);
    else if (Array.isArray(node)) flat.push(...node);
    else flat.push(node);
  }
  return flat;
}

const typeOf = (node) => (Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]]);
const isType = (node, t) => typeOf(node).includes(t);

async function head(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status;
  } catch {
    return 0;
  }
}

async function checkArticle(slug) {
  const url = `${BASE}/articles/${slug}`;
  const errors = [];
  const warnings = [];
  const res = await fetch(url, { headers: { "user-agent": "DoseRoutine-SD-Validator" } });
  if (!res.ok) return { slug, url, status: res.status, errors: [`HTTP ${res.status}`], warnings };
  const html = await res.text();

  const nodes = flatten(extractJsonLd(html));
  for (const n of nodes) if (n.__parseError) errors.push(`Invalid JSON-LD: ${n.__parseError}`);

  // --- Article / BlogPosting ---
  const article = nodes.find((n) => isType(n, "BlogPosting") || isType(n, "Article"));
  if (!article) {
    errors.push("No Article/BlogPosting node");
  } else {
    for (const field of ["headline", "description", "datePublished", "author", "publisher"]) {
      if (!article[field]) errors.push(`Article missing ${field}`);
    }
    if (article.headline && article.headline.length > 110)
      warnings.push(`headline is ${article.headline.length} chars (Google truncates past 110)`);
    if (!article.dateModified) warnings.push("Article missing dateModified");
    if (!article.mainEntityOfPage) warnings.push("Article missing mainEntityOfPage");
    if (!article.inLanguage) warnings.push("Article missing inLanguage");
    const publisherLogo = article.publisher?.logo?.url;
    if (!publisherLogo) errors.push("publisher.logo.url missing");
    const image = article.image?.url ?? article.image;
    if (!image) {
      errors.push("Article missing image");
    } else {
      const imgUrl = String(image);
      if (!/^https:\/\//.test(imgUrl)) errors.push(`image is not an absolute https URL: ${imgUrl}`);
      const w = article.image?.width;
      const h = article.image?.height;
      if (w && h && w < 1200) warnings.push(`image width ${w} is under Google's 1200px guidance`);
      const path = imgUrl.replace(/^https?:\/\/[^/]+/, "");
      const status = await head(`${BASE}${path}`);
      if (status !== 200) errors.push(`image returns HTTP ${status}: ${path}`);
      // WebP renditions used by the on-page <picture>
      if (path.startsWith("/articles/cms/")) {
        for (const width of HERO_WIDTHS) {
          const rendition = `${path.replace(/\.jpg$/, "")}-${width}.webp`;
          const s = await head(`${BASE}${rendition}`);
          if (s !== 200) errors.push(`WebP rendition ${width}w returns HTTP ${s}`);
        }
      }
    }
  }

  // --- FAQPage ---
  const faq = nodes.find((n) => isType(n, "FAQPage"));
  let faqCount = 0;
  if (!faq) {
    errors.push("No FAQPage node");
  } else {
    const entities = Array.isArray(faq.mainEntity) ? faq.mainEntity : [];
    faqCount = entities.length;
    if (faqCount < 2) errors.push(`FAQPage has only ${faqCount} question(s)`);
    if (faqCount < 5) warnings.push(`FAQPage has ${faqCount} questions (target is 5+)`);
    entities.forEach((q, i) => {
      if (!q?.name) errors.push(`FAQ #${i + 1} missing name`);
      const answer = q?.acceptedAnswer?.text;
      if (!answer) errors.push(`FAQ #${i + 1} missing acceptedAnswer.text`);
      else if (answer.length < 40) warnings.push(`FAQ #${i + 1} answer is very short`);
    });
  }

  // --- BreadcrumbList ---
  const crumbs = nodes.find((n) => isType(n, "BreadcrumbList"));
  if (!crumbs) warnings.push("No BreadcrumbList node");
  else if ((crumbs.itemListElement ?? []).length < 2) warnings.push("BreadcrumbList has < 2 items");

  // --- head tags that back the rich result ---
  const canonical = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i.exec(html)?.[1];
  if (!canonical) errors.push("Missing canonical link");
  else if (!canonical.includes(`/articles/${slug}`))
    errors.push(`Canonical points elsewhere: ${canonical}`);
  if (!/property=["']og:image["']/i.test(html)) errors.push("Missing og:image");
  if (!/name=["']twitter:card["'][^>]+content=["']summary_large_image["']/i.test(html))
    warnings.push("twitter:card is not summary_large_image");

  // --- internal linking ---
  const relatedLinks = [...html.matchAll(/href=["']\/articles\/([a-z0-9-]+)["']/gi)]
    .map((m) => m[1])
    .filter((s) => s !== slug);
  const uniqueRelated = [...new Set(relatedLinks)];
  if (uniqueRelated.length < 3)
    warnings.push(`only ${uniqueRelated.length} outbound article link(s)`);

  return {
    slug,
    url,
    status: res.status,
    faqCount,
    relatedLinks: uniqueRelated.length,
    errors,
    warnings,
    richResults: {
      article:
        errors.filter(
          (e) => e.startsWith("Article") || e.includes("publisher") || e.includes("image"),
        ).length === 0,
      faq: errors.filter((e) => e.includes("FAQ")).length === 0,
    },
  };
}

const results = [];
for (const slug of SLUGS) {
  results.push(await checkArticle(slug));
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nArticle structured-data report — ${BASE}\n`);
console.log(
  pad("slug", 32),
  pad("Article", 9),
  pad("FAQ", 7),
  pad("FAQs", 6),
  pad("links", 6),
  "issues",
);
console.log("-".repeat(96));
for (const r of results) {
  console.log(
    pad(r.slug, 32),
    pad(r.richResults.article ? "PASS" : "FAIL", 9),
    pad(r.richResults.faq ? "PASS" : "FAIL", 7),
    pad(r.faqCount, 6),
    pad(r.relatedLinks, 6),
    r.errors.length
      ? `${r.errors.length} error(s)`
      : r.warnings.length
        ? `${r.warnings.length} warning(s)`
        : "clean",
  );
}

const withErrors = results.filter((r) => r.errors.length);
const withWarnings = results.filter((r) => r.warnings.length);
if (withErrors.length) {
  console.log("\nERRORS");
  for (const r of withErrors) for (const e of r.errors) console.log(`  ${r.slug}: ${e}`);
}
if (withWarnings.length) {
  console.log("\nWARNINGS");
  for (const r of withWarnings) for (const w of r.warnings) console.log(`  ${r.slug}: ${w}`);
}
console.log(
  `\n${results.length - withErrors.length}/${results.length} articles would parse as valid Article + FAQ rich results.`,
);
if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(`JSON report written to ${JSON_OUT}`);
}
process.exit(withErrors.length ? 1 : 0);
