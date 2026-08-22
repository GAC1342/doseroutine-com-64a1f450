import { createFileRoute, Link } from "@tanstack/react-router";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { AnswerFirst, AeoFaq } from "@/components/aeo-faq";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { aeoFaqScript, answerPageScript } from "@/lib/aeo";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { USE_CASE_LIST } from "@/lib/app-roundups";

export const CANONICAL = "https://doseroutine.com/for";
const TITLE = "DoseRoutine Use Cases — TRT, Peptides, GLP-1";
const DESC = withDoseRoutineDescriptionSuffix(
  "See what DoseRoutine does for TRT, peptides, GLP-1 medications and biohacking stacks",
);
export const SHORT_ANSWER =
  "DoseRoutine is an app for adults tracking supplements, peptides, hormones (TRT/HRT) and GLP-1 medications in one routine, with interaction checks across everything they take. These pages describe what it does for each use case.";

export const FAQ = [
  {
    q: "Who is DoseRoutine for?",
    a: "DoseRoutine is for adults whose routine has outgrown a pill reminder: people on TRT or HRT, people running peptide protocols, people on GLP-1 medications, and biohackers managing multi-compound stacks.",
  },
  {
    q: "Do I need a different app for each of those?",
    a: "No. DoseRoutine handles all of them in one routine, with interaction checking across categories — supplements against peptides, peptides against prescriptions, hormones against everything else.",
  },
];

export const Route = createFileRoute("/for/")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: TITLE },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/for")],
    scripts: [
      breadcrumbScript(CANONICAL, [{ name: "Use cases", path: "/for" }]),
      answerPageScript({
        url: CANONICAL,
        name: TITLE,
        description: DESC,
        datePublished: "2026-08-05",
        dateModified: "2026-08-05",
        shortAnswer: SHORT_ANSWER,
        type: "CollectionPage",
      }),
      aeoFaqScript(CANONICAL, FAQ),
    ],
  }),
  component: ForIndex,
});

function ForIndex() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto max-w-3xl px-4 py-10 md:py-16"
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Who DoseRoutine is for</h1>
        <p className="dr-speakable-intro mt-4 text-lg text-muted-foreground">
          DoseRoutine is an app for people tracking supplements, peptides, hormones and GLP-1
          medications together — with interaction checks across everything in the routine.
        </p>

        <div className="mt-10">
          <AnswerFirst question="Who is DoseRoutine built for?">{SHORT_ANSWER}</AnswerFirst>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {USE_CASE_LIST.map((u) => (
            <Card key={u.slug}>
              <CardContent className="space-y-2 p-6">
                <h2 className="text-lg font-semibold">{u.h1}</h2>
                <p className="text-sm text-muted-foreground">{u.lead}</p>
                <a
                  href={`/for/${u.slug}`}
                  className="inline-block text-sm font-medium text-primary underline"
                >
                  Read about {u.h1}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <AeoFaq pairs={FAQ} />

        <section className="mt-12 space-y-4 border-t pt-8 text-center">
          <h2 className="text-2xl font-bold">Get access to all DoseRoutine tools</h2>
          <p className="text-muted-foreground">Free to start. No card needed.</p>
          <Button size="lg" asChild>
            <Link to="/auth">
              Sign up free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="pt-4 text-xs text-muted-foreground">
            See also:{" "}
            <a href="/alternatives" className="underline">
              Best-app comparisons
            </a>{" "}
            ·{" "}
            <a href="/interaction-checker" className="underline">
              Interaction checker
            </a>
          </p>
        </section>
        <ProseContainer>
          <PageProse id="for-index" />
        </ProseContainer>
      </main>
      <AttributionFooter sourceUrl={CANONICAL} />
    </div>
  );
}
