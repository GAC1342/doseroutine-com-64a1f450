import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/tb-500";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "TB-500 Peptides: Evidence, Dosing and Safety";
const DESC =
  "What TB-500 is, how it relates to thymosin beta-4, what the research supports, reported dosing, contraindications and why it is banned in tested sport.";

export const FAQ = [
  {
    q: "What is TB-500?",
    a: "TB-500, also written TB500 or peptides TB 500, is a synthetic 7-amino-acid fragment of thymosin beta-4, a naturally occurring protein involved in actin regulation and cell migration. It is sold as a research chemical for tissue repair and is not an approved medicine.",
  },
  {
    q: "Is TB-500 the same as thymosin beta-4?",
    a: "No. Thymosin beta-4 is the full 43-amino-acid protein your body makes. TB-500 is a short synthetic fragment containing the actin-binding region. Studies of the full protein are frequently cited to sell the fragment, which is not a valid substitution — the two are different molecules with different data.",
  },
  {
    q: "How does TB-500 work?",
    a: "The proposed mechanism is actin sequestration. By binding G-actin, thymosin beta-4 influences cytoskeletal remodelling, which supports cell migration, angiogenesis and reduced inflammatory signalling at an injury site. Faster cell migration into damaged tissue is the theoretical basis for the healing claims.",
  },
  {
    q: "How is TB-500 dosed?",
    a: "Reported protocols use a loading phase of roughly 2 to 5 mg per week, often split across two subcutaneous injections, for four to six weeks, then a lower maintenance dose. These numbers come from user practice and animal extrapolation, not human dose-finding trials, so no dose is established as effective or safe.",
  },
  {
    q: "Is TB-500 safe?",
    a: "There is no human safety dataset. Reported effects are mostly injection-site reactions, head rush and lethargy. Because thymosin beta-4 promotes angiogenesis and cell migration, use is theoretically inadvisable for anyone with an active or recent cancer — a caution, not a measured finding.",
  },
  {
    q: "Is TB-500 banned in sport?",
    a: "Yes. TB-500 and thymosin beta-4 are prohibited at all times under WADA category S2 as growth factors affecting tissue regeneration. Athletes in tested sport have been sanctioned for it, and it is detectable in standard anti-doping analysis.",
  },
  {
    q: "TB-500 vs BPC-157 — what's the difference?",
    a: "Both are unapproved repair peptides with animal-only evidence. BPC-157 is a gastric-derived 15-residue peptide acting largely through VEGF-driven angiogenesis; TB-500 is a thymosin beta-4 fragment acting through actin regulation and cell migration. They are frequently stacked, though no controlled data support the combination.",
  },
];

