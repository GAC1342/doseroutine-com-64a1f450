import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/peptide-bond";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Peptide Bonds: What They Are and Why They Matter";
const DESC =
  "What a peptide bond is, how it forms and breaks, and why that chemistry decides whether a peptide is injected, refrigerated, or destroyed by your gut.";

export const FAQ = [
  {
    q: "What are peptide bonds?",
    a: "A peptide bond is the covalent amide link between the carboxyl group of one amino acid and the amino group of the next. Forming it releases a molecule of water, which is why the reaction is called a condensation. Peptide bonds are what hold every peptide and protein chain together.",
  },
  {
    q: "How is a peptide bond formed?",
    a: "In cells, ribosomes catalyse the reaction: the carboxyl carbon of the growing chain attacks the amino nitrogen of the incoming amino acid, a water molecule leaves, and the chain extends by one residue. Laboratory synthesis does the same chemistry stepwise on a solid resin support.",
  },
  {
    q: "How is a peptide bond broken?",
    a: "By hydrolysis — adding water back across the bond, usually accelerated by an enzyme such as pepsin or trypsin, or by strong acid and heat. This is exactly what digestion does, and it is the reason most peptide drugs cannot be taken as a pill.",
  },
  {
    q: "Is a peptide bond the same as an amide bond?",
    a: "Chemically yes. A peptide bond is an amide bond that happens to join two amino acids. The name changes with the context, not the chemistry, which is why peptide bonds share amide properties such as partial double-bond character and planarity.",
  },
  {
    q: "Why is the peptide bond planar?",
    a: "The lone pair on the nitrogen delocalises into the carbonyl, giving the C–N bond around 40 percent double-bond character. Rotation about it is restricted, so the six atoms around the bond lie in a plane. That rigidity is what gives peptide and protein backbones a predictable shape.",
  },
  {
    q: "What does this mean for storing peptides?",
    a: "Hydrolysis needs water, and heat speeds it up. That is why peptides ship as a dry lyophilized powder, why reconstituted vials go in the fridge, and why a vial left warm loses potency over days rather than months. Store dry, cold and dark.",
  },
];

const SECTIONS = [
  {
    heading: "How a peptide bond forms",
    paragraphs: [
      "Two amino acids meet. The carboxyl group (–COOH) of the first and the amino group (–NH2) of the second react; the hydroxyl from one and a hydrogen from the other leave together as water, and a C–N bond is left behind. The result is a dipeptide with a free amino end (the N-terminus) and a free carboxyl end (the C-terminus), ready to extend in either direction.",
      "Repeat the reaction and you get the backbone: a repeating pattern of nitrogen, alpha carbon, carbonyl carbon. Everything that makes one peptide different from another hangs off that backbone as side chains, in a sequence conventionally written N-terminus first.",
    ],
    steps: [
      "The carboxyl group of amino acid 1 is activated (by the ribosome in cells, by a coupling reagent in the lab).",
      "The amino nitrogen of amino acid 2 attacks the activated carbonyl carbon.",
      "A molecule of water leaves — this is the condensation step.",
      "A planar amide linkage remains: the peptide bond.",
    ],
  },
  {
    heading: "Properties of the peptide bond",
    table: {
      caption: "The four properties that matter in practice.",
      head: ["Property", "What it means", "Practical consequence"],
      rows: [
        [
          "Planarity",
          "Resonance gives ~40% double-bond character; six atoms lie in one plane",
          "Backbone conformation is constrained and predictable",
        ],
        [
          "Trans preference",
          "Adjacent side chains sit opposite each other in almost all bonds",
          "Proline is the exception and often creates a kink",
        ],
        [
          "Polarity",
          "The C=O accepts and the N–H donates hydrogen bonds",
          "Drives folding, and drives binding to water",
        ],
        [
          "Hydrolytic lability",
          "Stable in dry conditions, cleaved by water plus enzyme or acid",
          "Dry storage, cold chain, and injection instead of swallowing",
        ],
      ],
    },
  },
  {
    heading: "Why peptide bonds mean injections, not capsules",
    paragraphs: [
      "Pepsin in the stomach and trypsin and chymotrypsin in the small intestine exist to hydrolyse peptide bonds. Anything you swallow with a peptide backbone is a substrate. Oral bioavailability for an unmodified therapeutic peptide is typically well under one percent, which is why almost every peptide medicine is given subcutaneously.",
      "The exceptions prove the rule. Oral semaglutide only works because it is co-formulated with an absorption enhancer, SNAC, that protects it long enough to cross the stomach lining — and even then it needs a much larger dose than the injection. Collagen peptides work orally for the opposite reason: the fragments are meant to be digested, and the amino acids are the product.",
    ],
  },
  {
    heading: "What this changes about handling your vials",
    bullets: [
      "Keep lyophilized powder in the fridge or freezer, dry and away from light, until the moment you reconstitute.",
      "Use bacteriostatic water rather than sterile water when a vial will be used over several days — the benzyl alcohol limits microbial growth, which is a separate problem from hydrolysis.",
      "Add diluent slowly down the wall of the vial and swirl; foaming from shaking denatures material at the air–liquid interface.",
      "Refrigerate immediately after reconstitution and log the date. Most reconstituted research peptides are treated as usable for roughly two to four weeks refrigerated, less at room temperature.",
      "Do not re-freeze a reconstituted vial repeatedly; freeze–thaw cycles cost potency.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "National Human Genome Research Institute. Peptide — Talking Glossary of Genomic and Genetic Terms.",
    url: "https://www.genome.gov/genetics-glossary/Peptide",
  },
  {
    cite: "Pauling L, Corey RB, Branson HR. The structure of proteins: two hydrogen-bonded helical configurations of the polypeptide chain. Proc Natl Acad Sci USA. 1951;37(4):205–211.",
    url: "https://pubmed.ncbi.nlm.nih.gov/14816373/",
  },
  {
    cite: "Berg JM, Tymoczko JL, Stryer L. Biochemistry, 5th edition — Section 3.2: Primary Structure: Amino Acids Are Linked by Peptide Bonds. NCBI Bookshelf.",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK22364/",
  },
  {
    cite: "Buckley ST, Bækdal TA, Vegge A, et al. Transcellular stomach absorption of a derivatized glucagon-like peptide-1 receptor agonist. Sci Transl Med. 2018;10(467):eaar7047.",
    url: "https://pubmed.ncbi.nlm.nih.gov/30429357/",
  },
  {
    cite: "Merrifield RB. Solid phase peptide synthesis. I. The synthesis of a tetrapeptide. J Am Chem Soc. 1963;85(14):2149–2154.",
    url: "https://pubs.acs.org/doi/10.1021/ja00897a025",
  },
];

export const Route = createFileRoute("/peptides/peptide-bond")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Peptide bonds",
      faq: FAQ,
      type: "TechArticle",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="Peptide bonds: what they are and why they matter"
      answer="A peptide bond is the covalent amide link joining the carboxyl group of one amino acid to the amino group of the next, formed by releasing a molecule of water. Those bonds build every peptide chain — and because water plus a digestive enzyme breaks them, they are the reason most peptides are injected and refrigerated."
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Your vial's clock starts at reconstitution",
        body: "DoseRoutine records the date you reconstituted each vial, tracks how much is left after every dose, and reminds you before the beyond-use date so you are not guessing whether last month's vial is still good.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
