import { cn } from "@/lib/utils";
import { cardClassName } from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { ArrowRight, FlaskConical, Syringe, Info, AlertTriangle } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { SaveResultCta } from "@/components/save-result-cta";
import { TrustSafety } from "@/components/trust-safety";
import { FounderNotes } from "@/components/founder-notes";
import { AttributionFooter } from "@/components/attribution-footer";
import { CalculatorScopeNote } from "@/components/calculator-scope-note";
import { LAST_REVIEWED } from "@/lib/aeo-page-faqs";

const CANONICAL = "https://doseroutine.com/reconstitution-calculator";

export const Route = createFileRoute("/reconstitution-calculator")({
  head: () => ({
    meta: [
      { name: "author", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
      { name: "publisher", content: "DoseRoutine" },
      { title: "Reconstitution Calculator — Peptide mg/mL & Syringe Units" },
      {
        name: "description",
        content:
          "Quick peptide reconstitution calculator. Enter vial mg and BAC water, get mg/mL and exact insulin units per dose in seconds. Free, no sign-up needed.",
      },
      {
        property: "og:title",
        content: "Reconstitution Calculator — Peptide mg/mL & Syringe Units",
      },
      {
        property: "og:description",
        content:
          "Get mg/mL and exact insulin syringe units for any peptide vial in seconds — works for BPC-157, TB-500, semaglutide and more. Free, no sign-up.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Reconstitution Calculator — Peptide mg/mL & Syringe Units",
      },
      {
        name: "twitter:description",
        content:
          "Free peptide reconstitution and syringe unit calculator for BPC-157, TB-500, semaglutide and more. Get mg/mL and exact units instantly.",
      },

      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: CANONICAL }, ...hreflangLinks("/reconstitution-calculator")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/reconstitution-calculator", [
        { name: "Calculators", path: "/calculator" },
        { name: "Reconstitution Calculator", path: "/reconstitution-calculator" },
      ]),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          dateModified: LAST_REVIEWED,
          datePublished: "2026-01-15",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          name: "DoseRoutine Reconstitution Calculator",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
          url: CANONICAL,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "Free peptide reconstitution calculator for BAC water, mg/mL concentration and insulin syringe units.",
        }),
      },
    ],
  }),
  component: ReconstitutionCalculatorPage,
});

type DoseUnit = "mcg" | "mg";
type SyringeType = "U-100" | "U-40";

