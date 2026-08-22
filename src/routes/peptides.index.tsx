import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "What Are Peptides? Types, Uses and Safety | DoseRoutine";
const DESC =
  "Peptides are short chains of amino acids. Here's what they are, how they differ from proteins, the main categories people use, and how they are dosed.";

export const FAQ = [
  {
    q: "What are peptides?",
    a: "Peptides are short chains of amino acids joined by peptide bonds, typically 2 to 50 residues long. Your body makes thousands of them, including insulin and growth hormone. Synthetic peptides copy or modify those natural signals so they act on a specific receptor.",
  },
  {
    q: "What is a peptide, in one sentence?",
    a: "A peptide is a molecule made of amino acids linked in a chain — shorter than a protein, long enough to carry a specific biological message such as telling the pituitary to release growth hormone or telling the pancreas to release insulin.",
  },
  {
    q: "What is the difference between a peptide and a protein?",
    a: "Length, and therefore structure. Chains up to roughly 50 amino acids are called peptides; longer chains fold into complex three-dimensional shapes and are called proteins. The cutoff is a convention, not a hard chemical boundary — insulin at 51 residues is called both.",
  },
  {
    q: "Are peptides safe?",
    a: "It depends entirely on which peptide. Approved peptide medicines such as insulin and semaglutide have full safety data. Research peptides sold online are not approved for human use, have no purity guarantee, and carry unknown risk. Never assume one peptide's safety record transfers to another.",
  },
  {
    q: "Why are most peptides injected instead of swallowed?",
    a: "Digestive enzymes cleave peptide bonds. A peptide swallowed as a capsule is broken into individual amino acids before it reaches the bloodstream, so the signal is destroyed. Subcutaneous injection bypasses the gut. Collagen peptides are the exception — the amino acids themselves are the point.",
  },
  {
    q: "Are peptides legal?",
    a: "Approved peptide drugs are legal with a prescription. Many others are sold as research chemicals that are legal to buy for laboratory use but not approved for human consumption. Most performance peptides are also banned in tested sport under WADA category S2.",
  },
];

