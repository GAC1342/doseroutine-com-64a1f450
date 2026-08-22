import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalLinks } from "@/lib/hreflang";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { ArrowLeft } from "lucide-react";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { COOKIES_FAQ } from "@/lib/aeo-faqs-legal";

const pageUrl = "https://doseroutine.com/cookies";
const pageTitle = "Cookie Policy — How DoseRoutine Uses Cookies";
const pageDescription =
  "Which cookies and similar technologies DoseRoutine uses, why we use them, and… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/cookies")({
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
      aeoFaqScript(pageUrl, COOKIES_FAQ),
      breadcrumbScript("https://doseroutine.com/cookies", [
        { name: "Legal", path: "/legal" },
        { name: "Cookies", path: "/cookies" },
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
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main id="main-content" className="mx-auto max-w-2xl px-4 pb-24 pt-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Cookie Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: July 2026 · Maintained by the DoseRoutine team.
        </p>

        <Section title="Summary">
          DoseRoutine uses a small number of strictly-necessary cookies and browser storage items to
          keep you signed in and remember your preferences. We do not use third-party advertising
          cookies and we do not sell your data.
        </Section>

        <Section title="Strictly necessary (always on)">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Auth session</strong> — keeps you signed in. Set by our authentication
              provider. Expires when you sign out.
            </li>
            <li>
              <strong>CSRF / security tokens</strong> — protect forms and API calls from cross-site
              attacks.
            </li>
            <li>
              <strong>Stripe checkout</strong> — set by Stripe on the checkout page to process
              payments and prevent fraud (only present when you open checkout).
            </li>
          </ul>
        </Section>

        <Section title="Preferences (functional)">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Language</strong> — remembers your chosen language (12 supported).
            </li>
            <li>
              <strong>Units</strong> — metric vs imperial.
            </li>
            <li>
              <strong>Interaction acknowledgements</strong> — remembers which major interactions
              you've reviewed so we don't nag you.
            </li>
            <li>
              <strong>Cookie banner state</strong> — remembers that you dismissed the banner.
            </li>
          </ul>
        </Section>

        <Section title="Analytics">
          We use privacy-respecting product analytics to count anonymous pageviews and conversions.
          No cross-site tracking, no advertising cookies, no fingerprinting. IP addresses are
          truncated before storage.
        </Section>

        <Section title="What we do not use">
          <ul className="list-disc space-y-1 pl-5">
            <li>Third-party advertising cookies</li>
            <li>Cross-site tracking pixels</li>
            <li>Data brokers or ad networks</li>
            <li>Social media "like" trackers</li>
          </ul>
        </Section>

        <Section title="Controlling cookies">
          You can clear cookies and browser storage at any time from your browser settings. Clearing
          the auth cookie will sign you out. Clearing preference storage will reset language, units,
          and acknowledgements to defaults. Signing out from <em>More → Account</em> ends the
          session on this device.
        </Section>

        <Section title="Do Not Track">
          DoseRoutine respects "Do Not Track" and "Global Privacy Control" signals for optional
          analytics. Strictly-necessary cookies remain in use because the app can't function without
          them.
        </Section>

        <Section title="Contact">
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
        <AeoFaq pairs={COOKIES_FAQ} />

        <ProseContainer>
          <PageProse id="cookies" />
        </ProseContainer>
      </main>
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
