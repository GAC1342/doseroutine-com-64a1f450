import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { RelatedLinks } from "@/components/related-links";
import { TRUST_FAQ } from "@/lib/trust-faq";

export const CANONICAL = "https://doseroutine.com/faq";
const TITLE = "DoseRoutine FAQ — Interactions, Peptides, TRT & Dosing";
const DESC =
  "Answers to the most common questions about checking supplement, peptide, TRT and prescription interactions, dosing, timing and tracking with DoseRoutine.";

type Section = { heading: string; items: { q: string; a: string }[] };

const SECTIONS: Section[] = [
  {
    heading: "About DoseRoutine",
    items: [
      {
        q: "What is DoseRoutine?",
        a: "DoseRoutine is a free interaction checker and routine tracker for supplements, hormones including TRT, peptides, GLP-1s and prescriptions. You add what you take, DoseRoutine flags pairwise interactions with the mechanism and cited sources, then schedules each dose at the right time of day. It is educational information, not medical advice.",
      },
      {
        q: "Is DoseRoutine free?",
        a: "Yes. The interaction checker, the 475+ compound library, and the dosing calculators are free to use. A Pro tier adds unlimited stacks, lab and blood-work tracking, injection-site rotation, fitness and body-metric logging, and the AI coach.",
      },
      {
        q: "Is DoseRoutine an app or a website?",
        a: "Both. The full product runs in any browser and installs as an app on iPhone, iPad, Android phones and tablets, and desktop. Native builds are also shipping through the App Store and Google Play.",
      },
      {
        q: "Does DoseRoutine give medical advice?",
        a: "No. DoseRoutine compiles publicly available reference information from sources such as NIH/MedlinePlus, FDA labeling, Mayo Clinic and PubChem, and shows you where interactions have been documented. It does not diagnose, prescribe or replace a clinician or pharmacist.",
      },
    ],
  },
  {
    heading: "Interaction checking",
    items: [
      {
        q: "How do I check if two supplements interact?",
        a: "Open the interaction checker, add each item you take, and DoseRoutine compares every pair in your list. Each flagged pair shows a severity level, the mechanism behind the interaction, whether separating the doses in time resolves it, and the sources the caution comes from.",
      },
      {
        q: "Can I check peptides against prescriptions?",
        a: "Yes. The checker covers peptide-to-peptide, peptide-to-hormone and peptide-to-prescription combinations, including GLP-1s, growth-hormone secretagogues, healing peptides and common prescriptions. Where evidence is thin, the page says so rather than inventing a verdict.",
      },
      {
        q: "What do the severity levels mean?",
        a: "Severe means the combination is generally avoided. Moderate means it can usually be managed with timing changes, monitoring or a clinician's sign-off. Mild or note-level entries are absorption, timing or comfort issues rather than safety risks. You can filter results by severity.",
      },
      {
        q: "Where does the interaction data come from?",
        a: "Interaction entries are compiled from public pharmacology and clinical literature, drug labeling and NIH resources, with PubMed IDs or DOI links attached where a specific study supports the entry. Every reference page links its sources so you can read the original.",
      },
    ],
  },
  {
    heading: "Dosing, timing and calculators",
    items: [
      {
        q: "How do I convert a peptide dose in mg to insulin-syringe units?",
        a: "Work out your concentration in mg per mL — vial strength divided by the milliliters of bacteriostatic water you added — then divide your dose in mg by that concentration to get milliliters, and multiply by 100 for a U-100 syringe. The peptide dosage calculator does this for you and shows the syringe mark.",
      },
      {
        q: "How much bacteriostatic water should I add to a vial?",
        a: "There is no single correct amount: the volume you add sets the concentration and therefore how many units each dose measures. The reconstitution calculator lets you pick a target dose and shows which fill volumes land on easy, readable syringe marks.",
      },
      {
        q: "Can DoseRoutine schedule doses more than once a day?",
        a: "Yes. Each item can have several times per day, specific days of the week, cycles on and off, food rules, and a vacation mode that pauses reminders without breaking your adherence history.",
      },
      {
        q: "Does it track adherence and streaks?",
        a: "Yes. Doses can be logged on time, logged late, or skipped, and the adherence score and streak reflect the real record. A short grace period keeps a dose live before it is marked missed, and missed doses can still be logged late.",
      },
    ],
  },
  {
    heading: "Tracking and data",
    items: [
      {
        q: "Can I track blood work and body metrics?",
        a: "Yes. You can log lab panels over time, weight and body measurements, progress photos, workouts and cardio, and injection-site rotation so the same site is not reused too soon.",
      },
      {
        q: "Is my health data private?",
        a: "Your routine and health entries are visible only to your signed-in account, protected by row-level database security. Public reference pages contain no user data, and you can delete your account and its data at any time from the data-deletion page.",
      },
    ],
  },
  {
    heading: "Trust & safety",
    // Same wording as the <TrustSafety /> block on the homepage and sign-up page.
    items: TRUST_FAQ.map((p) => ({ q: p.q, a: p.a })),
  },
];

const ALL = SECTIONS.flatMap((s) => s.items);

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/faq")],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "FAQPage",
              "@id": `${CANONICAL}#faq`,
              url: CANONICAL,
              name: TITLE,
              description: DESC,
              inLanguage: "en",
              isPartOf: { "@id": "https://doseroutine.com/#website" },
              publisher: {
                "@type": "Organization",
                "@id": "https://doseroutine.com/#organization",
                name: "DoseRoutine",
                url: "https://doseroutine.com",
              },
              speakable: {
                "@type": "SpeakableSpecification",
                cssSelector: [".dr-speakable-answer"],
              },
              mainEntity: ALL.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${CANONICAL}#breadcrumb`,
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://doseroutine.com/",
                },
                { "@type": "ListItem", position: 2, name: "FAQ", item: CANONICAL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: FaqHub,
});

function FaqHub() {
  return (
    <div id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 py-6">
      <PublicBackHeader />

      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">DoseRoutine FAQ</h1>
        <p className="dr-speakable-answer mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Common questions about checking interactions between supplements, peptides, TRT and
          prescriptions, converting doses, and tracking a routine with DoseRoutine. Everything here
          is educational reference information, not medical advice.
        </p>
      </header>

      <nav aria-label="FAQ sections" className="mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.heading}
            href={`#${slugify(s.heading)}`}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            {s.heading}
          </a>
        ))}
      </nav>

      {SECTIONS.map((s) => (
        <section key={s.heading} id={slugify(s.heading)} className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">{s.heading}</h2>
          <div className="space-y-4">
            {s.items.map((f) => (
              <article key={f.q} className="rounded-xl bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="mb-10 rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-base font-semibold">Keep going</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>
            <Link
              to="/interaction-checker"
              className="text-primary underline-offset-2 hover:underline"
            >
              Check your own combination
            </Link>
          </li>
          <li>
            <Link to="/library" className="text-primary underline-offset-2 hover:underline">
              Browse the compound library
            </Link>
          </li>
          <li>
            <Link to="/calculators" className="text-primary underline-offset-2 hover:underline">
              Dosing and reconstitution calculators
            </Link>
          </li>
          <li>
            <Link to="/help" className="text-primary underline-offset-2 hover:underline">
              Help center and how-tos
            </Link>
          </li>
        </ul>
      </section>

      <RelatedLinks currentPath="/faq" kind="both" />

      <AttributionFooter />
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
