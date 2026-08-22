import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalLinks } from "@/lib/hreflang";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { REFUND_POLICY_FAQ } from "@/lib/aeo-faqs-legal";

const pageUrl = "https://doseroutine.com/refund-policy";
const pageTitle = "Refund & Cancellation Policy — DoseRoutine";
const pageDescription =
  "How DoseRoutine handles subscription cancellations, refunds, and billing quest… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:url", content: pageUrl },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [...canonicalLinks(pageUrl)],
    scripts: [
      aeoFaqScript(pageUrl, REFUND_POLICY_FAQ),
      breadcrumbScript("https://doseroutine.com/refund-policy", [
        { name: "Legal", path: "/legal" },
        { name: "Refund Policy", path: "/refund-policy" },
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
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: July 2026 · Maintained by the DoseRoutine team.
        </p>

        <Section title="7-day free trial">
          New accounts start with a 7-day free trial of DoseRoutine Pro. You can cancel any time
          during the trial and you will not be charged. If you don't cancel before the trial ends,
          your plan (monthly or annual) begins automatically at the price shown at sign-up.
        </Section>

        <Section title="Plans">
          Pro is billed either monthly ($9.99/month) or annually ($59.99/year). Annual works out to
          about $5.00/month. Prices are shown in USD; your card issuer converts to your local
          currency. One trial per user.
        </Section>

        <Section title="Grandfathered accounts">
          Accounts created before we moved to the trial-first model keep their existing free or paid
          access. If you were on the previous Plus or free tier, nothing changes for you unless you
          choose to upgrade.
        </Section>

        <Section title="Cancel anytime">
          Cancel from the app under <em>More → Billing</em>, or email support. When you cancel, your
          subscription stops renewing and you keep paid access until the end of the period you
          already paid for.
        </Section>

        <Section title="Monthly plans">
          Monthly Pro is billed month-to-month after the trial. If you cancel, you keep access until
          the end of the current billing month. We do not pro-rate refunds for partial months.
        </Section>

        <Section title="Annual plans">
          If you cancel an annual plan within <strong>14 days</strong> of the initial charge or an
          annual renewal, email{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>{" "}
          for a full refund. After 14 days, annual plans are non-refundable, but you keep access for
          the remainder of the year.
        </Section>

        <Section title="EU / UK consumers">
          If you're a consumer in the EU or UK, you have a statutory 14-day right of withdrawal from
          the date of purchase. Email support within 14 days and we'll refund the full amount to the
          original payment method. By starting to use paid features immediately after purchase you
          agree we may begin providing the service before the 14-day window ends — you keep your
          right to withdraw during that window.
        </Section>

        <Section title="App Store & Google Play purchases">
          If you subscribed through the iOS App Store or Google Play, Apple or Google — not
          DoseRoutine — processes the payment and handles refunds. Request a refund through Apple
          (reportaproblem.apple.com) or the Google Play refund flow. Cancel the subscription from
          your device's subscription settings.
        </Section>

        <Section title="Failed payments">
          If a renewal payment fails, Stripe retries automatically for a few days and emails you. If
          all retries fail, the subscription moves to canceled and paid features turn off.
        </Section>

        <Section title="Duplicate charges & billing errors">
          If you were charged twice, charged after canceling, or believe there's a billing error,
          email{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>{" "}
          with your receipt or the last four digits of the card. We refund confirmed duplicates and
          billing errors in full.
        </Section>

        <Section title="Chargebacks">
          Please contact us first if you have a billing concern. Filing a chargeback without
          contacting us may cause your account to be suspended while the dispute is investigated by
          your card issuer.
        </Section>

        <Section title="How refunds are issued">
          Approved refunds are issued to the original payment method through Stripe (web) or
          Apple/Google (mobile). Refunds usually appear in 5–10 business days depending on your card
          issuer.
        </Section>

        <Section title="Managing your subscription">
          Web: <em>More → Billing</em> to update your payment method, download invoices, or cancel.
          Mobile: manage the subscription from iOS Settings → Apple ID → Subscriptions, or the
          Google Play → Subscriptions screen.
        </Section>

        <Section title="Contact">
          Billing questions:{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>
        </Section>

        <Section title="Contact">
          Billing questions:{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>
        </Section>

        <p className="mt-10 text-xs text-muted-foreground">
          See also{" "}
          <Link to="/legal" className="underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
          , and{" "}
          <Link to="/medical-disclaimer" className="underline">
            Medical Disclaimer
          </Link>
          .
        </p>
        <AeoFaq pairs={REFUND_POLICY_FAQ} />
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
