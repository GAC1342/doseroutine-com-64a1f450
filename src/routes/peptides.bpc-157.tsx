import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/bpc-157";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "BPC-157 Peptides: Evidence, Dosing and Risks";
const DESC =
  "What BPC-157 is, what the animal research actually shows, why there are no human trials, typical dosing ranges, side effects, legality and how to vet a source.";

export const FAQ = [
  {
    q: "What is BPC-157?",
    a: "BPC-157 is a synthetic 15-amino-acid peptide derived from a fragment of body protection compound, a protein found in human gastric juice. It is sold as a research chemical for tissue repair. It is not an approved medicine anywhere and has no completed published human efficacy trials.",
  },
  {
    q: "Does BPC-157 actually work?",
    a: "In rodents, BPC-157 accelerates healing of tendon, muscle, ligament, bone and gut tissue across many published studies. Those results have not been reproduced in controlled human trials, so the honest answer is that the animal evidence is genuinely consistent and the human evidence does not yet exist.",
  },
  {
    q: "How is BPC-157 dosed?",
    a: "Reported protocols typically use 200 to 500 mcg per day subcutaneously, sometimes split into two injections, for four to eight weeks. These figures come from user practice and animal-dose extrapolation, not from human dose-finding studies, so no dose can be called established or safe.",
  },
  {
    q: "Is BPC-157 safe?",
    a: "No human safety dataset exists. Animal toxicology has not shown obvious acute toxicity, but that says nothing about long-term human use. The FDA placed BPC-157 in its Category 2 list of bulk substances presenting significant safety risks for compounding, citing insufficient safety data and immunogenicity concerns.",
  },
  {
    q: "Is BPC-157 legal?",
    a: "It is not an approved drug and cannot legally be sold for human consumption; it is sold labeled for research use only. WADA added BPC-157 to the prohibited list under S0 (non-approved substances), so any tested athlete using it will fail a doping control.",
  },
  {
    q: "What are the side effects of BPC-157?",
    a: "Reported effects are mostly injection-site reactions, transient fatigue, nausea and headache. Because no controlled trials have been run, the true side effect profile is unknown, and any theoretical risk of stimulating growth in existing tumours through angiogenesis has not been studied in people.",
  },
  {
    q: "Oral or injectable BPC-157?",
    a: "Injectable subcutaneous is the format almost all research protocols and user reports use. Oral capsules are marketed on the argument that BPC-157 is gastric in origin and therefore acid-stable, but human absorption data for the oral form are absent.",
  },
];

