import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/bacteriostatic-water";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Bacteriostatic Water: What It Is, How Much to Use, Storage";
const DESC =
  "Bacteriostatic water is sterile water with 0.9% benzyl alcohol so a vial can be entered repeatedly. How it differs from sterile water, and how long it lasts.";

export const FAQ = [
  {
    q: "What is bacteriostatic water?",
    a: "Bacteriostatic water for injection is sterile water containing 0.9 percent benzyl alcohol as a preservative. The benzyl alcohol suppresses the growth of bacteria that get introduced when the stopper is punctured, which is what allows a single vial to be entered more than once. It is used to dissolve, or reconstitute, powdered medicines and peptides before injection.",
  },
  {
    q: "What is the difference between bacteriostatic water and sterile water?",
    a: "Sterile water for injection contains no preservative. It is single-use: once the stopper is punctured, whatever is left should be discarded. Bacteriostatic water contains benzyl alcohol, so the same vial can be entered multiple times over roughly 28 days. For a peptide vial you will draw from repeatedly, bacteriostatic water is the correct diluent.",
  },
  {
    q: "How much bacteriostatic water do I add to a peptide vial?",
    a: "There is no fixed amount — the volume you add sets the concentration, and any volume between roughly 1 and 3 mL works for a typical 5 or 10 mg vial. Choose the volume that makes your intended dose land between 10 and 30 units on an insulin syringe. A 5 mg vial reconstituted with 2 mL gives 2.5 mg/mL, so a 250 mcg dose is 10 units on a U-100 syringe.",
  },
  {
    q: "How long does bacteriostatic water last once opened?",
    a: "The manufacturer labeling for bacteriostatic water for injection specifies discarding the vial 28 days after first entry. That clock is for the diluent vial itself. The reconstituted peptide has its own, usually shorter, in-use life that depends on the compound and on refrigeration.",
  },
  {
    q: "Can I use tap water, distilled water or saline instead?",
    a: "No to tap and distilled water — neither is sterile and both risk introducing bacteria and endotoxin directly into tissue. Bacteriostatic sodium chloride is used for some compounds, but the peptide's own labeling or supplier documentation determines the correct diluent; some peptides are unstable in saline.",
  },
  {
    q: "Who should not use bacteriostatic water?",
    a: "Benzyl alcohol is toxic to neonates and is contraindicated in newborns, where it has been linked to gasping syndrome. It should also be avoided in pregnancy unless a clinician specifically directs otherwise, and by anyone with a known benzyl alcohol sensitivity. Sterile water or saline is used instead in those cases.",
  },
  {
    q: "Do I need a prescription for bacteriostatic water?",
    a: "In the United States bacteriostatic water for injection is a prescription product, typically supplied alongside the medicine it reconstitutes. Availability differs by country. Buying it from an unregulated source defeats its purpose, since you cannot verify sterility or the preservative concentration.",
  },
];

