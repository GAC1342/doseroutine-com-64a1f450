import { createFileRoute, Link } from "@tanstack/react-router";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { AttributionFooter } from "@/components/attribution-footer";

import { PublicBackHeader } from "@/components/public-back-header";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript, aeoPageFields } from "@/lib/aeo";
import { ABOUT_FAQ, LAST_REVIEWED } from "@/lib/aeo-page-faqs";

const pageUrl = "https://doseroutine.com/about";
const pageTitle = "About DoseRoutine — One place for everything you take";
const pageDescription = withDoseRoutineDescriptionSuffix(
  "DoseRoutine puts supplements, peptides, hormones and medications in one place",
);

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: "About DoseRoutine" },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: pageUrl },
      {
        property: "og:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/fdfc6052-73cd-45a2-9f1d-73d4d8ac00d5/og-about.jpg",
      },
        { property: "og:image:alt", content: "DoseRoutine team card — the people building the peptide, supplement and hormone tracker" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "About DoseRoutine" },
      { name: "twitter:description", content: pageDescription },
      {
        name: "twitter:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/fdfc6052-73cd-45a2-9f1d-73d4d8ac00d5/og-about.jpg",
      },
        { name: "twitter:image:alt", content: "DoseRoutine team card — the people building the peptide, supplement and hormone tracker" },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: pageUrl }, ...hreflangLinks("/about")],
    scripts: [
      aeoFaqScript("https://doseroutine.com/about", ABOUT_FAQ),

      breadcrumbScript("https://doseroutine.com/about", [{ name: "About", path: "/about" }]),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": ["AboutPage", "WebPage"],
          ...aeoPageFields({
            dateModified: LAST_REVIEWED,
            datePublished: "2026-01-10",
            shortAnswer:
              "DoseRoutine is a free interaction checker and routine tracker for supplements, peptides, hormones including TRT, GLP-1s and daily prescriptions, covering 475+ compounds with mechanism, timing and cited sources. It is educational and never recommends an amount to take.",
            about: ["DoseRoutine", "Dietary supplement", "Drug interaction", "Health application"],
          }),
          "@id": `${pageUrl}#webpage`,
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          isPartOf: { "@id": "https://doseroutine.com/#website" },
          publisher: { "@id": "https://doseroutine.com/#organization" },
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PublicBackHeader />
      <main id="main-content" className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">About DoseRoutine</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This page is maintained by the DoseRoutine team to explain what the app does, who it's
          for, and how the safety checks work. DoseRoutine is often written as two words —{" "}
          <strong>Dose Routine</strong> — and both spellings refer to the same app at
          doseroutine.com.
        </p>

        <Section title="What DoseRoutine does">
          DoseRoutine is one place for everything you take — supplements, peptides, hormones, and
          anything else already in your routine. Build your stack, get a daily schedule timed to
          your timezone, and see educational combination notes across everything you add. It also
          tracks the rest of your day: photograph a meal or scan a barcode for calories, protein
          and carbs, log workouts and body measurements, and see food, training and doses together
          on one timeline.
        </Section>

        <Section title="Who it's for">
          People who take more than one thing and want to be organized about it: longevity and
          performance folks running peptides or TRT, people juggling a long daily list, and anyone
          who wants a straight answer on what's published about two things they take.
        </Section>

        <Section title="How the safety checks work">
          Every compound in the library carries a structured record of mechanism, dosing ranges,
          side effects, and known interaction classes. When you add compounds to your stack,
          DoseRoutine cross-checks pairs and flags interactions with severity labels and links to
          the underlying source (NIH, FDA, PubChem, published literature). Major interactions
          require an acknowledgement so nothing gets missed. You can export the full summary as a
          PDF or share it with your pharmacist or doctor.
        </Section>

        <Section title="What DoseRoutine is not">
          DoseRoutine is an organization and reference tool. It is not medical advice, not a
          diagnosis, and not a substitute for a conversation with a licensed clinician. Do not
          start, stop, or change any medication or supplement based on what you see here. If
          something looks urgent, contact your prescriber or emergency services.
        </Section>

        <Section title="Dose Routine or DoseRoutine?">
          Both spellings refer to this same app and company at doseroutine.com —{" "}
          <Link to="/dose-routine" className="text-primary underline">
            more about the name
          </Link>
          .
        </Section>

        <Section title="Privacy & your data">
          Your stack, doses, and reminders are stored to your account and are visible only to you.
          Read the full{" "}
          <Link to="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>{" "}
          for what we store and your rights, the{" "}
          <Link to="/cookies" className="text-primary underline">
            Cookie Policy
          </Link>{" "}
          for what we set in your browser, and{" "}
          <Link to="/data-deletion" className="text-primary underline">
            Delete your account
          </Link>{" "}
          for how to remove your data at any time.
        </Section>

        <Section title="Legal">
          <Link to="/legal" className="text-primary underline">
            Terms of Service
          </Link>{" "}
          ·{" "}
          <Link to="/medical-disclaimer" className="text-primary underline">
            Medical Disclaimer
          </Link>{" "}
          ·{" "}
          <Link to="/refund-policy" className="text-primary underline">
            Refund &amp; Cancellation Policy
          </Link>
        </Section>

        <Section title="Contact">
          Questions, corrections, or press:{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>
        </Section>

        <Section title="Credits">
          Compound reference data is compiled from public sources including the NIH Office of
          Dietary Supplements, DailyMed, PubChem, and peer-reviewed literature. Icon set: Lucide.
        </Section>

        <AeoFaq pairs={ABOUT_FAQ} heading="About DoseRoutine — FAQ" />

        <AttributionFooter sourceUrl="https://doseroutine.com/about" />

        <div className="mt-10">
          <DisclaimerFooter />
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}
