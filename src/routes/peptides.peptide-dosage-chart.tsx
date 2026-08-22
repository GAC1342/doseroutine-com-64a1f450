import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/peptide-dosage-chart";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Peptide Dosage Chart: How to Read One and Do the Math";
const DESC =
  "How to read a peptide dosage chart correctly: concentration, mcg vs mg, insulin syringe units, worked examples and the disclaimers every chart should carry.";

export const FAQ = [
  {
    q: "What is a peptide dosage chart?",
    a: "A peptide dosage chart is a lookup table that converts a vial strength and a diluent volume into the number of insulin-syringe units needed for a given dose. It is a unit-conversion aid, not a prescription. A chart cannot tell you what dose is appropriate for you — it only tells you how much liquid a chosen dose occupies.",
  },
  {
    q: "How do I read a peptide dosage chart?",
    a: "Find the row matching your vial strength in milligrams and the column matching the volume of bacteriostatic water you added. The cell gives the concentration. Divide your intended dose in micrograms by that concentration in mcg per mL, then multiply by 100 to get units on a U-100 insulin syringe.",
  },
  {
    q: "How many units is 250 mcg of peptide?",
    a: "It depends entirely on the concentration. If a 5 mg vial was reconstituted with 2 mL, the concentration is 2,500 mcg/mL and 250 mcg is 10 units. If the same vial was reconstituted with 1 mL, 250 mcg is 5 units. There is no universal answer, which is why every chart must state the diluent volume it assumes.",
  },
  {
    q: "Is 1 unit on an insulin syringe the same as 1 mcg?",
    a: "No, and confusing the two is the single most common peptide dosing error. On a U-100 syringe, 1 unit is 0.01 mL of liquid. The amount of peptide in that 0.01 mL depends on the concentration you mixed. Units measure volume; micrograms measure the peptide.",
  },
  {
    q: "Are peptide dosage charts accurate?",
    a: "The arithmetic in a well-built chart is accurate, provided the vial strength is what the label claims and the diluent volume was measured properly. Both assumptions fail routinely with unregulated research-chemical products, where the actual peptide content may differ from the label. A chart cannot correct for a mislabelled vial.",
  },
  {
    q: "What dose should I take?",
    a: "That question is outside what a chart can answer. Appropriate dosing depends on the specific compound, the indication, your clinical picture, and whether the compound is approved for human use at all. Most peptides sold online are unapproved and their doses come from animal studies rather than human trials. Discuss dosing with a licensed clinician.",
  },
  {
    q: "How do I convert mg to units?",
    a: "Convert milligrams to micrograms by multiplying by 1,000, divide by the milliliters of diluent to get mcg per mL, then divide your dose by that figure and multiply by 100. Example: a 10 mg vial in 2 mL is 5,000 mcg/mL, so a 1 mg (1,000 mcg) dose is 0.2 mL, which is 20 units.",
  },
];

