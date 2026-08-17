import { Link } from "@tanstack/react-router";
import { ArrowRight, HelpCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { RelatedCompounds, type RelatedCompound } from "@/components/related-compounds";
import { breadcrumbSchema } from "@/lib/breadcrumb-schema";


export type WomensHubContent = {
  slug: "womens-health" | "menopause-hormones" | "longevity" | "sexual-health" | "fertility-cycle";
  title: string;
  h1: string;
  intro: string; // ~150 words
  cards: { href: string; name: string; blurb: string }[];
  crossLinks: { href: string; label: string; blurb: string }[];
  faq: { q: string; a: string }[];
  relatedCompounds?: RelatedCompound[];
};

const ORG = {
  "@type": "Organization",
  "@id": "https://doseroutine.com/#organization",
  name: "DoseRoutine",
  url: "https://doseroutine.com",
  logo: "https://doseroutine.com/icon-512.png",
};

export function womensHubCanonical(slug: string) {
  return slug === "womens-health"
    ? "https://doseroutine.com/library/womens-health"
    : `https://doseroutine.com/library/womens-health/${slug}`;
}

export function womensHubHead(c: WomensHubContent) {
  const url = womensHubCanonical(c.slug);
  const title = `${c.title} | DoseRoutine`;
  const desc = c.intro.slice(0, 155).replace(/\s+\S*$/, "") + "…";
  const ogImage = "https://doseroutine.com/og/hub-mens-health.jpg";

  // Sitewide trail shape: Home › Library › Women's Health › (sub-hub).
  const crumbs =
    c.slug === "womens-health"
      ? [
          { name: "Library", path: "/library" },
          { name: "Women's Health", path: "/library/womens-health" },
        ]
      : [
          { name: "Library", path: "/library" },
          { name: "Women's Health", path: "/library/womens-health" },
          { name: c.title, path: `/library/womens-health/${c.slug}` },
        ];


  const medicalLD = {
    "@context": "https://schema.org",
    "@type": ["WebPage", "CollectionPage"],
    "@id": url + "#medicalpage",
    url,
    name: title,
    description: desc,
    inLanguage: "en",
    audience: { "@type": "PeopleAudience", audienceType: "Adult women", suggestedGender: "Female" },
    publisher: ORG,
    author: ORG,
    copyrightHolder: ORG,
    isBasedOn: url,
  };
  const breadcrumbLD = breadcrumbSchema(url, crumbs);

  const faqLD = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": url + "#faq",
    inLanguage: "en",
    isBasedOn: url,
    publisher: ORG,
    author: ORG,
    mainEntity: c.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
        author: ORG,
        publisher: ORG,
        url,
        inLanguage: "en",
      },
    })),
  };

  return {
    meta: [
      { title },
      { name: "description", content: desc },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "author", content: "DoseRoutine" },
      { name: "publisher", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: ogImage },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${c.title} — DoseRoutine` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
      { name: "twitter:image", content: ogImage },
      { name: "twitter:image:alt", content: `${c.title} — DoseRoutine` },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json" as const, children: JSON.stringify(medicalLD) },
      { type: "application/ld+json" as const, children: JSON.stringify(breadcrumbLD) },
      { type: "application/ld+json" as const, children: JSON.stringify(faqLD) },
    ],
  };
}

export function WomensHubPage({ c }: { c: WomensHubContent }) {
  const url = womensHubCanonical(c.slug);
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      {/* Original: ${url} — © DoseRoutine. Reproduction requires attribution to doseroutine.com */}
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/library" className="hover:underline">
              Library
            </Link>
            {c.slug !== "womens-health" && (
              <>
                <span> / </span>
                <Link to="/library/womens-health" className="hover:underline">
                  Women's Health
                </Link>
              </>
            )}
          </nav>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{c.h1}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{c.intro}</p>
          <p className="text-xs text-muted-foreground">
            Original editorial by <strong>DoseRoutine</strong> —{" "}
            <a href={url} className="underline">
              {url}
            </a>
            .
          </p>
        </header>

        {c.cards.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">
              {c.slug === "womens-health" ? "Explore by area" : "Compounds in this hub"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.cards.map((card) => (
                <a key={card.href} href={card.href} className="block">
                  <Card className="h-full p-4 hover:shadow-md transition-shadow">
                    <div className="font-semibold">{card.name}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{card.blurb}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm text-primary font-medium">
                      Read <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Card>
                </a>
              ))}
            </div>
          </section>
        )}

        {c.crossLinks.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">
              {c.slug === "womens-health" ? "Related resources" : "Other Women's Health hubs"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.crossLinks.map((l) => (
                <a key={l.href} href={l.href} className="block">
                  <Card className="h-full p-4 hover:shadow-md transition-shadow">
                    <div className="font-semibold">{l.label}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{l.blurb}</p>
                  </Card>
                </a>
              ))}
            </div>
          </section>
        )}

        <RelatedCompounds
          compounds={c.relatedCompounds}
          heading="Related compounds"
          description="Jump straight to the individual compound pages — evidence, dosing, and interactions for each."
        />

        <section className="space-y-3" aria-labelledby="hub-faq">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 id="hub-faq" className="text-2xl font-bold">
              FAQ
            </h2>
          </div>
          <div className="space-y-3">
            {c.faq.map((f, i) => (
              <Card key={i} className="p-4">
                <h3 className="text-base font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed">{f.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="border-2 border-cta/40 p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-cta" />
            <div className="text-sm">
              <p className="font-semibold text-base">
                Track your women's health stack in DoseRoutine
              </p>
              <p className="text-muted-foreground mt-1">
                Get access to all DoseRoutine tools — every supplement, HRT dose, birth-control pill
                and daily item in one place.
              </p>
              <Link
                to="/auth"
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-cta px-3 py-2 font-semibold text-cta-foreground transition-colors hover:bg-cta-hover"
              >
                Sign up free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Card>

        <footer className="border-t pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Educational, not medical advice. Talk to a clinician before starting or stopping any
            supplement — especially if you take HRT, birth control, thyroid medication, or another
            prescription.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} <strong>DoseRoutine</strong> — original content published
            at{" "}
            <a href={url} className="underline">
              {url}
            </a>
            .
          </p>
        </footer>
        <AttributionFooter sourceUrl={url} />
      </article>
    </main>
  );
}
