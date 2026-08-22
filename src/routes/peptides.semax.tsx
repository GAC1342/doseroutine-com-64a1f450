import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/semax";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Semax Peptides: Uses, Evidence, Dosing and Safety";
const DESC =
  "Semax is a Russian nootropic peptide derived from ACTH(4-10). What the evidence shows for stroke and cognition, how it is dosed, side effects and legal status.";

export const FAQ = [
  {
    q: "What is Semax?",
    a: "Semax is a synthetic seven-amino-acid peptide, Met-Glu-His-Phe-Pro-Gly-Pro, derived from the ACTH(4-10) fragment with a C-terminal Pro-Gly-Pro added for stability. It is approved and prescribed in Russia for stroke and cognitive indications and is not approved anywhere in North America or the EU.",
  },
  {
    q: "What is Semax used for?",
    a: "In Russia it is prescribed for ischaemic stroke, transient ischaemic attack, cognitive impairment and optic nerve conditions. Outside Russia it is bought as a nootropic for focus, mental stamina and mood, uses that rest on small studies and user reports rather than large trials.",
  },
  {
    q: "How does Semax work?",
    a: "The best-documented effect is a rapid increase in brain-derived neurotrophic factor and its receptor TrkB in the hippocampus, shown in rodent studies. It also modulates dopaminergic and serotonergic signalling and, unlike its ACTH parent fragment, does not raise cortisol.",
  },
  {
    q: "How is Semax dosed?",
    a: "The Russian product is a 0.1 percent or 1 percent intranasal solution, typically 200 to 600 mcg per day divided across nasal doses, with higher hospital doses used acutely after stroke. Research-chemical powder is reconstituted and dosed intranasally by convention; no Western dose-finding study exists.",
  },
  {
    q: "Is Semax safe?",
    a: "Russian clinical use over three decades reports a mild profile, mostly nasal irritation, with no cortisol elevation. There are no large independent Western safety trials, so long-term safety in the doses nootropic users take is not established. Most published safety experience is with the regulated intranasal product, not research powder.",
  },
  {
    q: "What is the difference between Semax and Selank?",
    a: "Both are Russian peptides given intranasally. Semax derives from ACTH(4-10) and is used for cognition, focus and stroke recovery. Selank derives from tuftsin and is used as an anxiolytic. They are frequently discussed together but target different problems.",
  },
  {
    q: "Is Semax legal?",
    a: "It is a prescription medicine in Russia and some neighbouring countries. In the US, UK, EU, Canada and Australia it is not approved, cannot legally be sold for human consumption, and is imported as a research chemical — a status that carries no purity or identity guarantee.",
  },
];