const SECTIONS = [
  {
    heading: "What a dosage chart can and cannot tell you",
    paragraphs: [
      "A peptide dosage chart answers exactly one question: given a vial strength, a diluent volume and a target dose, how much liquid do I draw? That is a unit conversion. It is useful because the conversion has three steps and people get it wrong under kitchen-counter conditions.",
      "What a chart cannot tell you is which dose is right, whether a compound is safe for you, whether it is legal to possess where you live, or whether the vial contains what the label says. Charts circulate online with those questions quietly stripped out, which is how a conversion table gets mistaken for a protocol.",
    ],
    bullets: [
      "It converts: milligrams to micrograms, micrograms to milliliters, milliliters to syringe units.",
      "It assumes: the label strength is accurate and your diluent measurement was accurate.",
      "It does not establish: a therapeutic dose, a safe frequency, or a duration.",
      "It does not replace: a clinician, or the compound's own documentation.",
    ],
  },
  {
    heading: "The three numbers every chart depends on",
    paragraphs: [
      "Vial strength is printed on the label, in milligrams. Diluent volume is what you added, in milliliters — the one variable entirely under your control. Concentration is the result: milligrams divided by milliliters.",
      "Change the diluent volume and every number downstream changes. This is why copying a chart from a forum thread without checking which diluent volume it assumes produces dosing errors of two- and threefold.",
    ],
  },
  {
    heading: "Concentration reference table",
    table: {
      caption: "Concentration by vial strength and diluent volume, in mcg per mL.",
      head: ["Vial", "1 mL", "2 mL", "3 mL", "5 mL"],
      rows: [
        ["2 mg", "2,000 mcg/mL", "1,000 mcg/mL", "667 mcg/mL", "400 mcg/mL"],
        ["5 mg", "5,000 mcg/mL", "2,500 mcg/mL", "1,667 mcg/mL", "1,000 mcg/mL"],
        ["10 mg", "10,000 mcg/mL", "5,000 mcg/mL", "3,333 mcg/mL", "2,000 mcg/mL"],
        ["15 mg", "15,000 mcg/mL", "7,500 mcg/mL", "5,000 mcg/mL", "3,000 mcg/mL"],
        ["20 mg", "20,000 mcg/mL", "10,000 mcg/mL", "6,667 mcg/mL", "4,000 mcg/mL"],
      ],
    },
  },
  {
    heading: "Dose-to-units table for a common setup",
    paragraphs: [
      "The table below assumes one specific setup — a 5 mg vial reconstituted with 2 mL, giving 2,500 mcg/mL. If your vial or diluent volume differs, this table does not apply to you; use the concentration table above and do the division.",
    ],
    table: {
      caption: "5 mg vial in 2 mL of bacteriostatic water (2,500 mcg/mL), U-100 insulin syringe.",
      head: ["Dose", "Volume", "Units", "Doses per vial"],
      rows: [
        ["100 mcg", "0.04 mL", "4 units", "50"],
        ["200 mcg", "0.08 mL", "8 units", "25"],
        ["250 mcg", "0.10 mL", "10 units", "20"],
        ["500 mcg", "0.20 mL", "20 units", "10"],
        ["750 mcg", "0.30 mL", "30 units", "6.6"],
        ["1,000 mcg (1 mg)", "0.40 mL", "40 units", "5"],
      ],
    },
  },
  {
    heading: "Working it out yourself in three steps",
    steps: [
      "Convert the vial to micrograms: multiply the milligram strength by 1,000. A 5 mg vial is 5,000 mcg.",
      "Divide by the milliliters of diluent you added to get the concentration in mcg per mL. 5,000 mcg in 2 mL is 2,500 mcg/mL.",
      "Divide your dose by the concentration to get milliliters. 250 mcg ÷ 2,500 mcg/mL = 0.1 mL.",
      "Multiply milliliters by 100 to get units on a U-100 syringe. 0.1 mL × 100 = 10 units.",
      "Sanity-check the result: if it is under 5 units or over 40, you likely picked an awkward diluent volume, or mixed up mg and mcg somewhere.",
    ],
  },
  {
    heading: "Where charts go wrong",
    bullets: [
      "Assuming units equal micrograms. They do not; units are hundredths of a milliliter.",
      "Using a chart that does not state its diluent volume. The numbers are meaningless without it.",
      "Mixing up mg and mcg — a factor-of-1,000 error, and the most dangerous one on this list.",
      "Assuming a U-40 or 0.5 mL syringe reads the same as a U-100. Check the barrel markings.",
      "Trusting the label strength of an unregulated product. Independent testing repeatedly finds research-chemical vials off-label on content.",
      "Treating an animal-study dose scaled by bodyweight as a human dose. Interspecies scaling is not a simple multiplication.",
      "Ignoring dead space when using detachable-needle syringes at microgram doses.",
    ],
  },
  {
    heading: "The disclaimer that belongs on every chart",
    paragraphs: [
      "Most peptides discussed online are not approved for human use in the United States, the United Kingdom, the European Union or Australia. They are sold for laboratory research, and dosing figures circulating in communities are typically extrapolated from rodent studies rather than derived from human trials.",
      "That means a dosage chart is describing arithmetic, not endorsing a regimen. Units, intervals and cycle lengths that look authoritative in a table often have no controlled human evidence behind them. Anything you intend to inject should be discussed with a licensed clinician first.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "U.S. Food and Drug Administration. Certain bulk drug substances nominated for compounding: peptides not approved for human use.",
    url: "https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-nominated-use-compounding-under-section-503a-federal-food-drug-and-cosmetic-act",
  },
  {
    cite: "U.S. Food and Drug Administration. Bacteriostatic Water for Injection, USP — prescribing information.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/018637s030lbl.pdf",
  },
  {
    cite: "Nair AB, Jacob S. A simple practice guide for dose conversion between animals and human. J Basic Clin Pharm. 2016;7(2):27–31.",
    url: "https://pubmed.ncbi.nlm.nih.gov/27057123/",
  },
  {
    cite: "United States Pharmacopeia. General Chapter <797> Pharmaceutical Compounding — Sterile Preparations.",
    url: "https://www.usp.org/compounding/general-chapter-797",
  },
  {
    cite: "Institute for Safe Medication Practices. List of error-prone abbreviations, symbols and dose designations (mcg vs mg).",
    url: "https://www.ismp.org/recommendations/error-prone-abbreviations-list",
  },
  {
    cite: "World Health Organization. WHO best practices for injections and related procedures toolkit.",
    url: "https://www.who.int/publications/i/item/9789241599252",
  },
];

export const Route = createFileRoute("/peptides/peptide-dosage-chart")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Peptide dosage chart",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="Peptide dosage chart: how to read one without getting the math wrong"
      answer="A peptide dosage chart converts vial strength and diluent volume into syringe units. It is a unit-conversion tool, not a prescription. Find your vial strength and the milliliters of water you added to get the concentration in mcg/mL, then divide your dose by it and multiply by 100 for units on a U-100 insulin syringe."
      callout={{
        title: "Units are volume, not dose",
        body: "1 unit on a U-100 syringe is 0.01 mL of liquid — how much peptide that contains depends entirely on how you mixed the vial. Every chart on the internet is useless without the diluent volume it assumes. This page is educational reference, not medical advice.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "A chart built from your actual vial",
        body: "DoseRoutine builds the conversion from the vial strength and diluent volume you entered, so each logged dose shows the correct syringe units for your mix instead of someone else's, and flags a dose that falls outside a measurable range.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
