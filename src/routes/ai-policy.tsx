import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";

const pageUrl = "https://doseroutine.com/ai-policy";
const pageTitle = "AI Policy — DoseRoutine";
const pageDescription =
  "How DoseRoutine uses AI: what it does, what it doesn't do, what data is sent… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/ai-policy")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: pageUrl },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [{ rel: "canonical", href: pageUrl }],
    scripts: [
      breadcrumbScript("https://doseroutine.com/ai-policy", [
        { name: "AI Policy", path: "/ai-policy" },
      ]),
      articleScript({
        url: pageUrl,
        headline: "DoseRoutine AI Policy",
        description: pageDescription,
        datePublished: "2026-07-23",
        dateModified: "2026-07-23",
        section: "Policy",
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
          isPartOf: { "@id": "https://doseroutine.com/#website" },
          publisher: { "@id": "https://doseroutine.com/#organization" },
          dateModified: "2026-07-23",
        }),
      },
    ],
  }),
  component: AiPolicyPage,
});

function AiPolicyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main id="main-content" className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">AI Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: July 23, 2026 · Maintained by the DoseRoutine team.
        </p>

        <div className="mt-6 rounded-lg border border-amber-300/40 bg-amber-50/60 p-4 text-sm text-foreground/90 dark:bg-amber-950/20">
          <strong>Bottom line:</strong> AI output inside DoseRoutine is educational information, not
          medical advice. It can be incomplete or wrong. Always verify with a licensed clinician or
          pharmacist before acting on it.
        </div>

        <Section id="what-ai-does" title="Where DoseRoutine uses AI">
          <p>DoseRoutine uses AI in three places:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Library content.</strong> Compound overview pages (benefits, timing notes,
              common stacks, interactions summary) are drafted by AI and periodically reviewed by
              our team.
            </li>
            <li>
              <strong>Plan generator.</strong> When you tap "Generate plan" or "Regenerate plan," AI
              proposes a schedule based on the compounds and doses you entered.
            </li>
            <li>
              <strong>AI chat.</strong> The in-app assistant answers questions about supplements,
              peptides, hormones, timing, and general longevity topics.
            </li>
          </ul>
        </Section>

        <Section id="models" title="Which AI we use">
          <p>
            We use large language models from Google (Gemini family) accessed through a managed AI
            gateway. The specific model may change as newer versions ship. We don't train our own
            models on your data.
          </p>
        </Section>

        <Section id="not-medical-advice" title="This is not medical advice">
          <p>
            AI output in DoseRoutine — library articles, plan suggestions, chat responses,
            interaction warnings — is <strong>educational information only</strong>. It is not a
            diagnosis, prescription, or treatment plan, and no licensed clinician reviews each
            individual response before you see it.
          </p>
          <p>
            AI can hallucinate. It can miss a real interaction. It can recommend a dose that's wrong
            for your body, your genetics, or the medications you're on. It doesn't know your full
            medical history. <strong>A missing warning is not proof of safety.</strong>
          </p>
          <p>
            Always confirm anything DoseRoutine tells you with a licensed clinician or pharmacist
            before starting, stopping, or changing a compound — especially if you are pregnant,
            breastfeeding, under 18, have a medical condition, or take prescription drugs.
          </p>
        </Section>

        <Section id="data" title="What data is sent to AI providers">
          <p>
            <strong>Plan generator:</strong> the list of compounds and doses in your stack, plus any
            goals you selected. We do not send your name, email, medical history, or account
            identifiers.
          </p>
          <p>
            <strong>AI chat:</strong> the text of your messages in that conversation. Don't paste
            personal identifiers, government IDs, or full medical records into chat.
          </p>
          <p>
            <strong>Library:</strong> AI is used to draft library content in batch — no user data is
            sent when a visitor reads a library page.
          </p>
          <p>
            We do not knowingly permit our AI providers to train their models on your prompts or
            responses, and we do not sell your data. Because AI providers evolve their terms
            independently, we can't offer an absolute guarantee — treat AI chat as you would any
            online service and avoid pasting information you wouldn't share elsewhere.
          </p>
        </Section>

        <Section id="your-responsibilities" title="Your responsibilities">
          <ul className="list-disc space-y-2 pl-5">
            <li>Verify AI suggestions with a licensed clinician before acting.</li>
            <li>
              Enter accurate information about your own regimen — bad inputs produce bad
              suggestions.
            </li>
            <li>Don't rely on the app alone for emergencies. Call your local emergency number.</li>
            <li>
              Don't share your account or use it on behalf of someone else without their consent.
            </li>
          </ul>
        </Section>

        <Section id="opt-out" title="Opting out of AI features">
          <p>
            Core tracking, reminders, schedules, and check-ins work without AI. You can simply not
            use the Plan Generator or AI Chat. The library will still show AI-drafted content marked
            as such — treat it the same way you'd treat any online health article.
          </p>
        </Section>

        <Section id="mistakes" title="Reporting mistakes or bad output">
          <p>
            If you spot a wrong interaction, a hallucinated citation, or unsafe advice from any AI
            feature, please tell us so we can correct it:{" "}
            <span className="font-medium">support@doseroutine.com</span>. Include the page or
            feature and, if possible, a screenshot.
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            We'll update this page when we add new AI features, switch providers, or change how data
            flows. The "Last updated" date at the top always reflects the most recent revision.
          </p>
        </Section>

        <Section id="related" title="Related">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <Link to="/legal" className="underline">
                Terms, privacy &amp; disclaimer
              </Link>
            </li>
            <li>
              <Link to="/medical-disclaimer" className="underline">
                Full medical disclaimer
              </Link>
            </li>
            <li>
              <Link to="/refund-policy" className="underline">
                Refund &amp; cancellation policy
              </Link>
            </li>
          </ul>
        </Section>
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
