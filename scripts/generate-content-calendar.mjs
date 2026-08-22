#!/usr/bin/env node
/**
 * Generates src/lib/content-calendar.ts from the 60-day editorial calendar CSV.
 *
 * The CSV is the editorial source of truth (day, date, title, slug, keyword,
 * intent, cluster, content type, word target, internal links, schema). This
 * script derives the publish-ready SEO fields — title tag, meta description and
 * FAQ blocks — so every planned post has consistent, deterministic metadata
 * before it is drafted.
 *
 *   node scripts/generate-content-calendar.mjs [path-to-csv]
 */
import { readFileSync, writeFileSync } from "node:fs";

const CSV = process.argv[2] ?? "/mnt/documents/doseroutine-60-day-content-calendar.csv";
const OUT = "src/lib/content-calendar.ts";
const BRAND = "DoseRoutine";
const MAX_TITLE = 60;
const MAX_DESC = 158;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/** Title tag: trimmed to fit, branded when there is room. */
function titleTag(title) {
  const branded = `${title} | ${BRAND}`;
  if (branded.length <= MAX_TITLE) return branded;
  if (title.length <= MAX_TITLE) return title;
  const cut = title.slice(0, MAX_TITLE);
  return cut
    .slice(0, cut.lastIndexOf(" "))
    .replace(/[,:—-]$/, "")
    .trim();
}

const DESC_BY_CLUSTER = {
  "Best-apps hub": (t, k) =>
    `We tested the ${k} options that matter and ranked them on reminders, tracking depth, privacy and price. See which app fits your routine.`,
  Audience: (t, k) =>
    `A practical guide to choosing a ${k}: what to look for, which apps handle the edge cases, and how to set up a schedule that actually sticks.`,
  Platform: (t, k) =>
    `The best ${k} choices compared on notification reliability, sync, offline use and price — plus setup tips so alerts never get silenced.`,
  Feature: (t, k) =>
    `Which apps do ${k} properly? Compare how each one handles the feature, where they fall short, and how to set it up in minutes.`,
  Comparison: (t, k) =>
    `A feature-by-feature look at ${k}: reminders, tracking, sharing, privacy and cost, so you can pick without installing both.`,
  "How-to": (t, k) =>
    `Step-by-step: ${k}. Clear instructions, common mistakes to avoid, and how to confirm your schedule is set up correctly.`,
  Troubleshooting: (t, k) =>
    `Fix ${k} for good. Work through the settings that silence alerts — permissions, focus modes, battery saving — in order.`,
  Trust: (t, k) =>
    `A plain-English answer on ${k}, what health apps actually store, and the questions to ask before you trust one with your data.`,
  Timing: (t, k) =>
    `When to take what, and why timing changes absorption. A plain-English guide to ${k} with practical scheduling examples.`,
  Interactions: (t, k) =>
    `Which combinations compete for absorption, which are fine, and how to space them. A practical guide to ${k}.`,
  Definitions: (t, k) =>
    `What ${k} means in plain English, how it is measured, and the small habits that move the number most.`,
  Calculator: (t, k) =>
    `Reconstitution and dosing math without the guesswork. Follow the ${k} walkthrough with worked examples you can copy.`,
  Objection: (t, k) =>
    `Is a ${k} worth it for a single daily dose? An honest look at when an app helps and when a phone alarm is enough.`,
};

function metaDescription(row) {
  const fn = DESC_BY_CLUSTER[row.cluster] ?? DESC_BY_CLUSTER["How-to"];
  let d = fn(row.title, row.primaryKeyword);
  if (d.length > MAX_DESC) d = `${d.slice(0, MAX_DESC - 1).trimEnd()}…`;
  return d;
}

