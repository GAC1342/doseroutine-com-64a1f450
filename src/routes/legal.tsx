import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalLinks } from "@/lib/hreflang";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { LEGAL_FAQ } from "@/lib/aeo-faqs-legal";

const pageUrl = "https://doseroutine.com/legal";
const pageTitle = "Legal — Terms, Privacy and Medical Disclaimer";
const pageDescription =
  "DoseRoutine terms of use, privacy policy, and medical disclaimer. Educational… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: pageUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [...canonicalLinks(pageUrl)],
    scripts: [
      aeoFaqScript(pageUrl, LEGAL_FAQ),
      breadcrumbScript("https://doseroutine.com/legal", [{ name: "Legal", path: "/legal" }]),
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
          dateModified: "2026-07-22",
        }),
      },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main id="main-content" className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Legal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: July 2026 · This page is maintained by the DoseRoutine team.
        </p>

        <Section id="disclaimer" title="Medical disclaimer">
          <p>
            <strong>
              DoseRoutine is an educational tool, not a medical device and not medical advice.
            </strong>{" "}
            Nothing in the app diagnoses, treats, cures, or prevents any disease. Interaction
            warnings, plan suggestions, and adherence tracking are informational only.
          </p>
          <p>
            Always talk to a licensed clinician or pharmacist before starting, stopping, or changing
            any supplement, peptide, hormone, or medication — especially if you are pregnant,
            breastfeeding, under 18, have a medical condition, or take prescription drugs.
          </p>
          <p>
            DoseRoutine does not know your full medical history. A missing interaction warning does
            not mean a combination is safe. If in doubt, don't take it and consult a professional.
          </p>
        </Section>

        <Section id="terms" title="Terms of use">
          <p>
            By using DoseRoutine you confirm you are 18 or older and accept these terms. You agree
            to use the app for personal, non-commercial purposes and to enter accurate information
            about your own regimen.
          </p>
          <p>
            The service is provided "as is" without warranties of any kind. To the maximum extent
            permitted by law, DoseRoutine is not liable for any decision you make based on
            information shown in the app, including missed doses, interactions, or plan suggestions.
          </p>
          <p>
            New accounts start with a 7-day free trial of Pro. If you don't cancel before the trial
            ends, your subscription (monthly $9.99 or annual $59.99) begins automatically and renews
            until canceled. One trial per user. Accounts created before the trial-first model was
            introduced keep their existing free or paid access. Cancel anytime from More → Billing
            (or from your Apple/Google subscription settings if you subscribed on mobile); access
            continues until the end of the paid period. See our{" "}
            <Link to="/refund-policy" className="underline">
              Refund &amp; Cancellation Policy
            </Link>{" "}
            for details, including EU/UK statutory withdrawal rights.
          </p>
        </Section>

        <Section id="privacy" title="Privacy">
          <p>
            <strong>What we store.</strong> Your account (email), profile (age band, sex, height,
            weight, timezone, unit preference), the compounds and doses you add, your schedule,
            whether doses were taken, and your subscription status.
          </p>
          <p>
            <strong>How we use it.</strong> To run the app for you: schedule reminders, check
            interactions, show adherence, and generate plan suggestions. Reminder emails are sent
            only when you opt in.
          </p>
          <p>
            <strong>Who we share with.</strong> Infrastructure providers we use to run the service:
            our hosting and database provider, Stripe (payments), and our email delivery provider.
            We do not sell your data or share it with advertisers.
          </p>
          <p>
            <strong>AI processing.</strong> When you use the Plan Generator, your stack (compound
            names, doses, timing) is sent to our AI provider to produce a suggested schedule. We do
            not send your name, email, or medical history.
          </p>
          <p>
            <strong>Your rights.</strong> You can delete your account and all associated data at any
            time by emailing support. Data is stored in encrypted managed databases with row-level
            access controls so only your account can read your records.
          </p>
        </Section>

        <Section id="ai" title="AI & automated content">
          <p>
            DoseRoutine uses AI (Google Gemini via a managed AI gateway) to draft library articles,
            generate suggested plans, and power the in-app AI chat.{" "}
            <strong>AI output is educational information, not medical advice</strong>, and is not
            reviewed by a licensed clinician before you see it. It can be incomplete or wrong,
            including missing real interactions. Always confirm with a licensed clinician or
            pharmacist before acting on it.
          </p>
          <p>
            We do not knowingly permit AI providers to train their models on your prompts, and we do
            not sell your data. For the full breakdown of what data goes where, see our{" "}
            <Link to="/ai-policy" className="underline">
              AI Policy
            </Link>
            .
          </p>
        </Section>

        <Section id="contact" title="Contact">
          <p>
            Questions or data requests: <span className="font-medium">support@doseroutine.app</span>
          </p>
        </Section>
        <AeoFaq pairs={LEGAL_FAQ} />
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