const SECTIONS = [
  {
    heading: "What bacteriostatic water actually does",
    paragraphs: [
      "Peptides ship as a lyophilized, freeze-dried powder because that is the form in which they are stable at room temperature during transport. They cannot be injected in that state — the powder has to be dissolved in a liquid first, and that liquid is the diluent. Bacteriostatic water is the diluent used most often for multi-dose peptide vials.",
      "Its single distinguishing feature is 0.9 percent benzyl alcohol. Benzyl alcohol is bacteriostatic rather than bactericidal: it does not sterilise the vial, it prevents the small number of organisms introduced during a needle stick from multiplying to a dangerous level. That distinction matters because it explains why the 28-day limit exists and why aseptic technique still applies to every draw.",
    ],
  },
  {
    heading: "Bacteriostatic water vs the alternatives",
    table: {
      caption: "Diluents used for reconstituting injectable powders.",
      head: ["Diluent", "Preservative", "Multi-dose", "Typical use"],
      rows: [
        [
          "Bacteriostatic water for injection",
          "0.9% benzyl alcohol",
          "Yes — 28 days after first entry",
          "Multi-dose peptide and hormone vials",
        ],
        [
          "Sterile water for injection",
          "None",
          "No — single use",
          "Single-dose reconstitution; neonates",
        ],
        [
          "Bacteriostatic 0.9% sodium chloride",
          "0.9% benzyl alcohol",
          "Yes — 28 days",
          "Compounds specified to be mixed in saline",
        ],
        ["Sterile 0.9% sodium chloride", "None", "No — single use", "Single-dose saline dilution"],
        [
          "Tap, distilled or spring water",
          "None, not sterile",
          "Never",
          "Not for injection under any circumstances",
        ],
      ],
    },
    paragraphs: [
      "Check the compound's own documentation before substituting. A handful of peptides are specified for saline rather than water, and a few are supplied with a manufacturer-provided diluent that should be used as directed rather than replaced.",
    ],
  },
  {
    heading: "How much bacteriostatic water should you add?",
    paragraphs: [
      "This is the question people most often get wrong, usually because they expect a single correct answer. There is not one. The volume you add does not change how much peptide you have — it changes the concentration, and therefore how many syringe units a given dose occupies. More water means a bigger, easier-to-measure draw of the same dose. Less water means a smaller draw and a more concentrated solution.",
      "The practical target is a draw between 10 and 30 units on a U-100 insulin syringe. Under about 5 units the markings are too close together to read reliably; over a full barrel you cannot draw the dose in one go.",
    ],
    table: {
      caption: "Common vial and diluent combinations, with the resulting draw for one dose.",
      head: ["Vial", "BAC water", "Concentration", "250 mcg dose", "500 mcg dose"],
      rows: [
        ["5 mg", "1 mL", "5 mg/mL", "5 units", "10 units"],
        ["5 mg", "2 mL", "2.5 mg/mL", "10 units", "20 units"],
        ["5 mg", "3 mL", "1.67 mg/mL", "15 units", "30 units"],
        ["10 mg", "2 mL", "5 mg/mL", "5 units", "10 units"],
        ["10 mg", "3 mL", "3.33 mg/mL", "7.5 units", "15 units"],
        ["10 mg", "5 mL", "2 mg/mL", "12.5 units", "25 units"],
      ],
    },
  },
  {
    heading: "How to add it without ruining the vial",
    steps: [
      "Let the peptide vial come to room temperature before mixing — reconstituting a freezing-cold vial encourages condensation.",
      "Wipe both rubber stoppers with a fresh alcohol swab and let them air dry rather than fanning or blowing on them.",
      "Draw your chosen volume of bacteriostatic water into a syringe, keeping the needle from touching anything but the stopper.",
      "Angle the needle so the water runs down the inside wall of the peptide vial. Injecting a jet directly onto the powder shears the peptide and is the most common avoidable error.",
      "Let the vacuum pull the water in rather than forcing the plunger.",
      "Swirl gently, or leave the vial to stand for a few minutes. Never shake — agitation denatures peptides.",
      "Wait until the solution is completely clear before drawing a dose. Cloudiness or visible particles after several minutes means something is wrong; do not inject it.",
      "Write the concentration and the date you mixed it on the vial label.",
    ],
  },
  {
    heading: "Storage and how long it lasts",
    bullets: [
      "Unopened bacteriostatic water: store at controlled room temperature, use before the printed expiry.",
      "Opened bacteriostatic water vial: discard 28 days after first entry, per the manufacturer labeling, regardless of how much is left.",
      "Dry, unmixed peptide powder: refrigerate or freeze as the supplier specifies; it is the most stable form.",
      "Reconstituted peptide: refrigerate at 2–8 °C, keep out of light, and treat it as having a shorter life than the diluent itself.",
      "Never freeze a reconstituted vial unless the compound's documentation explicitly allows it — ice crystals damage the peptide.",
      "Discard immediately if the solution turns cloudy, changes color, or develops visible particles.",
      "Write the mixing date on the vial. Reconstituted solutions look identical on day 1 and day 40.",
    ],
    paragraphs: [
      "Beyond-use dating is not a guess about when a solution becomes dangerous; it is a conservative limit set by compounding standards for preparations mixed outside a controlled sterile environment. Anything mixed at a kitchen counter sits at the shorter end of that range.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "U.S. Food and Drug Administration. Bacteriostatic Water for Injection, USP — prescribing information (preservative content, 28-day in-use limit, neonatal contraindication).",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2019/018637s030lbl.pdf",
  },
  {
    cite: "U.S. Food and Drug Administration. Sterile Water for Injection, USP — prescribing information (single-dose, no preservative).",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/018632s033lbl.pdf",
  },
  {
    cite: "United States Pharmacopeia. General Chapter <797> Pharmaceutical Compounding — Sterile Preparations: beyond-use dating and aseptic technique.",
    url: "https://www.usp.org/compounding/general-chapter-797",
  },
  {
    cite: "Centers for Disease Control and Prevention. Injection Safety: one needle, one syringe, only one time — safe handling of multi-dose vials.",
    url: "https://www.cdc.gov/injection-safety/hcp/clinical-safety/index.html",
  },
  {
    cite: "American Academy of Pediatrics, Committee on Fetus and Newborn. Benzyl alcohol: toxicity in the newborn (gasping syndrome).",
    url: "https://pubmed.ncbi.nlm.nih.gov/6835859/",
  },
  {
    cite: "World Health Organization. WHO best practices for injections and related procedures toolkit.",
    url: "https://www.who.int/publications/i/item/9789241599252",
  },
];

export const Route = createFileRoute("/peptides/bacteriostatic-water")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Bacteriostatic water",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="Bacteriostatic water: what it is and how much to use"
      answer="Bacteriostatic water is sterile water containing 0.9% benzyl alcohol, a preservative that lets the same vial be entered repeatedly for about 28 days. It is used to reconstitute powdered peptides before injection. How much you add sets the concentration, not the dose — aim for a volume that puts your dose between 10 and 30 units on an insulin syringe."
      callout={{
        title: "Not for newborns, and not a substitute for aseptic technique",
        body: "Benzyl alcohol is contraindicated in neonates. Bacteriostatic water slows bacterial growth, it does not sterilise a contaminated vial — swab the stopper every time and respect the 28-day limit. This page is educational reference, not medical advice.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Write the concentration down once, not on every vial",
        body: "DoseRoutine stores the vial strength and diluent volume you used, converts every logged dose into both mcg and syringe units, and reminds you when a reconstituted vial is approaching its discard date.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
