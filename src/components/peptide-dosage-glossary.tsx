import { BookOpen } from "lucide-react";

type Term = { term: string; def: string };

const TERMS: Term[] = [
  {
    term: "Reconstitution",
    def: "Dissolving a lyophilized (freeze-dried) peptide with bacteriostatic water to make an injectable solution.",
  },
  {
    term: "Bacteriostatic water (BAC water)",
    def: "Sterile water with 0.9% benzyl alcohol that inhibits bacterial growth, extending a mixed vial's usable life to ~28 days refrigerated.",
  },
  {
    term: "Concentration (mg/mL)",
    def: "Peptide milligrams divided by BAC water milliliters. Drives how many syringe units equal your target dose.",
  },
  {
    term: "U-100 insulin syringe",
    def: "Holds 100 units per 1 mL. 1 unit = 0.01 mL. The standard syringe for peptide and TRT subcutaneous dosing.",
  },
  {
    term: "U-40 insulin syringe",
    def: "Holds 40 units per 1 mL. 1 unit = 0.025 mL. Less common; using it in place of U-100 changes dose by ~60%.",
  },
  {
    term: "Subcutaneous (SC)",
    def: "Injection into the fatty layer under the skin (abdomen, flank, thigh) using a 29–31 gauge, 8 mm insulin needle.",
  },
  {
    term: "Intramuscular (IM)",
    def: "Injection into muscle tissue (glute, delt, quad) with a 23–25 gauge, 1 inch needle. Common for TRT esters.",
  },
  {
    term: "Half-life",
    def: "Time for blood levels to fall by half. Drives injection frequency — short half-life = more frequent shots.",
  },
  {
    term: "Ester",
    def: "Chemical tail attached to testosterone (cypionate, enanthate, propionate) that controls release speed and half-life.",
  },
  {
    term: "mcg vs mg",
    def: "1 mg = 1,000 mcg. Peptide doses are often written in mcg; always confirm units before drawing.",
  },
];

export function PeptideDosageGlossary({ className = "" }: { className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 ${className}`}
      aria-labelledby="peptide-dosage-glossary"
    >
      <h2
        id="peptide-dosage-glossary"
        className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"
      >
        <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
        Peptide dosage glossary
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Quick definitions for the terms used across peptide reconstitution, syringe unit conversion,
        and TRT dosing.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {TERMS.map((t) => (
          <div key={t.term} className="rounded-xl border border-border bg-background p-3">
            <dt className="text-sm font-semibold text-foreground">{t.term}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{t.def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export const PEPTIDE_DOSAGE_GLOSSARY_JSONLD = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Peptide dosage glossary",
  hasDefinedTerm: TERMS.map((t) => ({
    "@type": "DefinedTerm",
    name: t.term,
    description: t.def,
    inDefinedTermSet: "Peptide dosage glossary",
  })),
};
