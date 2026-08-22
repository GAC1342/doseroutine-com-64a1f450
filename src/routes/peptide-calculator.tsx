import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import { ReconCalculator } from "@/components/recon-calculator";

import { PublicBackHeader } from "@/components/public-back-header";
import { CalculatorScopeNote } from "@/components/calculator-scope-note";
import { SaveResultCta } from "@/components/save-result-cta";
import { RelatedLinks } from "@/components/related-links";
import { TrustSafety } from "@/components/trust-safety";
import { AttributionFooter } from "@/components/attribution-footer";
import { AnswerFirst, AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript, type AeoFaqPair } from "@/lib/aeo";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { LAST_REVIEWED } from "@/lib/aeo-page-faqs";
import { FEATURE_VISUAL_BY_ID, featureSocialMeta } from "@/lib/feature-visuals";
import type { CalcPreset } from "@/lib/compound-calculators";
import { PEPTIDE_CALCULATOR_ID } from "@/lib/peptide-guide-head";
import { trackEvent } from "@/lib/analytics";

export const PATH = "/peptide-calculator";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Peptide Calculator — Mixing, Dose & Vial Planner";
const DESC =
  "One peptide calculator for the whole vial: mix it, draw the right insulin units, and see how many days the vial lasts on your schedule. Free, no sign-up.";

export const FAQ: AeoFaqPair[] = [
  {
    q: "What does a peptide calculator actually calculate?",
    a: "Three things in sequence. Concentration is vial strength divided by the bacteriostatic water you add, in mg/mL. Draw volume is your dose divided by that concentration. Syringe units are the draw volume times 100 on a U-100 insulin syringe, or times 40 on a U-40. Everything else — doses per vial, days of supply — comes from those numbers.",
  },
  {
    q: "How long will one vial last me?",
    a: "Divide the vial strength by your per-injection dose to get the number of doses, then divide by how many injections you take per week to get weeks of supply. A 10 mg vial dosed at 500 mcg gives 20 doses, which is a little under three weeks at daily dosing or ten weeks at twice weekly — before you account for syringe dead space and the beyond-use date.",
  },
  {
    q: "How much bacteriostatic water should I add to a vial?",
    a: "Pick the volume that puts your usual dose between roughly 10 and 30 units on the syringe, because that band is the easiest to read without squinting. Adding more water does not weaken the peptide; it only spreads the same milligrams across more volume, which makes small doses easier to measure accurately.",
  },
  {
    q: "Does the number of units change if I add more water?",
    a: "Yes, and this is the single most common source of accidental double doses. Halving the water doubles the concentration, so the same milligram dose becomes half as many units. Write the diluent volume on the vial label the moment you reconstitute, and recalculate any time you mix a vial differently.",
  },
  {
    q: "Can I use this calculator for semaglutide or tirzepatide?",
    a: "The arithmetic is identical for any lyophilized peptide sold by weight in milligrams. It does not apply to prescription pens, which are pre-filled and dose-marked by the manufacturer — follow the pen's own markings and your prescriber's instructions rather than converting anything yourself.",
  },
  {
    q: "What if my result is more than 100 units?",
    a: "A draw above 100 units will not fit in one U-100 syringe, which usually means the vial was reconstituted with too much water for that dose. Mix the next vial with less diluent rather than taking two injections, and re-check that you have not mixed micrograms and milligrams in the same calculation.",
  },
  {
    q: "Do I need to track the results anywhere?",
    a: "You should record the mix date, diluent volume, and dose per injection somewhere you will see again, because the beyond-use date and the units figure both depend on them. Saving the result to a DoseRoutine protocol keeps the concentration attached to the vial and reminds you when the vial is near its end.",
  },
];

const PRESETS: CalcPreset[] = [
  { label: "BPC-157 5 mg", vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
  { label: "TB-500 5 mg", vialMg: 5, bacMl: 2, doseValue: 2, doseUnit: "mg" },
  { label: "Ipamorelin 5 mg", vialMg: 5, bacMl: 2, doseValue: 200, doseUnit: "mcg" },
  { label: "CJC-1295 2 mg", vialMg: 2, bacMl: 2, doseValue: 100, doseUnit: "mcg" },
  { label: "Semaglutide 5 mg", vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
  { label: "Tirzepatide 10 mg", vialMg: 10, bacMl: 2, doseValue: 2.5, doseUnit: "mg" },
];

export const Route = createFileRoute("/peptide-calculator")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      ...featureSocialMeta(FEATURE_VISUAL_BY_ID["reconstitution"]!),
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks(PATH)],
    scripts: [
      breadcrumbScript(CANONICAL, [
        { name: "Calculators", path: "/calculators" },
        { name: "Peptide Calculator", path: PATH },
      ]),
      aeoFaqScript(CANONICAL, FAQ),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "@id": PEPTIDE_CALCULATOR_ID,
          name: "DoseRoutine Peptide Calculator",
          applicationCategory: "HealthApplication",
          operatingSystem: "Web",
          url: CANONICAL,
          mainEntityOfPage: CANONICAL,
          datePublished: "2026-02-01",

          dateModified: LAST_REVIEWED,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: DESC,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
        }),
      },
    ],
  }),
  component: PeptideCalculatorPage,
});

