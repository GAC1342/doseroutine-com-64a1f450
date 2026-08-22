import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/cell-penetrating-peptides";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Cell-Penetrating Peptides: How CPPs Work | DoseRoutine";
const DESC =
  "Cell-penetrating peptides carry drugs and nucleic acids across the cell membrane. How CPPs work, the main classes, uptake routes and where they are used.";

export const FAQ = [
  {
    q: "What are cell-penetrating peptides?",
    a: "Cell-penetrating peptides, or CPPs, are short sequences of roughly 5 to 30 amino acids that cross the plasma membrane and can drag attached cargo with them. TAT, derived from HIV-1, and penetratin, from the Antennapedia homeodomain, are the two classic examples.",
  },
  {
    q: "How do cell-penetrating peptides enter cells?",
    a: "By two broad routes: direct translocation across the lipid bilayer, and endocytosis — mostly macropinocytosis. Which route dominates depends on the peptide, its concentration, the cargo and the cell type. Most CPPs use both at once, and escaping the endosome afterwards is the main bottleneck.",
  },
  {
    q: "What are CPPs used for?",
    a: "As delivery vehicles in research and drug development: carrying siRNA, antisense oligonucleotides, peptide nucleic acids, proteins, CRISPR components, imaging agents and chemotherapeutics into cells that would otherwise exclude them.",
  },
  {
    q: "Are cell-penetrating peptides a supplement?",
    a: "No. CPPs are laboratory and pharmaceutical delivery tools, not consumer products. They are not sold or used as supplements, and nothing about them applies to peptides people self-administer.",
  },
  {
    q: "What is the difference between cationic and amphipathic CPPs?",
    a: "Cationic CPPs such as TAT and polyarginine are rich in arginine and lysine, and rely on positive charge interacting with negatively charged membrane components. Amphipathic CPPs such as transportan have separate hydrophobic and hydrophilic faces and insert into the bilayer directly.",
  },
  {
    q: "Why have so few CPP drugs been approved?",
    a: "Three recurring problems: poor selectivity, since most CPPs enter any cell; entrapment in endosomes where the cargo is degraded before it acts; and rapid proteolysis and clearance in vivo. Progress has come mostly from targeted and stapled designs that address selectivity and stability.",
  },
];

