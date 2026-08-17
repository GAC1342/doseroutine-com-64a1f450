import { faqAnchorId } from "@/lib/faq-snippet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";
import { hreflangLinks } from "@/lib/hreflang";

const pageUrl = "https://doseroutine.com/dose-routine";
const pageTitle = "Dose Routine or DoseRoutine? Same App — doseroutine.com";
const pageDescription =
  '"Dose Routine" (two words) and "DoseRoutine" (one word) are the same free app: a supplement, peptide and TRT interaction checker.';

const LAST_REVIEWED = "2026-08-01";

const DOSE_ROUTINE_FAQ: { q: string; a: string }[] = [
  {
    q: "Is Dose Routine the same as DoseRoutine?",
    a: "Yes. Dose Routine (two words) and DoseRoutine (one word) are the same app and the same company. The official website is doseroutine.com.",
  },
  {
    q: "What does the Dose Routine app do?",
    a: "DoseRoutine checks interactions between supplements, peptides, hormones including TRT, GLP-1s and prescriptions across 475+ compounds, then lets you build a stack, schedule doses and track adherence.",
  },
  {
    q: "Is the Dose Routine app free?",
    a: "The interaction checker, compound library and dosage calculators are free to use. Tracking features come with a 7-day free trial and then a subscription.",
  },
  {
    q: "Where do I download Dose Routine?",
    a: "DoseRoutine runs in any browser at doseroutine.com and installs to your home screen as an app from doseroutine.com/install.",
  },
];

export const Route = createFileRoute("/dose-routine")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "article" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:url", content: pageUrl },
      { property: "og:image", content: "https://doseroutine.com/og/doseroutine-home.jpg" },
      { property: "og:image:alt", content: "DoseRoutine app card — peptide, supplement and hormone tracking with interaction checks" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://doseroutine.com/og/doseroutine-home.jpg" },
      { name: "twitter:image:alt", content: "DoseRoutine app card — peptide, supplement and hormone tracking with interaction checks" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [{ rel: "canonical", href: pageUrl }, ...hreflangLinks("/dose-routine")],
    scripts: [
      breadcrumbScript(pageUrl, [{ name: "Dose Routine", path: "/dose-routine" }]),
      articleScript({
        url: pageUrl,
        headline: "Dose Routine and DoseRoutine are the same app",
        description: pageDescription,
        datePublished: "2026-08-01",
        dateModified: LAST_REVIEWED,
        image: "https://doseroutine.com/og/doseroutine-home.jpg",
        section: "Brand",
      }),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${pageUrl}#webpage`,
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          inLanguage: "en",
          isPartOf: { "@id": "https://doseroutine.com/#website" },
          about: { "@id": "https://doseroutine.com/#organization" },
          mainEntity: { "@id": "https://doseroutine.com/#organization" },
          publisher: { "@id": "https://doseroutine.com/#organization" },
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          dateModified: LAST_REVIEWED,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${pageUrl}#faq`,
          mainEntity: DOSE_ROUTINE_FAQ.map((f) => ({
            "@type": "Question",
            "@id": `${pageUrl}#${faqAnchorId(f.q)}`,
            url: `${pageUrl}#${faqAnchorId(f.q)}`,
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: DoseRoutineBrandPage,
});

function DoseRoutineBrandPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 pb-24 pt-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Dose Routine and DoseRoutine are the same app
        </h1>
        <p className="dr-speakable-answer mt-4 text-base leading-relaxed text-foreground/90">
          Dose Routine is DoseRoutine: a free interaction checker for supplements, peptides,
          hormones including TRT, GLP-1s and prescriptions, covering 475+ compounds, at
          doseroutine.com.
        </p>
        <p className="dr-speakable-intro mt-4 text-base leading-relaxed text-foreground/90">
          People write our name both ways. <strong>Dose Routine</strong> as two words and{" "}
          <strong>DoseRoutine</strong> as one word both refer to the same product, run by the same
          team, at the same official website:{" "}
          <a href="https://doseroutine.com" className="underline">
            doseroutine.com
          </a>
          . There is no separate "Dose Routine" app.
        </p>

        <h2 className="mt-10 font-display text-xl font-semibold tracking-tight">
          What the Dose Routine app does
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          DoseRoutine is, first, an <strong>interaction checker</strong>. You enter what you take —
          supplements, peptides, hormones including TRT, GLP-1s, prescriptions — and it flags
          pairwise cautions with the mechanism behind each one and cited sources. On top of that
          sits an optional stack builder, dose scheduler, reminder system and adherence tracking.
        </p>

        <h2 className="mt-10 font-display text-xl font-semibold tracking-tight">Start here</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
          <li>
            <Link to="/interaction-checker" className="underline">
              Check interactions between two or more compounds
            </Link>
          </li>
          <li>
            <Link to="/library" className="underline">
              Browse the 475+ compound library behind the checker
            </Link>
          </li>
          <li>
            <Link to="/calculators" className="underline">
              Use the dosage and reconstitution calculators
            </Link>
          </li>
          <li>
            <Link to="/install" className="underline">
              Install Dose Routine on your phone's home screen
            </Link>
          </li>
          <li>
            <Link to="/about" className="underline">
              Read about the team and how the data is built
            </Link>
          </li>
        </ul>

        <h2 className="mt-10 font-display text-xl font-semibold tracking-tight">
          Common questions
        </h2>
        <dl className="mt-3 space-y-4 text-sm leading-relaxed text-foreground/90">
          {DOSE_ROUTINE_FAQ.map((f) => (
            <div key={f.q} id={faqAnchorId(f.q)} className="scroll-mt-24">
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-1 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
          <div>
            <dt className="font-medium">Is it medical advice?</dt>
            <dd className="mt-1 text-muted-foreground">
              No. DoseRoutine is an educational health and fitness reference — see our{" "}
              <Link to="/editorial-policy" className="underline">
                editorial policy
              </Link>{" "}
              and{" "}
              <Link to="/medical-disclaimer" className="underline">
                medical disclaimer
              </Link>
              .
            </dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
