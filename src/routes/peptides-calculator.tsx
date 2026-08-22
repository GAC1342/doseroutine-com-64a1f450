import { createFileRoute, Link } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";
import { Card } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";

export const PATH = "/peptides-calculator";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Peptide Calculator Guide: Reconstitution & Dose Units";
const DESC =
  "How peptide reconstitution math works: mg per mL, dose to insulin syringe units, and doses per vial — then run your numbers in the DoseRoutine calculator.";

export const FAQ = [
  {
    q: "How do you calculate a peptide dose?",
    a: "Divide the vial strength in mg by the diluent volume in mL to get the concentration. Divide your intended dose by that concentration, then multiply by 100 to get units on a U-100 insulin syringe. A 5 mg vial in 2 mL is 2.5 mg/mL, so a 250 mcg dose is 10 units.",
  },
  {
    q: "How many units is 250 mcg of a peptide?",
    a: "It depends entirely on the concentration. With a 5 mg vial reconstituted in 2 mL, 250 mcg is 10 units on a U-100 syringe. With the same vial in 1 mL, the same 250 mcg is only 5 units. The units figure is meaningless without the diluent volume.",
  },
  {
    q: "How much bacteriostatic water should I add?",
    a: "Choose a volume that puts your usual dose between roughly 10 and 30 units, which is the easiest range to read accurately. More diluent makes small doses easier to measure; less diluent means fewer injections' worth of volume but harder-to-read markings.",
  },
  {
    q: "Is 100 units the same as 1 mL?",
    a: "On a U-100 insulin syringe, yes: 100 units equals 1 mL, so each unit is 0.01 mL. This is a volume marking, not a dose of peptide, which is why the concentration has to be worked out first.",
  },
  {
    q: "How many doses are in a vial?",
    a: "Divide the total vial strength by your dose, keeping the units consistent. A 10 mg vial at 500 mcg per dose is 10,000 mcg ÷ 500 mcg, or 20 doses — assuming none is lost to dead space in the syringe or to expiry before you finish it.",
  },
  {
    q: "Does the calculator work for tirzepatide and semaglutide?",
    a: "The same reconstitution math applies to any lyophilized peptide sold in mg. Prescribed pens are pre-filled and dose-marked by the manufacturer, so you should follow the pen's markings and your prescriber's instructions rather than calculating anything.",
  },
];