const FAQ_BY_INTENT = {
  commercial: (row) => [
    {
      question: `What is the best ${row.primaryKeyword} right now?`,
      answer: `There is no single winner for everyone. ${BRAND} suits people tracking multiple medications, supplements or injections together, while a simple alert-only app is enough for one daily pill. Match the app to how complex your routine is.`,
    },
    {
      question: `Is there a free ${row.primaryKeyword}?`,
      answer: `Yes. Most apps in this category, including ${BRAND}, have a free tier that covers reminders and basic logging. Paid plans usually add history, exports, family sharing and advanced tracking.`,
    },
    {
      question: `Do these apps work offline?`,
      answer: `Reminders are scheduled on the device, so they fire without a connection. Syncing, backups and shared access resume the next time the app is online.`,
    },
  ],
  informational: (row) => [
    {
      question: `${row.title.replace(/\?$/, "")}?`,
      answer: `The short answer is in the summary at the top of this guide; the sections below walk through the details, examples and the mistakes people most often make.`,
    },
    {
      question: `How long does it take to set this up?`,
      answer: `Most people finish in under ten minutes. Adding each medication once, choosing a time window and confirming notification permissions is the bulk of the work.`,
    },
    {
      question: `Should I talk to my doctor or pharmacist first?`,
      answer: `Yes for anything that changes a dose, its timing or what you take alongside it. This guide is educational and does not replace personal medical advice.`,
    },
  ],
};

function faqs(row) {
  return (FAQ_BY_INTENT[row.searchIntent] ?? FAQ_BY_INTENT.informational)(row);
}

const rows = parseCsv(readFileSync(CSV, "utf8"));
const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);

const entries = rows.slice(1).map((r) => {
  const get = (n) => (r[idx(n)] ?? "").trim();
  const path = get("URL slug");
  return {
    day: Number(get("Day")),
    publishDate: get("Publish date"),
    title: get("Title").replace(/^Refresh:\s*/, ""),
    slug: path.replace(/^\/articles\//, ""),
    primaryKeyword: get("Primary keyword"),
    searchIntent: get("Search intent"),
    cluster: get("Cluster"),
    contentType: get("Content type"),
    targetWords: Number(get("Target words") || 1100),
    hubLink: get("Internal link (hub)"),
    secondaryLinks: get("Secondary internal links")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    schema: get("Schema")
      .split("+")
      .map((s) => s.trim())
      .filter(Boolean),
    isRefresh: /refresh/i.test(get("Content type")),
  };
});

const ts = `/**
 * 60-day editorial calendar (Aug 19 – Oct 17 2026) for the /articles blog.
 *
 * GENERATED by scripts/generate-content-calendar.mjs from the editorial CSV —
 * do not hand-edit. Each entry carries the planned SEO title tag, meta
 * description and FAQ block so drafts start from approved metadata and the
 * publishing validator can check a draft against its plan.
 */

export type CalendarFaq = { question: string; answer: string };

export type CalendarEntry = {
  day: number;
  publishDate: string;
  title: string;
  slug: string;
  primaryKeyword: string;
  searchIntent: "commercial" | "informational";
  cluster: string;
  contentType: string;
  targetWords: number;
  hubLink: string;
  secondaryLinks: string[];
  schema: string[];
  /** True when the entry updates an already-published post instead of adding one. */
  isRefresh: boolean;
  metaTitle: string;
  metaDescription: string;
  faqs: CalendarFaq[];
};

export const CONTENT_CALENDAR: CalendarEntry[] = ${JSON.stringify(
  entries.map((e) => ({
    ...e,
    metaTitle: titleTag(e.title),
    metaDescription: metaDescription(e),
    faqs: faqs(e),
  })),
  null,
  2,
)};

export const CALENDAR_SLUGS: string[] = CONTENT_CALENDAR.map((e) => e.slug);

export function calendarEntry(slug: string): CalendarEntry | null {
  return CONTENT_CALENDAR.find((e) => e.slug === slug) ?? null;
}

/** FAQPage JSON-LD for a planned or published post. */
export function faqSchema(entry: CalendarEntry): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entry.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
`;

writeFileSync(OUT, ts);
console.log(`wrote ${OUT} (${entries.length} entries)`);