const PRESETS: Array<{
  label: string;
  vialMg: number;
  bacMl: number;
  doseValue: number;
  doseUnit: DoseUnit;
}> = [
  { label: "BPC-157 5mg", vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
  { label: "TB-500 5mg", vialMg: 5, bacMl: 2, doseValue: 2, doseUnit: "mg" },
  { label: "Semaglutide 5mg", vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
  { label: "Tirzepatide 10mg", vialMg: 10, bacMl: 2, doseValue: 2.5, doseUnit: "mg" },
  { label: "Ipamorelin 5mg", vialMg: 5, bacMl: 2, doseValue: 200, doseUnit: "mcg" },
  { label: "CJC-1295 2mg", vialMg: 2, bacMl: 2, doseValue: 100, doseUnit: "mcg" },
];

function ReconstitutionCalculatorPage() {
  const [vialMg, setVialMg] = useState<number>(5);
  const [bacMl, setBacMl] = useState<number>(2);
  const [doseValue, setDoseValue] = useState<number>(250);
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("mcg");
  const [syringe, setSyringe] = useState<SyringeType>("U-100");

  const result = useMemo(() => {
    if (!vialMg || !bacMl || !doseValue) return null;
    const doseMg = doseUnit === "mcg" ? doseValue / 1000 : doseValue;
    const mgPerMl = vialMg / bacMl;
    const mlPerDose = doseMg / mgPerMl;
    const unitsPerMl = syringe === "U-100" ? 100 : 40;
    const units = mlPerDose * unitsPerMl;
    const dosesPerVial = vialMg / doseMg;
    return {
      mgPerMl,
      mlPerDose,
      units,
      dosesPerVial,
      warn: units > unitsPerMl, // more than a full syringe
    };
  }, [vialMg, bacMl, doseValue, doseUnit, syringe]);

  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader hideSignup />
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
          Peptide Reconstitution Calculator
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Turn any peptide vial into an exact insulin-syringe draw. Enter the vial size, how much
          bacteriostatic water you're adding, and your target dose. We'll show mg/mL, the units to
          draw on a U-100 or U-40 syringe, and total doses per vial.
        </p>

        <CalculatorScopeNote className="mt-5" />

        {/* Presets */}
        <section className="mt-6" aria-labelledby="section-presets">
          <h2
            id="section-presets"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Common presets
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setVialMg(p.vialMg);
                  setBacMl(p.bacMl);
                  setDoseValue(p.doseValue);
                  setDoseUnit(p.doseUnit);
                }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/60 hover:text-primary"
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Inputs */}
        <section
          className={cn(cardClassName, "mt-6 rounded-2xl p-5")}
          aria-labelledby="section-inputs"
        >
          <h2 id="section-inputs" className="sr-only">
            Calculator inputs
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Vial size (mg)"
              value={vialMg}
              onChange={setVialMg}
              step={0.5}
              min={0.1}
              hint="Total peptide in the vial."
            />
            <Field
              label="BAC water added (mL)"
              value={bacMl}
              onChange={setBacMl}
              step={0.1}
              min={0.1}
              hint="Volume of bacteriostatic water you reconstitute with."
            />
            <div>
              <label htmlFor="recon-target-dose" className="text-sm font-medium text-foreground">
                Target dose
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="recon-target-dose"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={doseUnit === "mcg" ? 10 : 0.1}
                  value={Number.isFinite(doseValue) ? doseValue : ""}
                  onChange={(e) => setDoseValue(parseFloat(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none"
                />
                <div className="flex rounded-md border border-border bg-background p-0.5 text-xs">
                  {(["mcg", "mg"] as DoseUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDoseUnit(u)}
                      className={`rounded px-3 py-1.5 font-medium ${
                        doseUnit === u
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Per-injection dose you want to draw.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Syringe type</label>
              <div className="mt-1 flex rounded-md border border-border bg-background p-0.5 text-xs">
                {(["U-100", "U-40"] as SyringeType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSyringe(s)}
                    className={`flex-1 rounded px-3 py-1.5 font-medium ${
                      syringe === s
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                U-100 = 100 units per mL (standard). U-40 = 40 units per mL.
              </p>
            </div>
          </div>
        </section>

        {/* Result */}
        {result && (
          <section className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-primary">
              <Syringe className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Draw</span>
            </div>
            <div className="mt-2 font-display text-4xl font-semibold text-foreground">
              {result.units.toFixed(1)} <span className="text-xl text-muted-foreground">units</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              on a {syringe} insulin syringe ({result.mlPerDose.toFixed(3)} mL)
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Concentration" value={`${result.mgPerMl.toFixed(2)} mg/mL`} />
              <Stat
                label="Per dose"
                value={`${doseUnit === "mcg" ? doseValue.toFixed(0) : doseValue.toFixed(2)} ${doseUnit}`}
              />
              <Stat label="Doses / vial" value={`~${Math.floor(result.dosesPerVial)}`} />
            </div>

            {result.warn && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  This dose is larger than one full {syringe} syringe. Add more BAC water, choose a
                  higher-mg vial, or split into multiple draws.
                </span>
              </div>
            )}
          </section>
        )}

        <SaveResultCta
          tool="reconstitution_calculator"
          hasResult={Boolean(result)}
          title="Save this calculation"
          body="Keep this vial, concentration and syringe setup in your account — DoseRoutine tracks doses remaining, reminds you when to inject, and flags interactions with everything else you take."
          action="Save this calculation"
        />

        <TrustSafety variant="safety-only" id="recon-safety" className="mt-6" />

        <section
          className={cn(cardClassName, "mt-8 rounded-2xl p-5 text-sm text-muted-foreground")}
          aria-labelledby="section-how"
        >
          <h2
            id="section-how"
            className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Info className="h-4 w-4 text-primary" /> How it works
          </h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Concentration (mg/mL) = vial mg ÷ BAC water mL.</li>
            <li>Volume per dose (mL) = dose mg ÷ concentration.</li>
            <li>Syringe units = volume × 100 (U-100) or × 40 (U-40).</li>
          </ol>
          <p className="mt-3">
            Educational tool only — not medical advice. Always verify dosing with your prescriber
            and follow sterile technique. See our{" "}
            <Link to="/medical-disclaimer" className="text-primary underline">
              medical disclaimer
            </Link>
            .
          </p>
        </section>

        <section className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link
            to="/interaction-checker"
            className="inline-flex items-center gap-1 rounded-md border border-primary/60 bg-primary/5 px-3 py-2 font-medium text-primary hover:bg-primary/10"
          >
            Check interactions <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/library"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-medium text-foreground hover:border-primary/60"
          >
            Browse compound library <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
        <FounderNotes
          notes={[
            {
              title: "I stopped doing the math on my phone's calculator",
              body:
                "For the first few months I reconstituted vials with a note app and a calculator, and I twice mixed 2 mL into a vial I had planned at 1 mL. Typing the vial strength and bacteriostatic water volume into one screen — and seeing the units-on-the-syringe number instead of a milligram figure — is what actually stopped the errors for me.",
            },
            {
              title: "Insulin syringe units are the number that matters",
              body:
                "The mistake I kept making was converting to mL and then eyeballing the barrel. Now I read the result as syringe units only. On a 1 mL/100-unit syringe, a 10 mg vial in 2 mL gives 5 mg per mL, so a 250 mcg dose is 5 units — a mark I can actually see, instead of a sliver between two lines.",
            },
            {
              title: "Write the mix date on the vial, not in an app",
              body:
                "I log reconstitution in DoseRoutine, but I still write the date on the vial cap with a marker. When I have two vials of the same peptide in the fridge at different concentrations, the physical label is the thing that stops me grabbing the wrong one at 6am.",
            },
          ]}
        />
        <RelatedLinks currentPath="/reconstitution-calculator" kind="calculators" />
        <p className="text-xs text-muted-foreground">
          Reviewed by the DoseRoutine editorial team. Last reviewed{" "}
          <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>.
        </p>
        <AttributionFooter sourceUrl={CANONICAL} />
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
  min,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
  min: number;
  hint?: string;
}) {
  // Label/input must be programmatically associated (axe: label).
  const fieldId = useId();
  return (
    <div>
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={fieldId}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
