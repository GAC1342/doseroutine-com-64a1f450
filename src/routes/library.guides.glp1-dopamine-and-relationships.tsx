import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Info, ShieldAlert } from "lucide-react";
import { AttributionFooter } from "@/components/attribution-footer";
import { PublicBackHeader } from "@/components/public-back-header";
import { Card } from "@/components/ui/card";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { mergeLdScripts } from "@/lib/head-budget";

export const CANONICAL = "https://doseroutine.com/library/guides/glp1-dopamine-and-relationships";
const TITLE = "GLP-1, Dopamine & Relationships: What We Know";
const DESC =
  "How GLP-1 medicines may affect dopamine, reward, motivation, alcohol cravings, pleasure and relationships — separating human evidence from online anecdotes.";

export const FAQS = [
  {
    q: "Do GLP-1 medicines lower dopamine?",
    a: "There is no good evidence that semaglutide or tirzepatide simply depletes dopamine. GLP-1 receptors interact with reward circuits, and animal studies suggest they can reduce the motivational pull of highly rewarding stimuli. Human evidence is still developing and does not support describing the effect as a universal dopamine deficiency.",
  },
  {
    q: "Can semaglutide cause anhedonia?",
    a: "Some people report reduced excitement, motivation or pleasure, but anhedonia is not established as a common direct effect in clinical trials. Rapid weight loss, low calorie intake, nausea, fatigue, sleep disruption and existing mood conditions can produce similar symptoms and should be considered.",
  },
  {
    q: "Can a GLP-1 change romantic feelings or relationships?",
    a: "No clinical study shows that GLP-1 medicines directly change attachment or romantic love. Appetite, alcohol use, body image, energy, libido and shared routines can all change during treatment, which may indirectly alter how a relationship feels. Online stories cannot separate those factors from a medicine effect.",
  },
  {
    q: "Why do some people lose interest in alcohol or shopping?",
    a: "GLP-1 signaling reaches brain regions involved in reward and reinforcement. Early human studies and consistent animal findings suggest reduced alcohol craving or reward may be possible, but evidence for shopping, gambling and other behaviors is mostly anecdotal.",
  },
  {
    q: "What should I do if I feel emotionally flat?",
    a: "Track when it began, sleep, food intake, hydration, dose changes and other medicines, then discuss it promptly with your prescriber. Seek urgent help for suicidal thoughts, severe depression or an inability to function. Do not stop or change a prescribed medicine without professional guidance.",
  },
];

const REFERENCES = [
  {
    label:
      "Eren-Yazicioglu et al. GLP-1 receptor agonists and substance use disorders: a review. Frontiers in Neuroscience (2021).",
    url: "https://pubmed.ncbi.nlm.nih.gov/34955715/",
  },
  {
    label:
      "Jensen et al. GLP-1 receptor agonist treatment and alcohol intake in patients with obesity. Basic & Clinical Pharmacology & Toxicology (2022).",
    url: "https://pubmed.ncbi.nlm.nih.gov/35754076/",
  },
  {
    label: "FDA prescribing information and safety communications for semaglutide products.",
    url: "https://www.accessdata.fda.gov/scripts/cder/daf/",
  },
  {
    label: "ClinicalTrials.gov research on semaglutide and alcohol use disorder.",
    url: "https://clinicaltrials.gov/search?term=semaglutide%20alcohol%20use%20disorder",
  },
];

export const Route = createFileRoute("/library/guides/glp1-dopamine-and-relationships")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/guides/glp1-dopamine-and-relationships"),
    ],
    scripts: mergeLdScripts([
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          headline: TITLE,
          description: DESC,
          url: CANONICAL,
          image: ["https://doseroutine.com/og-image.png"],
          inLanguage: "en",
          datePublished: "2026-07-31",
          dateModified: "2026-07-31",
          author: {
            "@type": "Organization",
            "@id": "https://doseroutine.com/#organization",
            name: "DoseRoutine",
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://doseroutine.com/#organization",
            name: "DoseRoutine",
            logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Library",
              item: "https://doseroutine.com/library",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "GLP-1, Dopamine & Relationships",
              item: CANONICAL,
            },
          ],
        }),
      },
    ]),
  }),
  component: Glp1DopamineGuide,
});

