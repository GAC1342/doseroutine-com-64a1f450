import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";

export type VsHeadInput = {
  /** Route path, e.g. "/vs/bearable". */
  path: string;
  title: string;
  description: string;
  /** Competitor label used in the breadcrumb trail, e.g. "vs. Bearable". */
  crumb: string;
  faq: { q: string; a: string }[];
  datePublished?: string;
  dateModified?: string;
};

/** Shared head() payload for the /vs/* comparison pages. */
export function vsHead({
  path,
  title,
  description,
  crumb,
  faq,
  datePublished = "2026-08-20",
  dateModified = "2026-08-20",
}: VsHeadInput) {
  const canonical = `https://doseroutine.com${path}`;
  return {
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title },
      { name: "description", content: description },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: canonical }, ...hreflangLinks(path)],
    scripts: [
      breadcrumbScript(canonical, [
        { name: "Comparisons", path: "/vs" },
        { name: crumb, path },
      ]),
      articleScript({
        url: canonical,
        headline: title,
        description,
        datePublished,
        dateModified,
        section: "Comparisons",
      }),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  };
}