const SECTIONS = [
  {
    heading: "Why the cell membrane is a problem worth solving",
    paragraphs: [
      "The plasma membrane is a hydrophobic barrier that excludes almost everything large, charged or polar. That is excellent biology and terrible pharmacology: siRNA, antisense oligonucleotides, peptides and proteins all have intracellular targets and none of them cross unaided. Cell-penetrating peptides exist to solve exactly that delivery problem.",
      "The field started with an accident. In 1988 two groups independently found that the HIV-1 TAT transactivator protein was taken up by cells in culture; the region responsible turned out to be a short arginine-rich stretch. Penetratin, from the Drosophila Antennapedia homeodomain, followed in 1994. Hundreds of natural and designed sequences have been catalogued since.",
    ],
  },
  {
    heading: "The main classes of CPP",
    table: {
      caption: "Representative peptides by class.",
      head: ["Class", "Examples", "Defining feature", "Typical entry route"],
      rows: [
        [
          "Cationic",
          "TAT (47–57), polyarginine R8/R9, penetratin",
          "Dense arginine/lysine positive charge",
          "Endocytosis, with direct translocation at higher concentration",
        ],
        [
          "Amphipathic",
          "Transportan, MPG, Pep-1",
          "Separate hydrophobic and hydrophilic faces",
          "Direct membrane insertion and pore-like transient defects",
        ],
        [
          "Hydrophobic",
          "C105Y, Pep-7",
          "Low net charge, nonpolar residues",
          "Direct translocation",
        ],
        [
          "Targeted / activatable",
          "iRGD, ACPPs with cleavable masks",
          "Uptake gated by a tissue signal such as a tumour protease",
          "Receptor-mediated, then CPP-driven",
        ],
      ],
    },
  },
  {
    heading: "How CPPs get in — and why getting in is not enough",
    paragraphs: [
      "Direct translocation gives the cargo straight to the cytosol but generally needs a high local concentration and works best with small cargo. Endocytosis is the dominant route for most CPP–cargo conjugates at realistic doses, and macropinocytosis in particular is triggered by arginine-rich sequences binding cell-surface heparan sulfate proteoglycans.",
      "The catch is that endocytosis puts the cargo inside a vesicle, not in the cytosol. Endosomes acidify and fuse with lysosomes, where proteases and nucleases destroy the payload. Endosomal escape efficiency is often only a few percent and is widely considered the field's central unsolved problem — which is why so many designs bolt on fusogenic sequences, photosensitisers or pH-responsive elements purely to break out of the vesicle.",
    ],
  },
  {
    heading: "What CPPs are used for today",
    bullets: [
      "Oligonucleotide delivery — peptide–PMO conjugates for exon skipping in Duchenne muscular dystrophy are among the most advanced clinical applications.",
      "siRNA and antisense delivery in research, where CPPs compete with lipid nanoparticles rather than replacing them.",
      "Protein and gene-editing cargo, including CRISPR ribonucleoprotein delivery without a viral vector.",
      "Tumour-targeted delivery using activatable CPPs whose polycationic domain is masked until a tumour-associated protease cleaves it.",
      "Imaging and diagnostics, tagging CPPs with fluorophores or radiolabels to reach intracellular targets.",
      "Basic cell biology, as a routine way to introduce a probe or inhibitor into cultured cells.",
    ],
  },
  {
    heading: "How CPPs differ from the peptides people self-administer",
    paragraphs: [
      "Searches for cell-penetrating peptides sometimes land alongside searches for BPC-157 or growth hormone secretagogues, but the two categories have nothing in common beyond the word peptide. CPPs are carriers with no therapeutic effect of their own; they are used in labs and in formulation science, conjugated to a payload, at concentrations chosen for a dish of cells.",
      "There is no consumer CPP product, no dosing protocol and no supplement context. If you are looking for what a peptide is in the supplement or protocol sense, start with the peptides overview instead.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "Frankel AD, Pabo CO. Cellular uptake of the tat protein from human immunodeficiency virus. Cell. 1988;55(6):1189–1193.",
    url: "https://pubmed.ncbi.nlm.nih.gov/2849510/",
  },
  {
    cite: "Derossi D, Joliot AH, Chassaing G, Prochiantz A. The third helix of the Antennapedia homeodomain translocates through biological membranes. J Biol Chem. 1994;269(14):10444–10450.",
    url: "https://pubmed.ncbi.nlm.nih.gov/8144628/",
  },
  {
    cite: "Guidotti G, Brambilla L, Rossi D. Cell-Penetrating Peptides: From Basic Research to Clinics. Trends Pharmacol Sci. 2017;38(4):406–424.",
    url: "https://pubmed.ncbi.nlm.nih.gov/28209404/",
  },
  {
    cite: "Xie J, Bi Y, Zhang H, et al. Cell-Penetrating Peptides in Diagnosis and Treatment of Human Diseases: From Preclinical Research to Clinical Application. Front Pharmacol. 2020;11:697.",
    url: "https://pubmed.ncbi.nlm.nih.gov/32508641/",
  },
  {
    cite: "Kauffman WB, Fuselier T, He J, Wimley WC. Mechanism Matters: A Taxonomy of Cell Penetrating Peptides. Trends Biochem Sci. 2015;40(12):749–764.",
    url: "https://pubmed.ncbi.nlm.nih.gov/26545486/",
  },
];

export const Route = createFileRoute("/peptides/cell-penetrating-peptides")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Cell-penetrating peptides",
      faq: FAQ,
      type: "TechArticle",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="Cell-penetrating peptides (CPPs)"
      answer="Cell-penetrating peptides are short sequences of about 5 to 30 amino acids that cross the plasma membrane and carry attached cargo — siRNA, proteins, gene-editing complexes, imaging agents — into the cell. They enter by direct translocation and by endocytosis, and escaping the endosome afterwards is the field's main obstacle."
      callout={{
        title: "CPPs are laboratory delivery tools, not supplements",
        body: "Nothing on this page describes a product anyone takes. If you arrived looking for peptides in the protocol or supplement sense, read the peptides overview instead.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Tracking a real peptide protocol?",
        body: "DoseRoutine handles the practical side of injectable peptides: reconstitution math, syringe-unit conversion, injection-site rotation, vial expiry and interaction checks against the rest of your stack.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
