import { cn } from "@/lib/utils";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { createFileRoute } from "@tanstack/react-router";
import { PublicBackHeader } from "@/components/public-back-header";

import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import step1 from "@/assets/install/step1-share.jpeg";
import step2 from "@/assets/install/step2-menu.png";
import step3 from "@/assets/install/step3-add-home.png";
import step4 from "@/assets/install/step4-installed.jpeg";
// WebP variants at 1x (375px CSS) and 2x (750px) — roughly a quarter of the
// bytes of the original screenshots on every modern browser.
import step1w375 from "@/assets/install/step1-share-375.webp";
import step1w750 from "@/assets/install/step1-share-750.webp";
import step2w375 from "@/assets/install/step2-menu-375.webp";
import step2w750 from "@/assets/install/step2-menu-750.webp";
import step3w375 from "@/assets/install/step3-add-home-375.webp";
import step3w750 from "@/assets/install/step3-add-home-750.webp";
import step4w375 from "@/assets/install/step4-installed-375.webp";
import step4w750 from "@/assets/install/step4-installed-750.webp";
import { ResponsiveImage } from "@/components/responsive-image";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { Card, cardClassName } from "@/components/ui/card";
import { mergeLdScripts } from "@/lib/head-budget";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { INSTALL_FAQ } from "@/lib/aeo-faqs-info";

const pageUrl = "https://doseroutine.com/install";
const pageTitle = "Install DoseRoutine on your Home Screen";
const pageDescription =
  "Step-by-step: add DoseRoutine to your iPhone or Android home screen so it open… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "article" },
      { property: "og:url", content: pageUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: pageUrl }, ...hreflangLinks("/install")],
    scripts: mergeLdScripts([
      aeoFaqScript(pageUrl, INSTALL_FAQ),
      breadcrumbScript("https://doseroutine.com/install", [{ name: "Install", path: "/install" }]),
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: pageTitle,
          description: pageDescription,
          totalTime: "PT20S",
          estimatedCost: { "@type": "MonetaryAmount", value: "0", currency: "USD" },
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Open the Safari menu",
              text: "In Safari, tap the ••• (more) button on the bottom bar while you're on doseroutine.com.",
              url: `${pageUrl}#step-1`,
            },
            {
              "@type": "HowToStep",
              position: 2,
              name: "Tap Share",
              text: "In the menu that appears, tap the Share icon at the top.",
              url: `${pageUrl}#step-2`,
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Add to Home Screen",
              text: "Scroll down in the share sheet and tap Add to Home Screen. Confirm the name DoseRoutine and tap Add.",
              url: `${pageUrl}#step-3`,
            },
            {
              "@type": "HowToStep",
              position: 4,
              name: "Done — DoseRoutine is installed",
              text: "You'll now see the DoseRoutine icon on your home screen. Tap it to launch — it opens full-screen, just like a native app.",
              url: `${pageUrl}#step-4`,
            },
          ],
        }),
      },
    ]),
  }),
  component: InstallPage,
});

type Step = {
  n: number;
  title: string;
  body: string;
  img: string;
  webp: [string, string];
  alt: string;
  // Arrow overlay as % of image box
  arrow?: { top: string; left: string; rotate?: number; label?: string };
};

const STEPS: Step[] = [
  {
    n: 1,
    title: "Open the Safari menu",
    body: "In Safari, tap the ••• (more) button on the bottom bar while you're on doseroutine.com.",
    img: step1,
    webp: [step1w375, step1w750],
    alt: "Safari bottom bar showing the more button on doseroutine.com",
    arrow: { top: "62%", left: "86%", rotate: 25, label: "Tap here" },
  },
  {
    n: 2,
    title: "Tap Share",
    body: "In the menu that appears, tap the Share icon at the top.",
    img: step2,
    webp: [step2w375, step2w750],
    alt: "Safari action menu with the Share option highlighted",
    arrow: { top: "68%", left: "48%", rotate: -10, label: "Tap Share" },
  },
  {
    n: 3,
    title: "Add to Home Screen",
    body: "Scroll down in the share sheet and tap Add to Home Screen. Confirm the name DoseRoutine and tap Add.",
    img: step3,
    webp: [step3w375, step3w750],
    alt: "iOS share sheet with Add to Home Screen option",
    arrow: { top: "92%", left: "58%", rotate: -15, label: "Add to Home Screen" },
  },
  {
    n: 4,
    title: "Done — DoseRoutine is installed",
    body: "You'll now see the DoseRoutine icon on your home screen. Tap it to launch — it opens full-screen, just like a native app.",
    img: step4,
    webp: [step4w375, step4w750],
    alt: "Home screen showing the installed DoseRoutine app icon",
    arrow: { top: "76%", left: "38%", rotate: 20, label: "Tap to open" },
  },
];

function InstallPage() {
  useEffect(() => {
    trackEvent("install_page_view", {});
    const onInstalled = () => trackEvent("pwa_installed", { source: "install-page" });
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <div id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Install DoseRoutine on your Home Screen
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Takes about 20 seconds on iPhone. Once installed, DoseRoutine opens full-screen with its
          own icon — just like a native app.
        </p>

        <ol className="mt-10 space-y-12">
          {STEPS.map((step) => (
            <li key={step.n} className="scroll-mt-24">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {step.n}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{step.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </div>

              <Card className="relative mt-4 overflow-hidden rounded-2xl border-border">
                <ResponsiveImage
                  src={step.img}
                  webpSrcSet={`${step.webp[0]} 375w, ${step.webp[1]} 750w`}
                  // The screenshot column is capped at 420px on desktop, so never
                  // ask the browser for more than that plus a 2x allowance.
                  sizes="(min-width: 640px) 420px, 100vw"
                  alt={step.alt}
                  // Intrinsic size of the screenshots — lets the browser reserve
                  // the right box before decode so the page doesn't shift (CLS).
                  width={750}
                  height={1334}
                  loading={step.n === 1 ? "eager" : "lazy"}
                  fetchPriority={step.n === 1 ? "high" : "low"}
                />
                {step.arrow && (
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ top: step.arrow.top, left: step.arrow.left }}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ transform: `rotate(${step.arrow.rotate ?? 0}deg)` }}
                    >
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                        {step.arrow.label ?? `Step ${step.n}`}
                      </span>
                      <svg
                        width="56"
                        height="56"
                        viewBox="0 0 56 56"
                        fill="none"
                        className="drop-shadow-lg"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 28 L44 28"
                          stroke="hsl(var(--primary))"
                          strokeWidth="5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M30 14 L46 28 L30 42"
                          stroke="hsl(var(--primary))"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ol>

        <section className={cn(cardClassName, "mt-14 rounded-2xl p-5")}>
          <h2 className="text-base font-semibold text-foreground">On Android (Chrome)</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Open doseroutine.com in Chrome.</li>
            <li>Tap the ⋮ menu in the top right.</li>
            <li>
              Tap <span className="font-medium text-foreground">Add to Home screen</span> (or{" "}
              <span className="font-medium text-foreground">Install app</span>).
            </li>
            <li>Confirm — the DoseRoutine icon appears on your home screen.</li>
          </ol>
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Trouble installing? Email{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>
          .
        </p>

        <AeoFaq pairs={INSTALL_FAQ} />

        <ProseContainer>
          <PageProse id="install" />
        </ProseContainer>
      </div>
    </div>
  );
}
