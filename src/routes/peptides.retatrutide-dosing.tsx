import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/retatrutide-dosing";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Retatrutide Dose and Dosing: What the Trials Actually Used";
const DESC =
  "Retatrutide dosing explained: the triple-agonist mechanism, escalation schedules used in phase 2 trials, side effects, and why it stays investigational.";

export const FAQ = [
  {
    q: "What is retatrutide?",
    a: "Retatrutide (LY3437943) is an investigational once-weekly injectable that activates three receptors at once: GIP, GLP-1 and glucagon. It is being developed by Eli Lilly for obesity and type 2 diabetes. As of 2026 it is not approved by the FDA, EMA or MHRA and is available only through clinical trials.",
  },
  {
    q: "What retatrutide doses were used in the trials?",
    a: "The phase 2 obesity trial randomised participants to maintenance doses of 1 mg, 4 mg, 8 mg or 12 mg once weekly, reached through gradual escalation from a low starting dose. The 4, 8 and 12 mg arms used different escalation speeds. These are trial doses under medical supervision, not a self-administration protocol.",
  },
  {
    q: "How is retatrutide dose escalated?",
    a: "In the phase 2 trial, escalation started at 2 mg weekly and stepped up at four-week intervals toward the assigned maintenance dose, with the higher arms taking longer to reach target. Slow escalation is standard for incretin drugs because gastrointestinal side effects are dose- and speed-dependent and are the main reason people stop treatment.",
  },
  {
    q: "How much weight did retatrutide produce in trials?",
    a: "In the 48-week phase 2 obesity trial published in the New England Journal of Medicine, mean weight reduction was approximately 24 percent at the 12 mg dose, compared with about 2 percent for placebo. This was a phase 2 result in a selected population; phase 3 trials are ongoing and are the studies that determine approval.",
  },
  {
    q: "What are retatrutide's side effects?",
    a: "The most frequent are gastrointestinal: nausea, diarrhea, vomiting and constipation, mostly mild to moderate and concentrated during dose escalation. Increased heart rate was observed at higher doses, and the glucagon component means metabolic parameters need monitoring. As with other incretin drugs, rapid weight loss carries risks of muscle loss and nutritional deficits.",
  },
  {
    q: "Is retatrutide legal to buy?",
    a: "No approved retatrutide product exists anywhere. Vials sold online are unapproved research chemicals of unverified identity, strength and sterility, sold outside any regulatory framework. Buying and injecting them means accepting an unknown substance at an unknown dose, without the monitoring the trials provided.",
  },
  {
    q: "How does retatrutide compare to tirzepatide and semaglutide?",
    a: "Semaglutide is a single GLP-1 agonist, tirzepatide is a dual GIP and GLP-1 agonist, and retatrutide adds glucagon-receptor agonism to those two. The glucagon component is thought to increase energy expenditure, which is the mechanistic explanation offered for the larger weight reductions seen in phase 2. Only semaglutide and tirzepatide are approved.",
  },
  {
    q: "When will retatrutide be approved?",
    a: "Phase 3 trials in obesity and related conditions have been running since 2024, with completion dates extending beyond 2026. Approval depends on those results and subsequent regulatory review, so no reliable date can be given. Anything stating a specific launch date is speculation.",
  },
];

