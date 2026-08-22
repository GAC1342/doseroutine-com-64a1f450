import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/how-to-reconstitute-peptides";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "How to Reconstitute Peptides: Step-by-Step With Examples";
const DESC =
  "Step-by-step peptide reconstitution: diluent volume, mixing without shaking, mg vs mcg conversions, syringe units, dead space and storage.";

export const FAQ = [
  {
    q: "How do you reconstitute a peptide?",
    a: "Bring both vials to room temperature, swab each stopper with alcohol, draw your chosen volume of bacteriostatic water, inject it slowly down the inside wall of the peptide vial rather than onto the powder, then swirl gently or leave it to dissolve. Never shake. When the solution is completely clear, label the vial with the concentration and date and refrigerate it.",
  },
  {
    q: "How much water do I mix with a 5 mg peptide vial?",
    a: "Any volume between about 1 and 3 mL is workable — it changes the concentration, not the total amount of peptide. 2 mL is the most common choice for a 5 mg vial because it gives 2.5 mg/mL, which puts a 250 mcg dose at 10 units on a U-100 insulin syringe: large enough to measure accurately, small enough to inject comfortably.",
  },
  {
    q: "How do I convert mg to mcg for peptide dosing?",
    a: "One milligram equals 1,000 micrograms. A 5 mg vial contains 5,000 mcg. This conversion is where most dosing errors start, because supplier labels are in mg and protocols are usually written in mcg. Convert the vial to mcg first, then divide by the milliliters of water you added to get mcg per mL.",
  },
  {
    q: "What are units on an insulin syringe?",
    a: "On a U-100 insulin syringe, 100 units equals 1 mL, so 1 unit is 0.01 mL. Units are a volume marking, not a dose of peptide. The same 10 units contains a different amount of peptide depending on how much water you added, which is why the concentration has to be written on the vial.",
  },
  {
    q: "Can I shake the vial to dissolve the peptide faster?",
    a: "No. Peptides are chains of amino acids held in a specific shape, and the shear force and air–liquid interface created by shaking can denature them and cause aggregation. Swirl the vial slowly between your fingers, or simply set it down for five to ten minutes. Most peptides dissolve on their own.",
  },
  {
    q: "What is syringe dead space and does it matter?",
    a: "Dead space is the small volume of liquid left in the needle hub after the plunger is fully depressed. On a fixed-needle insulin syringe it is only a few microliters and is negligible; on a detachable-needle syringe it can be 70 microliters or more, which is a meaningful fraction of a small peptide dose. Use fixed-needle insulin syringes for microgram-scale doses.",
  },
  {
    q: "How long does a reconstituted peptide last?",
    a: "Refrigerated at 2–8 °C and protected from light, most reconstituted peptides are used within two to four weeks, though this varies by compound and the supplier's stability data governs. The unmixed powder is far more stable than the solution, so only reconstitute what you will use.",
  },
  {
    q: "What if the solution is cloudy or has particles?",
    a: "Do not inject it. Cloudiness, color change, or visible floating particles after the powder has had time to dissolve indicate aggregation, contamination, or a degraded product. Discard the vial.",
  },
];

