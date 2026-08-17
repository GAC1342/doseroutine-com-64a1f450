import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { articleScript } from "@/lib/article-schema";

const pageUrl = "https://doseroutine.com/medical-disclaimer";
const pageTitle = "Medical Disclaimer — DoseRoutine";
const pageDescription =
  "DoseRoutine is an organization and reference tool, not medical advice. Read th… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/medical-disclaimer")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:url", content: pageUrl },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [{ rel: "canonical", href: pageUrl }],
    scripts: [
      breadcrumbScript("https://doseroutine.com/medical-disclaimer", [
        { name: "Legal", path: "/legal" },
        { name: "Medical Disclaimer", path: "/medical-disclaimer" },
      ]),
      articleScript({
        url: pageUrl,
        headline: "DoseRoutine Medical Disclaimer",
        description: pageDescription,
        datePublished: "2026-07-22",
        dateModified: "2026-07-22",
        section: "Legal",
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
          dateModified: "2026-07-22",
        }),
      },
    ],
  }),
  component: MedicalDisclaimerPage,
});

function MedicalDisclaimerPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Medical Disclaimer</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: July 2026 · Maintained by the DoseRoutine team.
        </p>

        <Section title="Not medical advice">
          DoseRoutine is an organization and reference tool. Nothing shown in the app — including
          compound descriptions, dosing ranges, interaction warnings, schedules, and AI-generated
          plan suggestions — is medical advice, a diagnosis, a prescription, or a treatment
          recommendation. Content is for informational and educational purposes only.
        </Section>

        <Section title="No doctor–patient relationship">
          Using DoseRoutine does not create a doctor–patient, pharmacist–patient, or any other
          clinical relationship with DoseRoutine, its team, or any contributor.
        </Section>

        <Section title="Talk to a licensed clinician">
          Do not start, stop, or change any supplement, peptide, hormone, or prescription medication
          based on what you see in DoseRoutine. Always talk with a licensed physician, pharmacist,
          or qualified healthcare provider who knows your full medical history before making changes
          to what you take.
        </Section>

        <Section title="Interaction warnings are not exhaustive">
          Interaction data is compiled from public sources (NIH, FDA, DailyMed, PubChem,
          peer-reviewed literature) and is best-effort. Absence of a warning does not mean a
          combination is safe. Every person metabolizes compounds differently and clinical context
          matters.
        </Section>

        <Section title="Emergencies">
          DoseRoutine is not for emergencies. If you think you're having a medical emergency,
          overdose, or serious adverse reaction, call your local emergency number immediately (911
          in the US, 999 in the UK, 112 in the EU) or go to the nearest emergency room.
        </Section>

        <Section title="Poison control (US)">
          For suspected poisoning or overdose in the United States, call Poison Control at
          1-800-222-1222.
        </Section>

        <Section title="Prescription medications">
          DoseRoutine can list prescription medications for interaction cross-checking. Listing a
          prescription does not authorize its use, dosage, or acquisition. Prescription medications
          must be prescribed and monitored by a licensed clinician.
        </Section>

        <Section title="Peptides & research compounds">
          Some compounds in the library are classified as research-use-only in some jurisdictions.
          Legality and clinical use vary by country. You are responsible for following the laws in
          your jurisdiction.
        </Section>

        <Section title="Age">DoseRoutine is intended for adults 18 and over.</Section>

        <Section title="No warranty">
          DoseRoutine is provided "as is" without warranty of any kind. To the maximum extent
          permitted by law, DoseRoutine and its team disclaim all liability for any decisions made
          or actions taken based on information in the app.
        </Section>

        <Section title="Contact">
          Questions:{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>
        </Section>

        <p className="mt-10 text-xs text-muted-foreground">
          See also the{" "}
          <Link to="/legal" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline">
            Privacy Policy
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
