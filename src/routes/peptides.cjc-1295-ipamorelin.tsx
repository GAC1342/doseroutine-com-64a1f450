import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/cjc-1295-ipamorelin";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "CJC-1295 and Ipamorelin: Mechanism, Evidence, Safety";
const DESC =
  "What CJC-1295 and ipamorelin are, why they are stacked, what the human evidence shows, side effects, and their unapproved regulatory status.";

export const FAQ = [
  {
    q: "What are CJC-1295 and ipamorelin?",
    a: "CJC-1295 is a synthetic analogue of growth hormone-releasing hormone that stimulates the pituitary to release growth hormone. Ipamorelin is a selective growth hormone secretagogue that acts on the ghrelin receptor to do the same thing through a different pathway. Neither is approved by the FDA or EMA for human use.",
  },
  {
    q: "Why are CJC-1295 and ipamorelin used together?",
    a: "They act on two separate pituitary receptors, so combining them produces a larger growth hormone pulse than either alone. CJC-1295 raises the amplitude of the pulse via the GHRH receptor while ipamorelin triggers release via the ghrelin receptor and suppresses somatostatin, the brake on GH release. This complementary mechanism is the rationale for the stack; it is a pharmacological argument, not a demonstrated clinical outcome.",
  },
  {
    q: "What is the difference between CJC-1295 with and without DAC?",
    a: "DAC stands for Drug Affinity Complex, a chemical modification that binds the peptide to serum albumin and extends its half-life from around 30 minutes to roughly six to eight days. Without DAC — often labeled modified GRF(1-29) or CJC-1295 no-DAC — the effect is short, producing a discrete pulse. With DAC it produces a sustained elevation, which is pharmacologically very different from the body's natural pulsatile GH pattern.",
  },
  {
    q: "Does ipamorelin raise cortisol or prolactin?",
    a: "Ipamorelin was characterised in preclinical work as the first selective GH secretagogue, releasing growth hormone without meaningful increases in cortisol, prolactin or ACTH at the doses tested. That selectivity is what distinguished it from earlier compounds such as GHRP-6 and GHRP-2. Human data remain limited.",
  },
  {
    q: "Are CJC-1295 and ipamorelin legal?",
    a: "Neither is an approved drug in the US, UK, EU or Australia. In 2023 the FDA placed both on its list of bulk drug substances that present significant safety risks for compounding, effectively removing the compounding-pharmacy route in the US. They are sold as research chemicals not intended for human use, and both are prohibited at all times under the World Anti-Doping Agency code.",
  },
  {
    q: "What are the side effects?",
    a: "Reported effects include injection-site reactions, flushing, headache, water retention, numbness or tingling in the hands, and increased hunger with ghrelin-receptor agonists. Sustained elevation of growth hormone and IGF-1 raises theoretical concerns about insulin resistance, joint pain, carpal tunnel syndrome and tissue growth. Long-term safety data in healthy adults do not exist.",
  },
  {
    q: "Who should avoid these peptides?",
    a: "Anyone with an active or historical malignancy, since GH and IGF-1 are growth-promoting; anyone with diabetes or impaired glucose tolerance, given the effect on insulin sensitivity; anyone pregnant or breastfeeding; children and adolescents, whose growth plates are open; and competitive athletes subject to anti-doping testing.",
  },
  {
    q: "How are they dosed?",
    a: "Because neither compound is approved, there is no established human dosing regimen — only figures circulating from research settings and community use. Anyone considering them should work with a licensed clinician rather than a forum protocol, and should be aware that the underlying evidence base for the stack in healthy adults is essentially absent.",
  },
];