const SECTIONS = [
  {
    heading: "The three numbers every peptide calculation needs",
    paragraphs: [
      "Vial strength in milligrams, diluent volume in milliliters, and intended dose. Everything else follows. Strength divided by volume gives concentration in mg per mL; dose divided by concentration gives volume in mL; volume multiplied by 100 gives units on a U-100 insulin syringe.",
      "Nearly every dosing error traces back to one of two things: mixing micrograms and milligrams in the same calculation, or reconstituting with a different volume than the one used for the math. Write the diluent volume on the vial the moment you add it.",
    ],
    steps: [
      "Concentration (mg/mL) = vial strength (mg) ÷ diluent (mL).",
      "Convert your dose to the same unit as the concentration — 250 mcg is 0.25 mg.",
      "Volume (mL) = dose (mg) ÷ concentration (mg/mL).",
      "Units on a U-100 syringe = volume (mL) × 100.",
      "Doses per vial = vial strength ÷ dose, in matching units.",
    ],
  },
  {
    heading: "Common reconstitution results at a glance",
    table: {
      caption: "U-100 insulin syringe units for a 250 mcg and 500 mcg dose.",
      head: ["Vial", "Bacteriostatic water", "Concentration", "250 mcg", "500 mcg"],
      rows: [
        ["5 mg", "1 mL", "5 mg/mL", "5 units", "10 units"],
        ["5 mg", "2 mL", "2.5 mg/mL", "10 units", "20 units"],
        ["5 mg", "3 mL", "1.67 mg/mL", "15 units", "30 units"],
        ["10 mg", "2 mL", "5 mg/mL", "5 units", "10 units"],
        ["10 mg", "5 mL", "2 mg/mL", "12.5 units", "25 units"],
      ],
    },
    paragraphs: [
      "Read down the row you actually used. Halving the water doubles the concentration and halves the units for the same dose — which is exactly how an accidental double dose happens.",
    ],
  },
  {
    heading: "Mistakes the calculator cannot catch",
    bullets: [
      "Using a U-40 or U-50 syringe while calculating for U-100. Check the barrel marking before you draw.",
      "Assuming the vendor's stated strength is correct. Without a batch certificate of analysis, the mg figure is unverified.",
      "Forgetting syringe dead space, which quietly costs you the last partial dose in a vial.",
      "Reconstituting with sterile rather than bacteriostatic water for a vial you will use over multiple days.",
      "Losing track of the reconstitution date, so the beyond-use date becomes a guess.",
      "Shaking the vial. Swirl gently; foaming denatures peptide at the air–liquid interface.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "US Food and Drug Administration. Insulin Syringes and Needles — dose accuracy and U-100 markings.",
    url: "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/information-regarding-insulin-storage-and-switching-between-products-emergency",
  },
  {
    cite: "Institute for Safe Medication Practices. ISMP List of Error-Prone Abbreviations, Symbols, and Dose Designations.",
    url: "https://www.ismp.org/recommendations/error-prone-abbreviations-list",
  },
  {
    cite: "US Pharmacopeia. General Chapter <797> Pharmaceutical Compounding — Sterile Preparations (beyond-use dating principles).",
    url: "https://www.usp.org/compounding/general-chapter-797",
  },
  {
    cite: "US Food and Drug Administration. Certain Bulk Drug Substances for Use in Compounding — Category 2 list.",
    url: "https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-nominated-use-compounding-under-section-503a-federal-food-drug-and-cosmetic-act",
  },
];

const TOOLS: { to: string; title: string; body: string; hash?: string }[] = [
  {
    to: "/peptide-calculator",
    hash: "calculator",
    title: "Peptide calculator",
    body: "The one interactive tool: mix the vial, convert any dose to U-100 or U-40 units, and see how long the vial lasts.",
  },
  {
    to: "/peptide-dosage-calculator",
    title: "Peptide dosage guide",
    body: "How mg, mcg and syringe units relate, with a worked table of common vial setups.",
  },
  {
    to: "/trt-dosage-calculator",
    title: "TRT dosage calculator",
    body: "Convert a weekly testosterone dose in mg to injection volume at your ester's concentration.",
  },
  {
    to: "/dosage-units-guide",
    title: "Dosage units guide",
    body: "mg, mcg, IU, mL and syringe units — what converts to what, and what never does.",
  },
  {
    to: "/calculators",
    title: "All calculators",
    body: "Every dosing and conversion tool on DoseRoutine in one place.",
  },
];

export const Route = createFileRoute("/peptides-calculator")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Peptides calculator",
      isPillar: true,
      faq: FAQ,
      toolUrl: "https://doseroutine.com/peptide-calculator",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="Peptides calculator"
      answer="To dose a reconstituted peptide, divide vial strength in mg by diluent volume in mL to get concentration, then divide your dose by that and multiply by 100 for units on a U-100 insulin syringe. A 5 mg vial in 2 mL gives 2.5 mg/mL, so 250 mcg is 10 units."
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Stop recalculating every injection",
        body: "Save each vial once — strength, diluent, reconstitution date — and DoseRoutine shows the syringe units for every scheduled dose, counts down what's left in the vial, and rotates your injection sites.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    >
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Run the numbers</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Card key={tool.to} className="p-4">
              <Link
                to={tool.to as "/calculators"}
                hash={tool.hash}
                onClick={() =>
                  trackEvent(
                    tool.to === "/peptide-calculator"
                      ? "guide_calculator_cta_click"
                      : "calculator_link_click",
                    {
                      guide: PATH,
                      destination: tool.to,
                      section: tool.hash ?? null,
                    },
                  )
                }
                className="font-semibold text-primary hover:underline"
              >
                {tool.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{tool.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </PeptideGuidePage>
  );
}