function Glp1DopamineGuide() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-primary">GLP-1 science guide</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            GLP-1, dopamine and relationships: what we actually know
          </h1>
          <p className="text-lg text-muted-foreground">
            Reports of “food noise” disappearing have expanded into claims about alcohol, shopping,
            motivation and even romantic attachment. The biology is plausible in parts, but the
            strongest online claims run ahead of human evidence.
          </p>
        </header>

        <Card className="space-y-2 border-l-4 border-l-primary p-5">
          <div className="flex items-center gap-2 font-semibold">
            <Brain className="h-5 w-5 text-primary" /> The short answer
          </div>
          <p className="text-sm text-muted-foreground">
            GLP-1 signaling affects both appetite and reward networks. That may reduce how strongly
            some cues drive wanting or craving. It does not prove that these medicines “erase
            dopamine,” change love, or cause emotional numbness in everyone.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Appetite and reward are connected, not identical</h2>
          <p className="text-sm text-muted-foreground">
            GLP-1 receptors are found beyond the gut and pancreas, including in brain networks that
            help regulate appetite, learning and reward. Dopamine is part of those networks, but it
            is better understood as a signal involved in motivation, prediction and learning than a
            simple “pleasure chemical.” A change in craving does not automatically mean dopamine is
            low or that the ability to feel pleasure has disappeared.
          </p>
          <p className="text-sm text-muted-foreground">
            Animal studies consistently show that GLP-1 receptor activation can reduce reward-driven
            eating and interest in alcohol or other substances. Early human evidence is promising
            for alcohol craving, but the research is not yet strong enough to generalize that effect
            to every rewarding behavior.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Why “food noise” may quiet down</h2>
          <p className="text-sm text-muted-foreground">
            Slower stomach emptying, earlier fullness and central appetite signaling all reduce the
            urgency attached to food cues. For many people that feels freeing rather than flat. The
            same shift may make highly palatable food less compelling, which is different from
            losing enjoyment across music, friendships, work and sex.
          </p>
          <p className="text-sm text-muted-foreground">
            When broad loss of pleasure does occur, other explanations matter: eating too little,
            dehydration, fatigue, rapid body changes, poor sleep, depression, anxiety, alcohol
            reduction or another medicine. Timing and symptom tracking are more useful than assuming
            a single dopamine mechanism.
          </p>
        </section>

        <Card className="space-y-2 border-l-4 border-l-warning p-5">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5 text-warning" /> Emotional changes deserve attention
          </div>
          <p className="text-sm text-muted-foreground">
            Persistent emotional numbness, severe anxiety, depression or major behavior changes
            should be discussed with the prescriber managing the medicine. Suicidal thoughts or an
            immediate safety concern require urgent local crisis or emergency support.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Can GLP-1 medicines change relationships?</h2>
          <p className="text-sm text-muted-foreground">
            There is no controlled evidence that semaglutide or tirzepatide directly weakens
            romantic attachment. Relationships can still change during major weight loss. Shared
            meals may feel different; alcohol use, confidence, libido, energy and social routines
            may shift; and one partner may adapt faster than the other. Those are real effects
            without proving that a medicine altered love circuitry.
          </p>
          <p className="text-sm text-muted-foreground">
            Treat dramatic social-media stories as hypotheses, not incidence data. People with no
            change rarely post about it, while multiple life changes often occur at the same time as
            treatment.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">A practical way to track changes</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Record the start date and each amount change rather than relying on memory.</li>
            <li>
              Track mood, motivation, sleep, energy, food intake, alcohol and libido separately.
            </li>
            <li>
              Note whether changes are limited to cravings or affect pleasure across daily life.
            </li>
            <li>Share the timeline with your prescriber before changing or stopping treatment.</li>
          </ul>
          <Link
            to="/library/$slug"
            params={{ slug: "semaglutide" }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            Read the semaglutide overview <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          {FAQS.map((item) => (
            <div key={item.q}>
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Sources and evidence limits</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Evidence on broad behavioral and relationship effects remains preliminary. This page was
            reviewed on July 31, 2026 and distinguishes controlled human findings from animal data
            and anecdotal reports.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {REFERENCES.map((reference) => (
              <li key={reference.url}>
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {reference.label}
                </a>
              </li>
            ))}
          </ol>
        </section>

        <AttributionFooter />
      </article>
    </main>
  );
}