const SECTIONS = [
  {
    heading: "What BPC-157 is and how it is thought to work",
    paragraphs: [
      "BPC-157 — sometimes written PL 14736 or pentadecapeptide BPC 157 — is a chain of 15 amino acids corresponding to a partial sequence of body protection compound, a protein isolated from human gastric juice. Because it is a short synthetic fragment rather than the parent protein, it can be made cheaply and is stable enough to survive handling, which is a large part of why it became a widely sold research peptide.",
      "The mechanisms proposed in the animal literature center on angiogenesis and growth factor signalling: upregulation of VEGF receptor 2 and its downstream nitric oxide pathway, increased expression of growth hormone receptors on tendon fibroblasts, and modulation of the nitric oxide system more broadly. In practical terms the hypothesis is that BPC-157 helps new blood vessels reach damaged tissue faster, and better perfusion means faster repair.",
      "That is a mechanistic story built almost entirely on rodent and cell-culture work. It is coherent, and it is unverified in humans.",
    ],
  },
  {
    heading: "What the research shows — and where it stops",
    table: {
      caption: "State of the evidence by claim.",
      head: ["Claim", "Evidence type", "Strength"],
      rows: [
        [
          "Tendon and ligament healing",
          "Multiple rat studies, in-vitro fibroblast work",
          "Consistent in animals; no human trials",
        ],
        [
          "Muscle injury recovery",
          "Rat crush and transection models",
          "Consistent in animals; no human trials",
        ],
        [
          "Gut protection / IBD",
          "Rodent models; one early-phase human study of the parent compound",
          "Preliminary",
        ],
        ["Bone and joint repair", "Rabbit and rat models", "Limited"],
        ["Neuroprotection", "Rodent models", "Exploratory"],
        ["Any human efficacy outcome", "None published", "Absent"],
      ],
    },
    paragraphs: [
      "The gap is important and often glossed over in marketing. A search of clinical trial registries returns no completed, published randomised controlled trial of BPC-157 for tendon, muscle or joint healing in humans. Peptides that work spectacularly in rodents failing in people is the historical norm, not the exception.",
    ],
  },
  {
    heading: "Reported dosing practice",
    paragraphs: [
      "There is no established human dose, because no human dose-finding study has been done. What circulates is a convention: 200 to 500 mcg per day subcutaneously, often injected near the injury site, run for four to eight weeks and then stopped. Some protocols split the daily amount into a morning and evening dose on the reasoning that the peptide's half-life is short.",
      "The practical failure point is arithmetic, not protocol. BPC-157 ships as a lyophilized powder, usually 5 mg or 10 mg per vial, and the dose is in micrograms — so every injection needs a two-step conversion from vial strength and diluent volume to units on an insulin syringe.",
    ],
    steps: [
      "Read the vial strength from the label — commonly 5 mg or 10 mg.",
      "Reconstitute with bacteriostatic water; 2 mL into a 5 mg vial gives 2.5 mg/mL.",
      "At 2.5 mg/mL, 250 mcg is 0.1 mL, which is 10 units on a U-100 insulin syringe.",
      "Write the diluent volume and date on the vial — the same vial with 1 mL of water doubles every dose.",
      "Refrigerate after reconstitution and rotate injection sites to avoid local irritation.",
    ],
  },
  {
    heading: "Safety, risks and contraindications",
    bullets: [
      "No human safety data. Reported side effects — injection-site reaction, nausea, headache, transient fatigue — come from anecdote, not surveillance.",
      "The FDA lists BPC-157 in Category 2: bulk drug substances that raise significant safety risks, citing limited safety data and immunogenicity concerns, which bars it from legitimate compounding.",
      "Theoretical angiogenesis risk: a compound that promotes new blood vessel growth is a poor idea for anyone with an active or recent malignancy. This has not been studied in humans, which is a reason for caution rather than reassurance.",
      "Prohibited in sport. WADA lists BPC-157 under S0, non-approved substances, banned at all times.",
      "Pregnancy, breastfeeding and use in anyone under 18: no data at all. Avoid.",
      "Product risk is a separate risk. An unregulated vial can be underdosed, degraded, contaminated or a different peptide entirely.",
    ],
  },
  {
    heading: "How to vet a BPC-157 source",
    paragraphs: [
      "Because BPC-157 is sold outside pharmaceutical manufacturing standards, the vial's contents are unverified unless the seller proves otherwise. The minimum is a batch-specific certificate of analysis from an independent lab, with a lot number matching your vial, HPLC purity of 98 percent or higher, and mass spectrometry confirming a molecular mass consistent with the 15-residue sequence.",
      "A generic COA with no lot number, dosing advice published on the vendor's own site, or ambient shipping in summer are each sufficient reason to buy elsewhere. The full checklist is on our supplier vetting guide.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "Chang C-H, Tsai W-C, Lin M-S, et al. The promoting effect of pentadecapeptide BPC 157 on tendon healing involves tendon outgrowth, cell survival, and cell migration. J Appl Physiol. 2011;110(3):774–780.",
    url: "https://pubmed.ncbi.nlm.nih.gov/21030672/",
  },
  {
    cite: "Hsieh M-J, Liu H-T, Wang C-N, et al. Therapeutic potential of pro-angiogenic BPC157 is associated with VEGFR2 activation and up-regulation. J Mol Med. 2017;95(3):323–333.",
    url: "https://pubmed.ncbi.nlm.nih.gov/27847966/",
  },
  {
    cite: "Sikiric P, Rucman R, Turkovic B, et al. Novel Cytoprotective Mediator Stable Gastric Pentadecapeptide BPC 157. Curr Neuropharmacol. 2016;14(8):857–865.",
    url: "https://pubmed.ncbi.nlm.nih.gov/27138887/",
  },
  {
    cite: "Seiwerth S, Milavic M, Vukojevic J, et al. Stable Gastric Pentadecapeptide BPC 157 and Wound Healing. Front Pharmacol. 2021;12:627533.",
    url: "https://pubmed.ncbi.nlm.nih.gov/34267654/",
  },
  {
    cite: "US Food and Drug Administration. Certain Bulk Drug Substances for Use in Compounding — Category 2 (significant safety risks), including BPC-157.",
    url: "https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-nominated-use-compounding-under-section-503a-federal-food-drug-and-cosmetic-act",
  },
  {
    cite: "World Anti-Doping Agency. The Prohibited List — S0: Non-Approved Substances.",
    url: "https://www.wada-ama.org/en/prohibited-list",
  },
];

export const Route = createFileRoute("/peptides/bpc-157")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "BPC-157",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="BPC-157 peptides: evidence, dosing and risks"
      answer="BPC-157 is a synthetic 15-amino-acid peptide sold as a research chemical for tissue repair. Rodent studies consistently show faster tendon, muscle and gut healing, but no completed human trial has been published. It is not an approved medicine, is banned in tested sport, and the FDA flags it as a significant safety risk."
      callout={{
        title: "Not an approved medicine, and not medical advice",
        body: "BPC-157 has no human efficacy or safety trials and is sold labeled for research use only. This page summarises the published evidence and reported practice so you can have an informed conversation with a clinician — it is not a protocol or a recommendation to use it.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Log BPC-157 doses without recalculating every time",
        body: "Save the vial once — strength, diluent volume, reconstitution date — and DoseRoutine shows the syringe units for each scheduled dose, counts the vial down, rotates injection sites, and flags interactions with the rest of your stack.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