const SECTIONS = [
  {
    heading: "What each compound is",
    paragraphs: [
      "Growth hormone release from the pituitary is governed by two opposing signals: growth hormone-releasing hormone, which stimulates it, and somatostatin, which suppresses it. Ghrelin, best known as a hunger hormone, provides a third input that also drives GH release. CJC-1295 and ipamorelin each target one of these levers.",
      "CJC-1295 is a modified 29-amino-acid analogue of GHRH. The substitutions protect it from the enzyme that rapidly degrades natural GHRH, so it survives long enough to produce a meaningful signal. Ipamorelin is a pentapeptide that binds the growth hormone secretagogue receptor — the ghrelin receptor — and was developed specifically to trigger GH release without the cortisol and prolactin spillover seen with earlier secretagogues.",
    ],
    table: {
      caption: "Side-by-side comparison of the two compounds.",
      head: ["", "CJC-1295 (no DAC)", "CJC-1295 with DAC", "Ipamorelin"],
      rows: [
        [
          "Class",
          "GHRH analogue",
          "GHRH analogue, albumin-bound",
          "GH secretagogue (ghrelin receptor)",
        ],
        ["Receptor", "GHRH receptor", "GHRH receptor", "GHS-R1a"],
        ["Approximate half-life", "~30 minutes", "~6–8 days", "~2 hours"],
        ["Effect pattern", "Discrete pulse", "Sustained elevation", "Discrete pulse"],
        [
          "Cortisol / prolactin",
          "No meaningful rise",
          "No meaningful rise",
          "Selective — no meaningful rise",
        ],
        ["Regulatory status", "Unapproved", "Unapproved", "Unapproved"],
      ],
    },
  },
  {
    heading: "Why they are stacked",
    paragraphs: [
      "The combination rationale is receptor complementarity. A GHRH analogue increases how much growth hormone the pituitary releases when it fires. A ghrelin-receptor agonist makes it fire and simultaneously blunts somatostatin's inhibitory tone. Acting together, the two produce a larger pulse than the sum of either given alone in the preclinical literature.",
      "It is worth being precise about what that does and does not establish. Synergy at the level of hormone release is well documented. Whether a larger GH pulse in a healthy adult translates into the outcomes people pursue — body composition change, recovery, sleep quality, skin or joint improvement — has not been demonstrated in controlled human trials of this combination.",
    ],
  },
  {
    heading: "What the human evidence shows",
    table: {
      caption: "Evidence base by claim.",
      head: ["Claim", "Evidence", "Strength"],
      rows: [
        [
          "CJC-1295 raises GH and IGF-1 in humans",
          "Phase 1 dose-escalation studies in healthy adults showed sustained increases",
          "Moderate — small, short, industry-run",
        ],
        [
          "Ipamorelin selectively releases GH",
          "Preclinical characterisation and early human work",
          "Moderate for release; limited human data",
        ],
        [
          "The combination increases GH more than either alone",
          "Preclinical and mechanistic studies",
          "Reasonable mechanism, limited human confirmation",
        ],
        [
          "Improves body composition in healthy adults",
          "No controlled trials of the combination",
          "Absent",
        ],
        ["Improves sleep quality or recovery", "Anecdotal reports only", "Absent"],
        [
          "Anti-ageing or longevity benefit",
          "No supporting trial evidence; GH excess has known harms",
          "Absent, with contrary signals",
        ],
        ["Long-term safety in healthy adults", "Not studied", "Absent"],
      ],
    },
    paragraphs: [
      "The honest summary is that the pharmacology is real and reasonably well characterised, while the clinical outcomes people buy these compounds for are not. Trials of CJC-1295 were early-phase and stopped; the compound was never brought to approval.",
    ],
  },
  {
    heading: "Safety, side effects and contraindications",
    bullets: [
      "Common and generally mild: injection-site redness or itching, flushing, headache, transient dizziness.",
      "Fluid retention, joint aches and carpal-tunnel-type numbness are classic growth-hormone-excess effects and are dose-related.",
      "Ghrelin-receptor agonism increases appetite; ipamorelin does so less than GHRP-6 but not zero.",
      "Insulin resistance and raised fasting glucose are a recognized consequence of sustained GH elevation.",
      "Contraindicated with any active or prior malignancy — GH and IGF-1 promote cell proliferation.",
      "Avoid in diabetes or prediabetes without specialist supervision.",
      "Avoid in pregnancy, breastfeeding, and in anyone under 18.",
      "Prohibited at all times in sport under the WADA code; both classes are explicitly listed.",
      "Product identity risk is significant: independent testing of research-chemical peptides has repeatedly found off-label content, wrong compounds and contamination.",
    ],
    paragraphs: [
      "The FDA's 2023 review categorized both compounds as bulk substances raising significant safety concerns for compounded use, citing immunogenicity, peptide-related impurities and inadequate characterisation. That is a regulatory judgment about the substance itself, separate from any individual supplier's quality.",
    ],
  },
  {
    heading: "Practical considerations if a clinician has prescribed them",
    bullets: [
      "Both arrive lyophilized and must be reconstituted with bacteriostatic water before use.",
      "Doses are in micrograms; label errors between mg and mcg are a thousandfold and the main acute risk.",
      "Write the concentration on each vial — a stack means two vials with different strengths open at once.",
      "Refrigerate reconstituted vials, keep them out of light, and do not freeze unless the documentation allows it.",
      "Baseline and follow-up IGF-1 and fasting glucose are the standard monitoring a prescribing clinician would order.",
      "Record what you took and when. With two compounds, two vials and a nightly schedule, memory is not a log.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "Teichman SL, Neale A, Lawrence B, et al. Prolonged stimulation of growth hormone and insulin-like growth factor I secretion by CJC-1295, a long-acting analog of GHRH, in healthy adults. J Clin Endocrinol Metab. 2006;91(3):799–805.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16352683/",
  },
  {
    cite: "Raun K, Hansen BS, Johansen NL, et al. Ipamorelin, the first selective growth hormone secretagogue. Eur J Endocrinol. 1998;139(5):552–561.",
    url: "https://pubmed.ncbi.nlm.nih.gov/9849822/",
  },
  {
    cite: "U.S. Food and Drug Administration. Certain bulk drug substances for use in compounding that raise significant safety risks (includes CJC-1295 and ipamorelin).",
    url: "https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-raise-significant-safety-risks",
  },
  {
    cite: "Sigalos JT, Pastuszak AW. The safety and efficacy of growth hormone secretagogues. Sex Med Rev. 2018;6(1):45–53.",
    url: "https://pubmed.ncbi.nlm.nih.gov/28596080/",
  },
  {
    cite: "World Anti-Doping Agency. Prohibited List — S2 Peptide Hormones, Growth Factors, Related Substances and Mimetics.",
    url: "https://www.wada-ama.org/en/prohibited-list",
  },
  {
    cite: "Melmed S. Pathogenesis and diagnosis of growth hormone deficiency and excess in adults. N Engl J Med. 2019;380:2551–2562.",
    url: "https://pubmed.ncbi.nlm.nih.gov/31242363/",
  },
];

export const Route = createFileRoute("/peptides/cjc-1295-ipamorelin")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "CJC-1295 and ipamorelin",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="CJC-1295 and ipamorelin: mechanism, evidence and safety"
      answer="CJC-1295 is a GHRH analogue and ipamorelin is a selective ghrelin-receptor growth hormone secretagogue. They are stacked because they raise growth hormone through two complementary pituitary pathways. Both are unapproved for human use, both appear on the FDA's list of bulk substances raising significant safety risks for compounding, and neither has controlled human trials supporting the body-composition or anti-ageing claims made for the combination."
      callout={{
        title: "Unapproved, and prohibited in sport",
        body: "Neither compound is approved by the FDA or EMA. Both are banned at all times under the WADA code, and research-chemical supply carries real identity and purity risk. This page is reference material, not a protocol or medical advice.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Two vials, two concentrations, one schedule",
        body: "DoseRoutine records each vial's strength and diluent volume separately, converts both doses into syringe units, and keeps the timing of a stacked evening protocol in one log with your own sleep and recovery notes alongside it.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
