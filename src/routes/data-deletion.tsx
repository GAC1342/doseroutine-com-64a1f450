import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";

const pageUrl = "https://doseroutine.com/data-deletion";
const pageTitle = "Delete Your Account & Data — DoseRoutine";
const pageDescription =
  "How to delete your DoseRoutine account and all associated data. Instructions f… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/data-deletion")({
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
      breadcrumbScript("https://doseroutine.com/data-deletion", [
        { name: "Legal", path: "/legal" },
        { name: "Data Deletion", path: "/data-deletion" },
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
  component: DataDeletionPage,
});

function DataDeletionPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Delete Your Account &amp; Data
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: July 2026 · Maintained by the DoseRoutine team.
        </p>

        <Section title="You can delete your account and data at any time">
          DoseRoutine gives you two ways to permanently delete your account and all data associated
          with it.
        </Section>

        <Section title="Option 1 — In-app (fastest)">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Sign in at{" "}
              <a href="https://doseroutine.com" className="text-primary underline">
                doseroutine.com
              </a>
            </li>
            <li>
              Open <strong>More → Account</strong>
            </li>
            <li>
              Tap <strong>Delete my account</strong>
            </li>
            <li>Confirm. Your account and all data are removed immediately.</li>
          </ol>
        </Section>

        <Section title="Option 2 — Email request">
          Send an email from the address on your account to{" "}
          <a
            href="mailto:support@doseroutine.com?subject=Delete%20my%20account"
            className="text-primary underline"
          >
            support@doseroutine.com
          </a>{" "}
          with the subject line "Delete my account". We process requests within{" "}
          <strong>7 days</strong> and reply to confirm when deletion is complete.
        </Section>

        <Section title="What gets deleted">
          <ul className="list-disc space-y-1 pl-5">
            <li>Your account (email, sign-in credentials)</li>
            <li>Profile (age band, sex, height, weight, timezone, unit preference, language)</li>
            <li>Your stack (compounds, doses, schedules)</li>
            <li>Dose history, adherence records, and reminder settings</li>
            <li>Push notification subscriptions and device tokens</li>
            <li>Interaction acknowledgements and preferences</li>
            <li>AI-generated plans and shared links tied to your account</li>
          </ul>
        </Section>

        <Section title="What we keep (and why)">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Billing records:</strong> Stripe invoices and payment history are retained for
              the period required by tax and accounting law in the applicable jurisdiction
              (typically 7 years in the US, 10 years in parts of the EU). These records contain your
              email at the time of purchase and the amount charged — nothing about your stack or
              health.
            </li>
            <li>
              <strong>Anonymized aggregate stats:</strong> counts like "how many users added vitamin
              D this week" that cannot be traced back to you.
            </li>
            <li>
              <strong>Legal / abuse records:</strong> if there's an active fraud, abuse, or legal
              matter tied to your account, we may retain the minimum required to resolve it, then
              delete.
            </li>
          </ul>
        </Section>

        <Section title="Third-party providers">
          When you delete your account we also request deletion from:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Our authentication provider (sign-in records)</li>
            <li>Our email delivery provider (reminder / notification history)</li>
            <li>Stripe (customer profile — subject to legal retention above)</li>
          </ul>
        </Section>

        <Section title="Timing">
          In-app deletion is immediate. Email requests are processed within 7 days. Backups are
          rotated on a rolling 30-day schedule, after which deleted data is fully gone from backup
          snapshots.
        </Section>

        <Section title="Export first (optional)">
          Before you delete, you can email support to request a copy of your data (JSON) — we send
          it within 7 days.
        </Section>

        <Section title="Questions">
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>
        </Section>

        <p className="mt-10 text-xs text-muted-foreground">
          See also the{" "}
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