const SECTIONS = [
  {
    heading: "What retatrutide is and why the mechanism matters",
    paragraphs: [
      "Retatrutide is a single molecule that activates three metabolic receptors. GLP-1 agonism slows gastric emptying and reduces appetite — the mechanism behind semaglutide. GIP agonism adds a second incretin pathway, as in tirzepatide. Glucagon-receptor agonism is the novel third component, and it works in the opposite direction to how glucagon is usually thought of in diabetes: at these doses it appears to increase energy expenditure and promote hepatic fat mobilisation.",
      "Combining an appetite-suppressing signal with an energy-expenditure signal in one weekly injection is the reason retatrutide's phase 2 results exceeded those of the approved incretin drugs. It is also why the safety picture is not simply assumed to match theirs.",
    ],
    table: {
      caption: "Retatrutide alongside the approved incretin drugs.",
      head: ["Drug", "Receptors", "Frequency", "Status"],
      rows: [
        ["Semaglutide", "GLP-1", "Weekly", "Approved (obesity, T2D)"],
        ["Tirzepatide", "GIP + GLP-1", "Weekly", "Approved (obesity, T2D)"],
        ["Retatrutide", "GIP + GLP-1 + glucagon", "Weekly", "Investigational — phase 3"],
      ],
    },
  },
  {
    heading: "The doses used in the phase 2 trial",
    paragraphs: [
      "The 48-week phase 2 obesity trial (Jastreboff et al., NEJM 2023) is the source of essentially every retatrutide dose figure in circulation. Participants were randomised to placebo or to one of several maintenance doses, reached by stepwise escalation rather than started outright.",
      "The table below reports what the trial did. It is not a protocol, and reproducing it outside a trial means doing so without the screening, monitoring, dietitian support and adverse-event management that were part of the study.",
    ],
    table: {
      caption:
        "Phase 2 obesity trial (NCT04881760) maintenance doses and reported outcomes at 48 weeks.",
      head: ["Arm", "Escalation approach", "Mean weight change"],
      rows: [
        ["Placebo", "—", "≈ −2%"],
        ["1 mg weekly", "Low fixed dose", "≈ −8%"],
        ["4 mg weekly", "From 2 mg, stepped every 4 weeks", "≈ −17%"],
        ["8 mg weekly", "From 2 or 4 mg, stepped every 4 weeks", "≈ −22–24%"],
        ["12 mg weekly", "From 2 mg, longer escalation", "≈ −24%"],
      ],
    },
  },
  {
    heading: "Why escalation is slow",
    paragraphs: [
      "Every incretin drug is titrated upward over weeks, and the reason is tolerability rather than efficacy. Nausea, vomiting and diarrhea cluster in the period immediately after each dose increase and settle as the gut adapts. Escalating faster does not accelerate results; it increases the chance of stopping altogether.",
      "The trial's four-week step interval reflects this. A dose that is intolerable this month is often tolerable next month at the same level, which is why holding a step rather than jumping is the standard clinical response.",
    ],
    bullets: [
      "Gastrointestinal effects are dose- and escalation-speed-dependent.",
      "Holding at the current step is the usual response to poor tolerance, not skipping ahead.",
      "Heart rate increases were observed at higher doses and warrant monitoring.",
      "Protein intake and resistance training matter, because rapid loss includes lean mass.",
      "Hydration and fiber address the constipation that often follows the initial nausea phase.",
    ],
  },
  {
    heading: "Safety, monitoring and contraindications",
    bullets: [
      "Most common adverse events in trials: nausea, diarrhea, vomiting, constipation — predominantly mild to moderate.",
      "Dose-dependent heart rate increase was reported at the higher maintenance doses.",
      "Incretin drugs as a class carry warnings around pancreatitis, gallbladder disease and, in rodents, thyroid C-cell tumours.",
      "Personal or family history of medullary thyroid carcinoma or MEN2 is a contraindication for approved drugs in this class.",
      "Not for use in pregnancy or breastfeeding.",
      "Rapid weight loss risks sarcopenia and micronutrient deficits without deliberate protein and resistance training.",
      "Retatrutide's long-term safety profile is genuinely unknown — phase 3 is where that is established.",
    ],
    paragraphs: [
      "Because there is no approved product, there is also no approved label, no pharmacist check, no lot traceability and no adverse-event reporting pathway for material bought online. Unapproved GLP-1-class vials sold as research chemicals have been the subject of repeated FDA warnings about dosing errors and hospitalisations, most involving people miscalculating doses from unlabeled or milligram-per-vial products.",
    ],
  },
  {
    heading: "Why the online supply is a different question from the drug",
    paragraphs: [
      "It is possible to think retatrutide is a promising drug and also to think buying it from a research-chemical vendor is a poor decision. Those are separate judgements. The trial data describe a characterised molecule at a verified dose given under supervision; a vial from an unregulated seller shares only the name.",
      "The specific failure mode regulators have flagged for this drug class is dosing arithmetic. Compounded and grey-market products are frequently supplied in milligrams per vial with no dose markings, and users convert to syringe units themselves. Errors of ten- and hundredfold have led to emergency admissions.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "Jastreboff AM, Kaplan LM, Frías JP, et al. Triple-hormone-receptor agonist retatrutide for obesity — a phase 2 trial. N Engl J Med. 2023;389(6):514–526.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37366315/",
  },
  {
    cite: "Rosenstock J, Frias J, Jastreboff AM, et al. Retatrutide in people with type 2 diabetes: a randomised, phase 2 trial. Lancet. 2023;402(10401):529–544.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37385280/",
  },
  {
    cite: "Coskun T, Urva S, Roell WC, et al. LY3437943, a novel triple GIP, GLP-1 and glucagon receptor agonist. Cell Metab. 2022;34(9):1234–1247.",
    url: "https://pubmed.ncbi.nlm.nih.gov/36027903/",
  },
  {
    cite: "U.S. Food and Drug Administration. FDA warns consumers not to use compounded and unapproved GLP-1 drugs; reports of dosing errors and adverse events.",
    url: "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/medications-containing-semaglutide-marketed-type-2-diabetes-or-weight-loss",
  },
  {
    cite: "ClinicalTrials.gov. NCT04881760 — A study of retatrutide (LY3437943) in participants with obesity.",
    url: "https://clinicaltrials.gov/study/NCT04881760",
  },
  {
    cite: "European Medicines Agency. Register of approved medicines — no marketing authorisation exists for retatrutide.",
    url: "https://www.ema.europa.eu/en/medicines",
  },
];

export const Route = createFileRoute("/peptides/retatrutide-dosing")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Retatrutide dosing",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="Retatrutide dose and dosing: what the trials used"
      answer="Retatrutide is an investigational once-weekly triple agonist of the GIP, GLP-1 and glucagon receptors. Its phase 2 obesity trial used maintenance doses of 1, 4, 8 and 12 mg weekly, reached by stepping up from 2 mg at four-week intervals, and reported roughly 24 percent mean weight reduction at 12 mg over 48 weeks. It is not approved anywhere, and no verified product is legally available outside a clinical trial."
      callout={{
        title: "Investigational — there is no approved retatrutide",
        body: "Every dose figure here is what a supervised clinical trial administered, not a self-dosing protocol. Vials sold online are unapproved products of unverified strength, and the FDA has warned about hospitalisations from dosing errors with grey-market drugs in this class. This page is reference material, not medical advice.",
      }}
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Weekly injections are easy to lose track of",
        body: "DoseRoutine tracks a weekly dosing day, records each titration step and the date you moved up, and charts weight and side-effect notes against the dose you were actually on at the time.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