const SECTIONS = [
  {
    heading: "Where Semax came from",
    paragraphs: [
      "Semax was developed at the Institute of Molecular Genetics in Moscow in the 1980s. The starting point was ACTH(4-10), a fragment of adrenocorticotropic hormone known to affect attention and memory but too short-lived to be useful and tied to the stress axis. Researchers removed the hormonal activity and added a Pro-Gly-Pro tail that resists enzymatic breakdown, producing a peptide that acts on the brain without raising cortisol.",
      "It entered the Russian State Register of Medicines in the 1990s and remains in routine clinical use there for stroke and cognitive indications. That regulatory history is unusual among research peptides — Semax has decades of supervised clinical use behind it — but it is confined to one regulatory system, and most of the trial literature is published in Russian and has not been replicated by independent Western groups.",
    ],
  },
  {
    heading: "What the evidence supports",
    table: {
      caption: "Where the data are strongest and where they thin out.",
      head: ["Use", "Evidence", "Status"],
      rows: [
        [
          "Acute ischaemic stroke recovery",
          "Russian randomised and observational trials; approved indication",
          "Approved in Russia; not independently replicated",
        ],
        [
          "BDNF and TrkB upregulation",
          "Rodent hippocampus studies",
          "Well documented mechanistically",
        ],
        [
          "Cognitive impairment, memory",
          "Small Russian clinical studies",
          "Suggestive, small samples",
        ],
        [
          "Attention and mental stamina in healthy adults",
          "Very limited; mostly anecdote",
          "Unproven",
        ],
        [
          "Optic nerve conditions",
          "Russian clinical use",
          "Approved indication, limited external data",
        ],
        ["Anxiety and mood", "Overlaps with Selank literature", "Weak for Semax specifically"],
      ],
    },
    paragraphs: [
      "The BDNF finding is the part of the Semax story with the clearest mechanistic support: a single intranasal dose measurably raises BDNF and TrkB expression in rat hippocampus within hours. Whether that translates into a meaningful cognitive effect in a healthy adult is a separate question, and it has not been answered by a controlled trial.",
    ],
  },
  {
    heading: "Formulations and dosing practice",
    paragraphs: [
      "The Russian pharmaceutical product is an intranasal solution at 0.1 percent or 1 percent, dosed as drops per nostril. Typical outpatient use is in the range of 200 to 600 mcg per day split across two or three administrations; acute stroke protocols in hospital use substantially higher amounts under supervision. N-acetyl Semax and N-acetyl Semax amidate are modified versions sold as research chemicals on claims of greater stability and potency, with no comparative human data supporting the claim.",
      "Research-chemical Semax arrives as a lyophilized powder in milligram vials and is reconstituted, then either dosed intranasally with a metered spray or, less commonly, injected subcutaneously. Intranasal is the route the clinical evidence used, which is a good reason to prefer it. Either way the powder-to-dose conversion is the same arithmetic as any other peptide.",
    ],
    steps: [
      "Note the vial strength — 5 mg and 10 mg vials are the most common.",
      "Reconstitute with bacteriostatic water; 5 mg in 2 mL gives 2.5 mg/mL, or 2,500 mcg per mL.",
      "For intranasal use, a metered spray delivering 0.1 mL per pump gives 250 mcg per pump at that concentration.",
      "Record the concentration and reconstitution date on the vial rather than relying on memory.",
      "Refrigerate the reconstituted solution and keep the dry powder frozen until you mix it.",
      "Start at the low end of the reported range and hold it for at least a week before judging anything.",
    ],
  },
  {
    heading: "Safety, side effects and who should avoid it",
    bullets: [
      "Reported side effects are mild and mostly local: nasal irritation, dryness or a brief burning sensation after intranasal dosing.",
      "Unlike its ACTH parent fragment, Semax does not stimulate cortisol release, which is the main reason it was developed in this form.",
      "Long-term safety at nootropic doses in healthy adults has not been studied. Russian data come from supervised treatment of specific conditions.",
      "No data in pregnancy, breastfeeding or people under 18 — avoid.",
      "Anyone on psychiatric medication, particularly antidepressants or stimulants, should involve their prescriber; Semax modulates dopaminergic and serotonergic systems and interaction data do not exist.",
      "Research-chemical supply carries the usual identity and purity risk. Semax is a short peptide and cheap to counterfeit convincingly.",
      "Legal status varies. Importing an unapproved medicine for personal use is not automatically permitted, and rules differ by country.",
    ],
  },
  {
    heading: "Buying Semax outside Russia",
    paragraphs: [
      "Two supply routes exist and they are not equivalent. Pharmacy-grade intranasal Semax manufactured in Russia is a regulated medicine with a real label; research-chemical powder from a peptide vendor is not. If you are considering the latter, insist on a batch-specific certificate of analysis from an independent lab with a lot number matching your vial, HPLC purity at or above 98 percent, and a mass spectrometry result consistent with the expected molecular weight — and confirm whether you are being sold plain Semax or one of the N-acetyl variants, since they are different molecules at different prices.",
      "Our supplier vetting checklist covers what a legitimate certificate of analysis contains and the red flags that should end the transaction.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "Dolotov OV, Karpenko EA, Inozemtseva LS, et al. Semax, an analogue of ACTH(4-10) with cognitive effects, regulates BDNF and trkB expression in the rat hippocampus. Brain Res. 2006;1117(1):54–60.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16963005/",
  },
  {
    cite: "Ashmarin IP, Nezavibatko VN, Levitskaya NG, et al. Design and investigation of an ACTH(4-10) analog lacking D-amino acids and hydrophobic radicals. Neurosci Res Commun. 1995;16(2):105–112.",
    url: "https://pubmed.ncbi.nlm.nih.gov/8848099/",
  },
  {
    cite: "Gusev EI, Skvortsova VI, Miasoedov NF, et al. Effectiveness of semax in acute period of hemispheric ischemic stroke: a clinical and electrophysiological study. Zh Nevrol Psikhiatr Im S S Korsakova. 1997;97(6):26–34.",
    url: "https://pubmed.ncbi.nlm.nih.gov/9264351/",
  },
  {
    cite: "Kaplan AY, Kochetova AG, Nezavibathko VN, et al. Synthetic ACTH analogue Semax displays nootropic-like activity in humans. Neurosci Res Commun. 1996;19(2):115–123.",
    url: "https://pubmed.ncbi.nlm.nih.gov/8891469/",
  },
  {
    cite: "Medvedeva EV, Dmitrieva VG, Povarova OV, et al. The peptide semax affects the expression of genes related to the immune and vascular systems in rat brain focal ischemia. Mol Biol (Mosk). 2014;48(3):415–422.",
    url: "https://pubmed.ncbi.nlm.nih.gov/25831896/",
  },
  {
    cite: "Shevchenko KV, Nagaev IY, Andreeva LA, et al. Stability of Semax in aqueous solutions and in blood. Bioorg Khim.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16637062/",
  },
];

export const Route = createFileRoute("/peptides/semax")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Semax",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="Semax peptides: uses, evidence and dosing"
      answer="Semax is a synthetic seven-amino-acid peptide derived from ACTH(4-10), prescribed intranasally in Russia for stroke recovery and cognitive impairment. It raises BDNF in the brain without raising cortisol. Outside Russia it is unapproved, sold as a research chemical, and its nootropic use is unsupported by controlled trials."
      callout={{
        title: "Approved in Russia, unapproved everywhere else",
        body: "Semax has decades of supervised clinical use in one regulatory system and almost no independent Western trial data. Research-chemical Semax is not the same product as the pharmacy intranasal solution the studies used. This page is reference material, not a protocol.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Intranasal doses are the easiest to lose count of",
        body: "DoseRoutine tracks multi-dose days, records the concentration you mixed so each spray's microgram value is written down, and charts your own focus or recovery notes against the days you actually dosed.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