const SECTIONS = [
  {
    heading: "What is a peptide made of?",
    paragraphs: [
      "Every peptide is a chain of amino acids linked end to end by peptide bonds — a covalent bond between the carboxyl group of one amino acid and the amino group of the next, formed by removing a molecule of water. The order of those amino acids is the whole message: swap one residue and the peptide may bind a different receptor, or nothing at all.",
      "Because the chain is short, most peptides do not fold into the elaborate structures proteins do. That makes them easier to synthesise, easier to modify, and easier to destroy — which is why they are usually injected and why storage conditions matter so much.",
    ],
  },
  {
    heading: "Peptide vs protein vs amino acid",
    table: {
      caption: "Where the boundaries sit by convention.",
      head: ["Molecule", "Typical length", "Example", "How it is usually taken"],
      rows: [
        ["Amino acid", "1 residue", "Leucine, glycine", "Oral powder or food"],
        [
          "Peptide",
          "2–50 residues",
          "BPC-157, semaglutide, oxytocin",
          "Injection (most), topical, oral (few)",
        ],
        [
          "Protein",
          "50+ residues, folded",
          "Albumin, collagen, antibodies",
          "Food, injection (biologics)",
        ],
      ],
    },
    paragraphs: [
      "Hydrolysed collagen sits deliberately in the middle: a large protein is enzymatically cut into short fragments so the gut can absorb them. That is why the label reads collagen peptides rather than collagen protein.",
    ],
  },
  {
    heading: "What are peptides used for?",
    bullets: [
      "Metabolic and weight management — GLP-1 receptor agonists such as semaglutide and tirzepatide. These are approved medicines with large randomised trials behind them.",
      "Growth hormone secretagogues — CJC-1295, ipamorelin, sermorelin, hexarelin. These prompt the pituitary to release the body's own growth hormone; none are approved for anti-ageing use.",
      "Tissue repair — BPC-157 and TB-500 are the two most searched. Evidence is almost entirely animal or in-vitro; neither is an approved human medicine.",
      "Cosmetic and skin — Matrixyl (palmitoyl pentapeptide-4), copper peptides and argireline in topical form; collagen peptides taken orally.",
      "Cognitive and neurological — Semax and Selank, developed and prescribed in Russia, unapproved elsewhere.",
      "Research tools — cell-penetrating peptides used in the lab to carry cargo across the cell membrane, not a consumer product.",
    ],
  },
  {
    heading: "How are peptides dosed?",
    paragraphs: [
      "Most injectable peptides ship as a lyophilized (freeze-dried) powder measured in milligrams. You add bacteriostatic water to reconstitute the vial, then draw a dose measured in micrograms or milligrams using an insulin syringe marked in units. The two-step conversion — mg in the vial, mL of diluent, units on the syringe — is where nearly every dosing error happens.",
      "A 5 mg vial reconstituted with 2 mL of bacteriostatic water holds 2,500 mcg per mL. On a U-100 insulin syringe, 100 units equals 1 mL, so each unit carries 25 mcg. A 250 mcg dose is therefore 10 units. Get the diluent volume wrong and the error is proportional — half the water means double the dose.",
    ],
    steps: [
      "Read the vial strength in mg from the label, not from the vendor listing.",
      "Choose a diluent volume that puts your intended dose at a readable number of units — typically 10 to 30.",
      "Reconstitute slowly down the vial wall; do not shake.",
      "Calculate concentration: vial mg ÷ diluent mL = mg per mL.",
      "Convert to units: dose ÷ concentration × 100 = units on a U-100 syringe.",
      "Refrigerate the reconstituted vial and log the reconstitution date so the beyond-use date is not guesswork.",
    ],
  },
  {
    heading: "Safety, purity and legal status",
    paragraphs: [
      "Approved peptide medicines are manufactured to pharmacopoeial standards and dispensed with a label you can trust. Research peptides are not. Independent testing programs have repeatedly found products whose contents did not match the label — wrong quantity, degraded material, or a different compound entirely. The US Food and Drug Administration has also placed several popular peptides, including BPC-157, on its list of bulk substances that present significant safety risks for compounding.",
      "Peptide hormones, growth factors and their mimetics are prohibited at all times under category S2 of the World Anti-Doping Agency list, so a tested athlete using them will fail. Anyone considering a peptide protocol should get baseline blood work and clinician oversight first, not after.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "National Human Genome Research Institute. Peptide — Talking Glossary of Genomic and Genetic Terms.",
    url: "https://www.genome.gov/genetics-glossary/Peptide",
  },
  {
    cite: "Wang L, Wang N, Zhang W, et al. Therapeutic peptides: current applications and future directions. Signal Transduct Target Ther. 2022;7:48.",
    url: "https://pubmed.ncbi.nlm.nih.gov/35165272/",
  },
  {
    cite: "Muttenthaler M, King GF, Adams DJ, Alewood PF. Trends in peptide drug discovery. Nat Rev Drug Discov. 2021;20(4):309–325.",
    url: "https://pubmed.ncbi.nlm.nih.gov/33536635/",
  },
  {
    cite: "US Food and Drug Administration. Certain Bulk Drug Substances for Use in Compounding — Category 2 (significant safety risks), including BPC-157.",
    url: "https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-nominated-use-compounding-under-section-503a-federal-food-drug-and-cosmetic-act",
  },
  {
    cite: "World Anti-Doping Agency. The Prohibited List — S2: Peptide Hormones, Growth Factors, Related Substances and Mimetics.",
    url: "https://www.wada-ama.org/en/prohibited-list",
  },
];

export const Route = createFileRoute("/peptides/")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Peptides",
      isPillar: true,
      faq: FAQ,
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="What are peptides?"
      answer="Peptides are short chains of amino acids — usually 2 to 50 — joined by peptide bonds. Your body makes them as signalling molecules, including insulin and growth hormone. Synthetic peptides copy those signals to target one receptor, which is why they are dosed in micrograms and almost always injected rather than swallowed."
      callout={{
        title: "Most peptides are not approved medicines",
        body: "Insulin, semaglutide and tirzepatide are approved drugs. BPC-157, TB-500, Semax and the growth hormone secretagogues are sold as research chemicals with no approval, no purity guarantee and no human safety dossier. This page is educational reference material, not a protocol.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Track a peptide protocol without the spreadsheet",
        body: "DoseRoutine stores each vial's strength and diluent volume, converts your dose to syringe units automatically, rotates injection sites, warns on interactions, and charts the blood markers you re-test on a cycle.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
