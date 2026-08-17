import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";

const pageUrl = "https://doseroutine.com/privacy";
const pageTitle = "Privacy Policy — DoseRoutine";
const pageDescription =
  "How DoseRoutine collects, uses, stores, and shares your data. Your stack, dose… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/privacy")({
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
      breadcrumbScript("https://doseroutine.com/privacy", [
        { name: "Legal", path: "/legal" },
        { name: "Privacy Policy", path: "/privacy" },
      ]),
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
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: July 2026 · Maintained by the DoseRoutine team.
        </p>

        <Section title="What we store">
          Your account (email), profile (age band, sex, height, weight, timezone, unit preference),
          the compounds and doses you add, your schedule, whether doses were taken, and your
          subscription status.
        </Section>

        <Section title="How we use it">
          To run the app for you: schedule reminders, check interactions, show adherence, and
          generate plan suggestions. Reminder emails and push notifications are sent only when you
          opt in.
        </Section>

        <Section title="Who we share with">
          Infrastructure providers we use to run the service: our hosting and database provider,
          Stripe (payments), and our email delivery provider. We do not sell your data and we do not
          share it with advertisers.
        </Section>

        <Section title="AI processing">
          When you use the Plan Generator, your stack (compound names, doses, timing) is sent to our
          AI provider to produce a suggested schedule. We do not send your name, email, or medical
          history.
        </Section>

        <Section title="Storage & security">
          Data is stored in encrypted managed databases with row-level access controls so only your
          account can read your records. Passwords are handled by our authentication provider and
          never stored by DoseRoutine directly.
        </Section>

        <Section title="Your rights">
          You can export or delete your account and all associated data at any time by emailing
          support. If you're in the EU/UK, you have the additional rights described under GDPR
          (access, rectification, erasure, portability, objection). If you're in California, you
          have the rights described under the CCPA/CPRA.
        </Section>

        <Section title="Cookies">
          We use only the cookies required to keep you signed in and to remember your language
          preference. We do not use third-party advertising or cross-site tracking cookies.
        </Section>

        <Section title="Children">
          DoseRoutine is intended for adults 18 and over. We do not knowingly collect data from
          minors.
        </Section>

        <Section title="Changes">
          If we make material changes to this policy we will update the date above and, where
          appropriate, notify you in the app.
        </Section>

        <Section title="Contact">
          Questions or data requests:{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>
        </Section>

        <p className="mt-10 text-xs text-muted-foreground">
          See also the{" "}
          <Link to="/legal" className="underline">
            Terms &amp; medical disclaimer
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