const SECTIONS = [
  {
    heading: "What TB-500 actually is",
    paragraphs: [
      "Thymosin beta-4 is a 43-amino-acid protein present in almost every human cell and in wound fluid, where it is one of the main regulators of actin — the protein that builds the cell's internal scaffolding. Because actin dynamics drive how cells move, thymosin beta-4 sits upstream of cell migration, new blood vessel formation and the inflammatory response to injury.",
      "TB-500 is not that protein. It is a synthetic seven-residue fragment, usually described as the actin-binding domain, sometimes supplied in an acetylated form for stability. The distinction matters commercially: much of the published evidence used to market TB-500 was generated with full-length thymosin beta-4, including the corneal and dermal wound-healing trials that reached early-phase human testing. Fragment and parent protein are not interchangeable.",
    ],
  },
  {
    heading: "Evidence: what is supported, what is extrapolated",
    table: {
      caption: "Claim-by-claim status of the literature.",
      head: ["Claim", "Studied in", "Molecule studied", "Status"],
      rows: [
        [
          "Dermal and corneal wound healing",
          "Rodents; early-phase human trials",
          "Full thymosin beta-4",
          "Preliminary human data for the protein, not the fragment",
        ],
        ["Cardiac repair after infarction", "Mouse models", "Full thymosin beta-4", "Animal only"],
        [
          "Tendon and muscle recovery",
          "Rodent and equine models",
          "Mixed / fragment",
          "Animal only",
        ],
        [
          "Reduced inflammation and fibrosis",
          "Rodent models",
          "Full thymosin beta-4",
          "Animal only",
        ],
        ["Human injury recovery in athletes", "Not studied", "—", "No evidence"],
      ],
    },
    paragraphs: [
      "The pattern to notice: the strongest data belong to the full protein, and the product sold is the fragment. Anyone quoting a thymosin beta-4 clinical trial as evidence for a TB-500 vial is skipping that step.",
    ],
  },
  {
    heading: "Reported dosing and handling",
    paragraphs: [
      "There is no validated human protocol. The convention circulating in user communities is a loading phase of about 2 to 5 mg per week, split into two subcutaneous injections, for four to six weeks, followed by a maintenance dose of roughly 2 mg per month. TB-500 is usually sold as a 2 mg, 5 mg or 10 mg lyophilized vial, and unlike BPC-157 the doses are in milligrams rather than micrograms — which changes the arithmetic entirely.",
      "Reconstitution is where a stated protocol turns into an actual injection, and the same vial with different diluent volumes gives completely different syringe readings.",
    ],
    steps: [
      "Check the vial strength: 2 mg, 5 mg and 10 mg are all common, and the vendor listing is not the label.",
      "Reconstitute with bacteriostatic water — 2 mL into a 5 mg vial gives 2.5 mg/mL.",
      "At 2.5 mg/mL, a 2.5 mg dose is 1 mL, the entire barrel of a U-100 syringe; a 1.25 mg dose is 50 units.",
      "If the units figure lands above about 50, use more diluent so the draw is readable and comfortable.",
      "Record diluent volume and reconstitution date on the vial; refrigerate immediately after mixing.",
      "Rotate subcutaneous sites — abdomen, flank, thigh — rather than repeatedly injecting near the injury.",
    ],
  },
  {
    heading: "Safety, risks and contraindications",
    bullets: [
      "No human safety trials exist for TB-500 as a fragment. Anything described as a known side effect profile is anecdotal.",
      "Angiogenesis and cell migration are the proposed mechanisms, so active or recent malignancy is the clearest reason not to use it. This is a mechanistic caution; it has not been measured in people.",
      "Prohibited at all times in tested sport under WADA category S2, and detectable in standard testing.",
      "No data in pregnancy, breastfeeding or anyone under 18 — avoid entirely.",
      "Reported effects include injection-site reaction, transient head rush, lethargy and mild flu-like feelings in the first days.",
      "Unregulated supply means identity and purity are unverified without a batch certificate of analysis; TB-500 is commonly counterfeited because the fragment is cheap to substitute.",
      "Anyone on anticoagulants or with a cardiovascular condition should not add an unstudied vasoactive compound without a clinician's involvement.",
    ],
  },
  {
    heading: "Before you buy: verifying the vial",
    paragraphs: [
      "Ask for a certificate of analysis tied to the lot number printed on your vial, issued by an independent lab, reporting HPLC purity of 98 percent or higher and a mass spectrometry result matching the expected molecular weight. For TB-500 specifically, confirm the COA describes the fragment you are buying rather than full-length thymosin beta-4 — the two have very different masses, and the mass spectrum will show which one is in the vial.",
      "No lot number, no independent lab, dosing advice on the vendor's site, or room-temperature shipping in summer are each reason enough to walk away.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "Goldstein AL, Hannappel E, Kleinman HK. Thymosin β4: actin-sequestering protein moonlights to repair injured tissues. Trends Mol Med. 2005;11(9):421–429.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16099219/",
  },
  {
    cite: "Sosne G, Qiu P, Kurpakus-Wheater M. Thymosin beta 4 and the eye: I can see clearly now the pain is gone. Ann N Y Acad Sci. 2007;1112:114–122.",
    url: "https://pubmed.ncbi.nlm.nih.gov/17567944/",
  },
  {
    cite: "Bock-Marquette I, Saxena A, White MD, et al. Thymosin β4 activates integrin-linked kinase and promotes cardiac cell migration, survival and cardiac repair. Nature. 2004;432(7016):466–472.",
    url: "https://pubmed.ncbi.nlm.nih.gov/15565145/",
  },
  {
    cite: "Malinda KM, Sidhu GS, Mani H, et al. Thymosin beta4 accelerates wound healing. J Invest Dermatol. 1999;113(3):364–368.",
    url: "https://pubmed.ncbi.nlm.nih.gov/10469335/",
  },
  {
    cite: "Esposito S, Deventer K, Van Eenoo P. Characterization and identification of a C-terminal amidated mechano growth factor and thymosin beta 4 analogues in doping control. Drug Test Anal. 2012;4(9):733–738.",
    url: "https://pubmed.ncbi.nlm.nih.gov/22930600/",
  },
  {
    cite: "World Anti-Doping Agency. The Prohibited List — S2: Peptide Hormones, Growth Factors, Related Substances and Mimetics.",
    url: "https://www.wada-ama.org/en/prohibited-list",
  },
];

export const Route = createFileRoute("/peptides/tb-500")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "TB-500",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="TB-500 peptides: evidence, dosing and safety"
      answer="TB-500 is a synthetic seven-amino-acid fragment of thymosin beta-4, sold as a research chemical for tissue repair. It is thought to work by binding actin and speeding cell migration into damaged tissue. The strongest published data used the full protein, not the fragment, and no human trial of TB-500 itself exists."
      callout={{
        title: "Unapproved, unstudied in humans, and banned in sport",
        body: "TB-500 is sold for research use only, has no human efficacy or safety trials, and is prohibited at all times under WADA category S2. This page summarises the published evidence so you can discuss it with a clinician — it is not a protocol.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Weekly loading doses are easy to lose track of",
        body: "DoseRoutine keeps the loading and maintenance phases on a schedule, converts your milligram dose to syringe units from the vial you actually mixed, rotates injection sites, and shows how much of the vial is left.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
