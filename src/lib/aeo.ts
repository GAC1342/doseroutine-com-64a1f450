// Answer Engine Optimization (AEO) helpers.
//
// Answer engines (Google AI Overviews, ChatGPT Search, Perplexity, Claude,
// Gemini) reward three things this module standardises:
//   1. A short, extractable "short answer" paragraph near the top of the page,
//      marked up with `speakable` so it is the sentence that gets quoted.
//   2. FAQPage JSON-LD whose Q&A text matches visible on-page content.
//   3. A dated WebPage entity tied to the sitewide Organization/WebSite so the
//      answer can be attributed and freshness-ranked.
//
// Every helper here emits absolute URLs and links back to the shared
// `#organization` / `#website` nodes emitted by __root.tsx.

import { faqAnchorId } from "@/lib/faq-snippet";

const SITE = "https://doseroutine.com";
const ORG_ID = `${SITE}/#organization`;
const WEBSITE_ID = `${SITE}/#website`;

/** CSS selectors rendered by <AnswerFirst> and <AeoFaq>. */
export const SPEAKABLE_SELECTORS = [".dr-speakable-answer", ".dr-speakable-intro"];

export const speakableSpec = {
  "@type": "SpeakableSpecification",
  cssSelector: SPEAKABLE_SELECTORS,
} as const;

export type AeoFaqPair = { q: string; a: string };

/** FAQPage JSON-LD. Pairs MUST also be rendered visibly via <AeoFaq>. */
export function aeoFaqSchema(url: string, pairs: AeoFaqPair[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    mainEntity: pairs.map((p) => ({
      "@type": "Question",
      "@id": `${url}#${faqAnchorId(p.q)}`,
      url: `${url}#${faqAnchorId(p.q)}`,
      name: p.q,
      acceptedAnswer: { "@type": "Answer", text: p.a },
    })),
  };
}

export function aeoFaqScript(url: string, pairs: AeoFaqPair[]) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(aeoFaqSchema(url, pairs)),
  };
}

export type AnswerPageInput = {
  url: string;
  name: string;
  description: string;
  /** ISO date the page content was last reviewed. Drives freshness ranking. */
  dateModified: string;
  datePublished?: string;
  /** Short extractable answer, duplicated from the visible <AnswerFirst>. */
  shortAnswer?: string;
  /** Entities the page is about — helps answer engines resolve the topic. */
  about?: string[];
  type?: "WebPage" | "CollectionPage" | "AboutPage" | "QAPage" | "FAQPage";
};

/**
 * A dated, speakable WebPage node. Use on tool/hub pages that have no Article
 * schema of their own — without it those pages carry no freshness or
 * "what is this page about" signal at all.
 */
export function answerPageSchema(input: AnswerPageInput) {
  const {
    url,
    name,
    description,
    dateModified,
    datePublished = dateModified,
    shortAnswer,
    about,
    type = "WebPage",
  } = input;

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "en",
    datePublished,
    dateModified,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    copyrightHolder: { "@id": ORG_ID },
    author: { "@id": ORG_ID },
    reviewedBy: { "@id": ORG_ID },
    publishingPrinciples: `${SITE}/editorial-policy`,
    speakable: speakableSpec,
    ...(shortAnswer ? { abstract: shortAnswer } : {}),
    ...(about && about.length ? { about: about.map((t) => ({ "@type": "Thing", name: t })) } : {}),
  };
}

export function answerPageScript(input: AnswerPageInput) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(answerPageSchema(input)),
  };
}

/**
 * The freshness + extractability fields, without the surrounding node.
 *
 * Use this to enrich a page-entity node a route already emits, instead of
 * adding a second WebPage/CollectionPage for the same URL — duplicate page
 * entities make parsers pick one arbitrarily and drop the other's signals.
 */
export function aeoPageFields(input: {
  dateModified: string;
  datePublished?: string;
  shortAnswer?: string;
  about?: string[];
}) {
  const { dateModified, datePublished = dateModified, shortAnswer, about } = input;
  return {
    datePublished,
    dateModified,
    author: { "@id": ORG_ID },
    reviewedBy: { "@id": ORG_ID },
    publishingPrinciples: `${SITE}/editorial-policy`,
    speakable: speakableSpec,
    ...(shortAnswer ? { abstract: shortAnswer } : {}),
    ...(about && about.length ? { about: about.map((t) => ({ "@type": "Thing", name: t })) } : {}),
  };
}
