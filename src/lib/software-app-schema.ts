// Shared SoftwareApplication entity for DoseRoutine.
//
// Answer engines ("what's the best app for X?") pick apps they can resolve to
// a single, well-described software entity. Emitting the SAME @id from every
// page that recommends the app merges those mentions into one entity instead
// of a dozen unrelated nodes.

const SITE = "https://doseroutine.com";
const ORG_ID = `${SITE}/#organization`;
const BRAND_ID = `${SITE}/#brand`;

/**
 * Stable @id for the app entity. Identical on every page that references it.
 *
 * The full node is declared ONCE, sitewide, in src/routes/__root.tsx. Pages
 * that talk about the app emit a reference to this @id instead of a second
 * declaration — two declarations of one app split the entity and let crawlers
 * pick either body (see src/lib/jsonld-duplicates.ts).
 */
export const APP_ID = `${SITE}/#software`;

export const APP_FEATURE_LIST = [
  "Interaction checking across 475+ supplements, peptides, hormones and prescriptions",
  "Peptide reconstitution calculator (mg to mL to syringe units)",
  "TRT and HRT cycle tracking with injection-site rotation",
  "Blood work tracking with trends over time",
  "Multi-time, weekly and cyclical dose scheduling with reminders",
  "Vial inventory and refill predictions",
  "AI-assisted stack planning with cited sources",
  "Shareable PDF protocol summaries for clinicians",
  "Adherence scoring and streaks",
  "Workout, cardio and body-metric logging",
];

export type SoftwareAppInput = {
  /** Canonical URL of the page emitting this node. */
  url: string;
  /** Optional page-specific description; defaults to the standard one. */
  description?: string;
};

export const APP_DESCRIPTION =
  "DoseRoutine is a tracking app for people running supplements, peptides, TRT/HRT and GLP-1 medications together — with interaction checks, reconstitution math, blood work trends and reminders in one place.";

export function softwareAppNode({ url, description = APP_DESCRIPTION }: SoftwareAppInput) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: "DoseRoutine",
    alternateName: ["Dose Routine", "DoseRoutine app", "Dose Routine app"],
    url: `${SITE}/`,
    mainEntityOfPage: url,
    image: `${SITE}/icon-512.png`,
    screenshot: `${SITE}/icon-512.png`,
    applicationCategory: "HealthApplication",
    applicationSubCategory: "Medication & supplement tracking",
    operatingSystem: "Web, iOS, Android",
    softwareVersion: "1.0",
    inLanguage: "en",
    isAccessibleForFree: true,
    description,
    featureList: APP_FEATURE_LIST,
    publisher: { "@id": ORG_ID },
    brand: { "@id": BRAND_ID },
    author: { "@id": ORG_ID },
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free plan" },
      { "@type": "Offer", price: "9.99", priceCurrency: "USD", name: "Pro Monthly" },
      { "@type": "Offer", price: "59.99", priceCurrency: "USD", name: "Pro Annual" },
    ],
  };
}

/*
 * There is deliberately no per-page SoftwareApplication *stub*.
 *
 * __root.tsx already emits the complete app node (with @id APP_ID) into the
 * head of every page, so a second {@type,@id} block on marketing pages added
 * nothing — and Google's Rich Results Test grades each node on its own, so the
 * stub reported "missing field name". Pages that need to point at the app
 * should reference APP_ID from inside another node (e.g. ItemList members
 * below), never re-declare it.
 */

/** ItemList JSON-LD for a roundup page: the ordered apps it recommends. */
export function appItemListScript(
  url: string,
  name: string,
  apps: Array<{ name: string; description: string; url?: string }>,
) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${url}#itemlist`,
      name,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: apps.length,
      itemListElement: apps.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        // Our own app points at the canonical node by @id and must not
        // restate fields with different values — Rich Results reports two
        // different `description`s for one @id as a conflict.
        item:
          a.name === "DoseRoutine"
            ? { "@id": APP_ID }
            : {
                "@type": "SoftwareApplication",
                name: a.name,
                description: a.description,
                applicationCategory: "HealthApplication",
                ...(a.url ? { url: a.url } : {}),
              },
      })),
    }),
  };
}