const SECTIONS = [
  {
    heading: "What reconstitution means and why it is needed",
    paragraphs: [
      "Peptides are shipped as a lyophilized powder — freeze-dried under vacuum — because water is what lets them degrade. In dry form a peptide can survive shipping and months of cold storage. In solution the clock starts.",
      "Reconstitution is simply adding a sterile liquid to that powder to make an injectable solution. The step is mechanically easy and conceptually where nearly all dosing errors happen, because the volume you choose silently defines every dose you draw afterwards.",
    ],
  },
  {
    heading: "What you need before you start",
    bullets: [
      "The lyophilized peptide vial, still sealed.",
      "Bacteriostatic water for injection — preserved, so the vial can be entered more than once.",
      "Alcohol swabs, one per stopper per entry.",
      "A syringe to draw the diluent (a 3 mL syringe is easiest for measuring milliliters).",
      "U-100 insulin syringes with fixed needles for dosing, to minimize dead space.",
      "A sharps container.",
      "A marker or label for the concentration and mixing date.",
    ],
  },
  {
    heading: "Step by step",
    steps: [
      "Wash your hands and work on a clean, dry surface with nothing else on it.",
      "Take both vials out of the fridge and let them reach room temperature. Cold vials collect condensation and dissolve more slowly.",
      "Flip off the plastic caps and swab both rubber stoppers with alcohol. Let them air dry — do not blow on them.",
      "Draw your chosen volume of bacteriostatic water into the syringe. If you have not chosen it yet, see the worked examples below.",
      "Insert the needle into the peptide vial at an angle so the tip touches the glass wall, not the powder.",
      "Depress the plunger slowly and let the water run down the wall. A vacuum in the vial will help pull it in; do not fight it.",
      "Withdraw the needle and dispose of the syringe in the sharps container.",
      "Swirl the vial gently or set it aside for five to ten minutes. Do not shake, invert vigorously, or agitate it.",
      "Hold the vial up to the light. It should be completely clear with no floating material. If not, wait longer; if it stays cloudy, discard it.",
      "Label the vial with the concentration in mg/mL and today's date, then refrigerate it.",
    ],
  },
  {
    heading: "Worked examples: mg, mcg and syringe units",
    paragraphs: [
      "Work in three steps every time. First convert the vial to micrograms. Second divide by the milliliters of water you added to get mcg per mL. Third divide your dose by that number and multiply by 100 to get units on a U-100 syringe.",
      "Example: a 10 mg vial is 10,000 mcg. Add 2 mL and you have 5,000 mcg/mL. A 500 mcg dose is 500 ÷ 5,000 = 0.1 mL, which is 10 units.",
    ],
    table: {
      caption: "Worked reconstitution examples. Units are on a U-100 insulin syringe.",
      head: ["Vial", "Water added", "Concentration", "Dose", "Draw"],
      rows: [
        ["5 mg (5,000 mcg)", "2 mL", "2,500 mcg/mL", "250 mcg", "10 units"],
        ["5 mg (5,000 mcg)", "2 mL", "2,500 mcg/mL", "500 mcg", "20 units"],
        ["5 mg (5,000 mcg)", "1 mL", "5,000 mcg/mL", "250 mcg", "5 units"],
        ["10 mg (10,000 mcg)", "2 mL", "5,000 mcg/mL", "500 mcg", "10 units"],
        ["10 mg (10,000 mcg)", "5 mL", "2,000 mcg/mL", "500 mcg", "25 units"],
        ["2 mg (2,000 mcg)", "2 mL", "1,000 mcg/mL", "100 mcg", "10 units"],
      ],
    },
  },
  {
    heading: "Choosing the diluent volume sensibly",
    paragraphs: [
      "More water is not weaker medicine. A 250 mcg dose is 250 mcg whether it arrives in 5 units or 25 units of liquid. What changes is how precisely you can measure it.",
      "Below roughly 5 units the syringe markings are too coarse: a half-unit misread is a ten percent dosing error. Above roughly 40 units you are injecting an uncomfortably large subcutaneous volume. Aim for 10 to 30 units and pick the diluent volume that lands you there.",
    ],
    bullets: [
      "Small doses (100–250 mcg): use more water so the draw is readable.",
      "Large doses (1 mg and up): use less water so the injection volume stays reasonable.",
      "Splitting a vial across many weeks: remember the solution has a shelf life; a larger dilution does not extend it.",
      "Changing your mind later is not possible — you cannot re-concentrate a mixed vial.",
    ],
  },
  {
    heading: "Dead space, and why the syringe type matters",
    paragraphs: [
      "Dead space is the liquid trapped in the needle hub after the plunger bottoms out. With a fixed-needle insulin syringe it is on the order of one to five microliters — irrelevant at these doses. With a detachable Luer-lock needle it can reach 70 microliters or more.",
      "On a 10-unit (100 microliter) draw, 70 microliters of dead space is not a rounding error; it is most of the dose left behind in the hub or, if you overdraw to compensate, injected inconsistently. For microgram dosing, use fixed-needle insulin syringes.",
    ],
  },
  {
    heading: "Storage after mixing",
    bullets: [
      "Refrigerate at 2–8 °C, upright, away from light and away from the freezer coil.",
      "Do not freeze a reconstituted vial unless the supplier's stability data explicitly allows it.",
      "Keep the mixing date on the label; two vials look identical at week one and week six.",
      "Swab the stopper before every single draw, not just the first.",
      "Discard the vial if the solution changes appearance, or if you are past the in-use window for that compound.",
      "Store the unmixed powder cold and only reconstitute what you will actually use.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "United States Pharmacopeia. General Chapter <797> Pharmaceutical Compounding — Sterile Preparations: aseptic technique and beyond-use dating.",
    url: "https://www.usp.org/compounding/general-chapter-797",
  },
  {
    cite: "U.S. Food and Drug Administration. Bacteriostatic Water for Injection, USP — prescribing information.",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/018637s030lbl.pdf",
  },
  {
    cite: "Centers for Disease Control and Prevention. Injection Safety: safe handling of vials and single-use devices.",
    url: "https://www.cdc.gov/injection-safety/hcp/clinical-safety/index.html",
  },
  {
    cite: "Wang W, Nema S, Teagarden D. Protein aggregation — pathways and influencing factors (shear and interfacial stress). Int J Pharm. 2010;390(2):89–99.",
    url: "https://pubmed.ncbi.nlm.nih.gov/20188160/",
  },
  {
    cite: "Strauss K, van Zundert A, Frid A, Costigliola V. Pandemic influenza preparedness: the critical role of the syringe — dead space and dose delivery.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16621178/",
  },
  {
    cite: "World Health Organization. WHO best practices for injections and related procedures toolkit.",
    url: "https://www.who.int/publications/i/item/9789241599252",
  },
];

export const Route = createFileRoute("/peptides/how-to-reconstitute-peptides")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "How to reconstitute peptides",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="How to reconstitute peptides, step by step"
      answer="Reconstituting a peptide means dissolving the freeze-dried powder in bacteriostatic water before injection. Swab both stoppers, run the water down the inside wall of the vial rather than onto the powder, swirl instead of shaking, and label the vial with the concentration. The volume of water you add sets the concentration — pick one that puts your dose between 10 and 30 units on a U-100 insulin syringe."
      callout={{
        title: "The arithmetic is the risky part, not the injection",
        body: "1 mg is 1,000 mcg, and syringe units are a volume, not a dose. Convert the vial to micrograms, divide by the milliliters you added, then work out the draw. This page is educational reference, not medical advice or a protocol.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Do the conversion once, then stop doing it",
        body: "DoseRoutine stores each vial's strength and diluent volume, shows every logged dose in both micrograms and syringe units, and tracks how much is left in the vial and how long ago you mixed it.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
