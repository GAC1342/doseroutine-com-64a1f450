import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";

export type GuideFaq = { q: string; a: string };

export type PeptideGuideHeadInput = {
  /** Route path, e.g. "/peptides/peptide-bond". */
  path: string;
  title: string;
  description: string;
  /** Breadcrumb label for this page. */
  crumb: string;
  /** When true the page sits directly under Home (the pillar itself). */
  isPillar?: boolean;
  faq: GuideFaq[];
  datePublished?: string;
  dateModified?: string;
  /** "Article" for explainers, "MedicalWebPage" for health-claim pages. */
  type?: "Article" | "MedicalWebPage" | "TechArticle";
  /**
   * When the guide's calculations are performed by a tool elsewhere on the
   * site, point at it. Emits a `mentions` reference to that tool's stable
   * `@id` so crawlers attribute the interactive calculator to one URL
   * instead of spreading it across every guide that explains the math.
   */
  toolUrl?: string;
};

/** Stable JSON-LD node id for the single interactive peptide calculator. */
export const PEPTIDE_CALCULATOR_ID = "https://doseroutine.com/peptide-calculator#calculator";

/**
 * Shared head() payload for the /peptides education cluster.
 *
 * Keeps canonical, hreflang, og/twitter, Article, FAQPage and BreadcrumbList
 * identical across every page in the cluster so the head-budget and
 * jsonld-contract CI gates only have one shape to validate.
 */
export function peptideGuideHead({
  path,
  title,
  description,
  crumb,
  isPillar = false,
  faq,
  datePublished = "2026-08-20",
  dateModified = "2026-08-20",
  type = "Article",
  toolUrl,
}: PeptideGuideHeadInput) {
  const canonical = `https://doseroutine.com${path}`;
  const crumbs = isPillar
    ? [{ name: crumb, path }]
    : [
        { name: "Peptides", path: "/peptides" },
        { name: crumb, path },
      ];

  return {
    meta: [
      { name: "author", content: "DoseRoutine Editorial" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: canonical },
      { property: "og:site_name", content: "DoseRoutine" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: canonical }, ...hreflangLinks(path)],
    scripts: [
      breadcrumbScript(canonical, crumbs),
      articleScript({
        url: canonical,
        headline: title,
        description,
        datePublished,
        dateModified,
        type: type === "TechArticle" ? "TechArticle" : type,
        section: "Peptides",
      }),
      {
        type: "application/ld+json" as const,
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${canonical}#faq`,
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      ...(toolUrl
        ? [
            {
              type: "application/ld+json" as const,
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebPage",
                "@id": `${canonical}#webpage`,
                url: canonical,
                name: title,
                significantLink: toolUrl,
                mentions: {
                  "@type": "WebApplication",
                  "@id": PEPTIDE_CALCULATOR_ID,
                  url: toolUrl,
                  name: "DoseRoutine Peptide Calculator",
                  applicationCategory: "HealthApplication",
                },
              }),
            },
          ]
        : []),
    ],
  };
}
