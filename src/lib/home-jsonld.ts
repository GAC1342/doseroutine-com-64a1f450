/**
 * Homepage structured data (SoftwareApplication + FAQPage).
 *
 * Kept out of the route component so CI can validate the exact objects the
 * homepage renders (see src/lib/__tests__/jsonld-schema-contract.test.ts)
 * without booting a server.
 */
import { TRUST_FAQ } from "@/lib/trust-faq";

const SPEAKABLE = {
  "@type": "SpeakableSpecification",
  cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
} as const;

/** Translation keys used to build the homepage FAQPage, in display order. */
export const HOME_FAQ_KEYS = [
  ["faqQ1", "faqA1"],
  ["faqQ2", "faqA2"],
  ["faqQ3", "faqA3"],
  ["faqQ4", "faqA4"],
  ["faqQ5", "faqA5"],
  ["faqQ6", "faqA6"],
  ["faqQ7", "faqA7"],
  ["faqQ8", "faqA8"],
] as const;

export function homeAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    speakable: SPEAKABLE,
    name: "DoseRoutine",
    alternateName: [
      "Dose Routine",
      "DoseRoutine",
      "Dose Routine app",
      "DoseRoutine app",
      "dose routine",
      "doseroutine.com",
      "DoseRoutine – Supplement, Peptide & Routine Tracker",
    ],
    disambiguatingDescription:
      '"Dose Routine" and "DoseRoutine" are the same app at doseroutine.com.',
    image: "https://doseroutine.com/icon-512.png",
    publisher: { "@id": "https://doseroutine.com/#organization" },
    brand: { "@id": "https://doseroutine.com/#brand" },
    url: "https://doseroutine.com/",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web, iOS, Android",
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "USD", name: "7-day free trial" },
      { "@type": "Offer", price: "9.99", priceCurrency: "USD", name: "Pro Monthly" },
      { "@type": "Offer", price: "59.99", priceCurrency: "USD", name: "Pro Annual" },
    ],
    description:
      "The only routine tracker built for peptides, hormones and HRT/TRT — not just vitamins. Free to start — no card needed. Interaction checks across 475+ compounds, AI plans and reminders.",
  };
}

export function homeFaqSchema(t: (key: string) => string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      ...HOME_FAQ_KEYS.map(([q, a]) => ({
        "@type": "Question",
        name: t(q),
        acceptedAnswer: { "@type": "Answer", text: t(a) },
      })),
      // Trust & safety block rendered by <TrustSafety /> on the homepage —
      // same wording, so the visible text and the schema stay identical.
      ...TRUST_FAQ.map((p) => ({
        "@type": "Question",
        name: p.q,
        acceptedAnswer: { "@type": "Answer", text: p.a },
      })),
    ],
  };
}
