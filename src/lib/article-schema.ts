// Helper to build Article JSON-LD for editorial content pages.
// Use for articles, policies, disclaimers, and long-form comparison pages
// so Google can surface title, author, and publication dates.

const SITE = "https://doseroutine.com";
const ORG_ID = `${SITE}/#organization`;
// Must be a file that actually exists — a 404 og:image is worse than none.
const DEFAULT_IMAGE = `${SITE}/og/doseroutine-home.jpg`;
const EDITORIAL_POLICY = `${SITE}/editorial-policy`;

export type ArticleSchemaInput = {
  url: string;
  headline: string;
  description: string;
  datePublished: string; // ISO 8601, e.g. "2026-07-23"
  dateModified?: string; // defaults to datePublished
  image?: string; // absolute URL
  type?: "Article" | "NewsArticle" | "TechArticle" | "MedicalWebPage";
  authorName?: string; // defaults to "DoseRoutine Editorial"
  section?: string;
};

export function articleSchema(input: ArticleSchemaInput) {
  const {
    url,
    headline,
    description,
    datePublished,
    dateModified = datePublished,
    image = DEFAULT_IMAGE,
    type = "Article",
    authorName = "DoseRoutine Editorial",
    section,
  } = input;

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline,
    // MedicalWebPage is a WebPage subtype: Google's Rich Results Test wants
    // `name`, not `headline`, so emit both for that type.
    ...(type === "MedicalWebPage" ? { name: headline } : {}),
    description,
    url,
    inLanguage: "en",
    datePublished,
    dateModified,
    image: [image],
    // Link the author to the sitewide Organization entity instead of a bare
    // string so search engines and AI answer engines can resolve who wrote it.
    // A named editorial byline gets its own entity. Re-using ORG_ID with a
    // different `name` would redefine the sitewide Organization and Rich
    // Results flags the conflicting values.
    author:
      authorName === "DoseRoutine"
        ? { "@id": ORG_ID }
        : {
            "@type": "Organization",
            "@id": `${SITE}/#editorial-team`,
            name: authorName,
            url: EDITORIAL_POLICY,
            logo: {
              "@type": "ImageObject",
              url: `${SITE}/icon-512.png`,
            },
            parentOrganization: { "@id": ORG_ID },
          },
    publisher: { "@id": ORG_ID },
    copyrightHolder: { "@id": ORG_ID },
    isPartOf: { "@id": `${SITE}/#website` },
    // Editorial standards page — a documented review process is what
    // quality systems and AI citation pipelines look for on health content.
    publishingPrinciples: EDITORIAL_POLICY,
    // Points answer engines at the answer-first summary block so that is the
    // passage they extract, rather than whatever paragraph comes first.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".dr-speakable-answer", ".dr-speakable-intro"],
    },
    ...(section ? { articleSection: section } : {}),
  };
}

export function articleScript(input: ArticleSchemaInput) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(articleSchema(input)),
  };
}