function PeptideCalculatorPage() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  const calculatorRef = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(false);

  // Guides link here with #calculator. Scroll the tool into view, move focus
  // to it for keyboard and screen-reader users, and flash a ring so it is
  // obvious which part of the page answered the CTA.
  useEffect(() => {
    if (hash !== "calculator") return;
    const node = calculatorRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    node.focus({ preventScroll: true });
    setArrived(true);
    trackEvent("calculator_arrival_highlight", { calculator: "peptide" });
    const t = window.setTimeout(() => setArrived(false), 2400);
    return () => window.clearTimeout(t);
  }, [hash]);

  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader hideSignup backTo="/calculators" backLabel="All calculators" />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg font-semibold text-foreground"
          >
            <FlaskConical className="h-5 w-5 text-primary" />
            DoseRoutine
          </Link>
          <Link to="/library" className="text-sm text-muted-foreground hover:text-foreground">
            Library <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 pb-16 pt-8">
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Peptide Calculator
        </h1>
        <p className="dr-speakable-intro mt-3 text-base text-muted-foreground">
          Mix the vial, draw the dose, plan the refill. Enter the vial strength, the bacteriostatic
          water you are adding, and the dose you want, and this calculator returns the concentration
          in mg/mL, the exact units to draw on a U-100 or U-40 insulin syringe, and how many doses
          the vial holds.
        </p>

        <AnswerFirst question="The short answer">
          Concentration is vial milligrams divided by milliliters of bacteriostatic water. Divide
          your dose by that concentration to get the draw volume in mL, then multiply by 100 for
          units on a U-100 syringe. A 5 mg vial mixed in 2 mL is 2.5 mg/mL, so a 250 mcg dose is 10
          units.
        </AnswerFirst>

        <CalculatorScopeNote className="mt-5" />

        <div
          id="calculator"
          ref={calculatorRef}
          tabIndex={-1}
          aria-label="Peptide reconstitution calculator"
          className={`mt-6 scroll-mt-24 rounded-2xl outline-none transition-all duration-500 ${
            arrived ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "ring-0"
          }`}
        >
          {arrived ? (
            <p aria-live="polite" className="mb-2 text-sm font-medium text-primary">
              Here is the calculator — enter your vial and dose below.
            </p>
          ) : null}
          <ReconCalculator
            defaults={{ vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" }}
            presets={PRESETS}
          />
        </div>

        <div className="mt-8">
          <SaveResultCta
            tool="peptide-calculator"
            title="Save this mix to your protocol"
            body="Keep the concentration, dose, and mix date attached to the vial, and get reminded before you run out."
            action="Save to DoseRoutine"
            hasResult
          />
        </div>

        <section className="mt-10 border-t border-border/60 pt-8 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/90">
          <h2>How to read the result</h2>
          <p>
            The concentration line is the number that matters most, because it is the only one that
            changes when you mix a vial differently. Two people can inject the same 500 mcg dose and
            draw wildly different amounts on the syringe purely because one used 1 mL of
            bacteriostatic water and the other used 3 mL. Once you know the mg/mL figure, the
            syringe reading is fixed for as long as that vial lasts.
          </p>
          <p>
            The units figure assumes a U-100 insulin syringe unless you switch the toggle. On a
            U-100 barrel, 100 units is exactly 1 mL, so every unit is 0.01 mL. U-40 syringes are
            still sold for veterinary insulin and are marked differently; drawing a U-100 number on
            a U-40 barrel delivers roughly two and a half times the intended volume, so check the
            barrel before you draw anything.
          </p>
          <p>
            Doses per vial is a planning number rather than a promise. Syringe dead space quietly
            swallows a fraction of every draw, and a reconstituted vial has a beyond-use date
            measured in weeks, not months. Treat the figure as an upper bound and order the next
            vial before the last few doses.
          </p>

          <h2>Choosing your diluent volume</h2>
          <p>
            There is no single correct amount of bacteriostatic water. The peptide is the same
            regardless; the water only decides how easy the syringe is to read. Aim for a mix where
            your normal dose lands somewhere between 10 and 30 units. Below 10 units the markings
            are cramped and a small misread is a large percentage error; above 40 units you burn
            through volume quickly and may not fit larger doses in one draw.
          </p>
          <p>
            If you dose more than one amount out of the same vial — a titration schedule, for
            instance — pick the diluent volume that keeps your largest planned dose under 100 units
            and your smallest above 8. Run both ends through the calculator before you add any
            water, because you cannot undo a mix.
          </p>

          <h2>Recording the mix</h2>
          <p>
            Write the date and the diluent volume directly on the vial the moment you reconstitute
            it. Almost every dosing error we hear about starts with a vial that was mixed one way
            and calculated another way a week later. Storing the protocol in DoseRoutine keeps the
            concentration, the dose, and the schedule attached to each other, and the vial tracker
            counts down remaining doses as you log them.
          </p>
        </section>

        <div className="mt-10">
          <AeoFaq pairs={FAQ} />
        </div>

        <RelatedLinks
          currentPath="/peptide-calculator"
          heading="Related calculators and guides"
          limit={4}
        />

        <TrustSafety className="mt-10" />
        <div className="mt-8">
          <AttributionFooter />
        </div>
      </main>
    </div>
  );
}
