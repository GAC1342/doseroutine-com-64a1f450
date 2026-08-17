import { createFileRoute, Link } from "@tanstack/react-router";
import { ResponsiveImage } from "@/components/responsive-image";
import {
  ArrowRight,
  ShieldAlert,
  Info,
  Activity,
  Moon,
  Utensils,
  CheckCircle2,
  XCircle,
  Thermometer,
  ClipboardList,
  Clock,
} from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { Card } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { InlineSignupButton } from "@/components/inline-signup-button";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";

const CANONICAL = "https://doseroutine.com/library/cjc-1295-ipamorelin";
const OG_IMAGE = "https://doseroutine.com/og/cjc-1295-ipamorelin.jpg";
const TITLE = "CJC-1295 with Ipamorelin: Dosing & Timing | DoseRoutine";
const DESC = withDoseRoutineDescriptionSuffix(
  "CJC-1295 and ipamorelin explained: DAC vs no-DAC, dosing, timing, reconstitution maths and risks",
);
const REVIEWED = "2026-08-02";

const TOC = [
  { id: "what-it-is", label: "What the pair is" },
  { id: "why-combined", label: "Why they're combined" },
  { id: "dac", label: "DAC vs no-DAC" },
  { id: "dosing", label: "Dosing in the literature" },
  { id: "timing", label: "Timing & the fasting rule" },
  { id: "reconstitution", label: "Reconstitution maths" },
  { id: "timeline", label: "What changes, and when" },
  { id: "expectations", label: "Realistic expectations" },
  { id: "side-effects", label: "Side effects & management" },
  { id: "monitoring", label: "Monitoring checklist" },
  { id: "avoid", label: "Who should avoid it" },
  { id: "alternatives", label: "vs other secretagogues" },
  { id: "sourcing", label: "Legality, sport & sourcing" },
  { id: "storage", label: "Storage & handling" },
  { id: "mistakes", label: "Common mistakes" },
  { id: "faq", label: "FAQ" },
  { id: "references", label: "References" },
];

// Approximate pharmacokinetics as reported in the published human and preclinical
// literature. Ranges, not guarantees — assay methods differ between studies.
const PK = [
  {
    agent: "CJC-1295 with DAC",
    cls: "GHRH analogue (drug affinity complex)",
    half: "~5.8–8 days",
    effect: "Elevated GH and IGF-1 for up to 6–11 days after a single dose",
  },
  {
    agent: "CJC-1295 no-DAC (Mod GRF 1-29 / tesamorelin-like fragment)",
    cls: "GHRH analogue, unbound",
    half: "~30 minutes",
    effect: "One sharp GH pulse per injection, then back to baseline",
  },
  {
    agent: "Ipamorelin",
    cls: "Selective ghrelin-receptor agonist (GHRP)",
    half: "~2 hours",
    effect: "Amplifies the pulse; minimal cortisol, prolactin or hunger effect",
  },
];

const DOSES = [
  {
    protocol: "No-DAC pairing (most common)",
    dose: "100 mcg CJC-1295 no-DAC + 100 mcg ipamorelin",
    freq: "1–3× daily, subcutaneous",
    note: "≈1 mcg/kg is the commonly cited saturation point — more per injection mostly adds side effects, not GH",
  },
  {
    protocol: "Single bedtime dose",
    dose: "100 mcg + 100 mcg",
    freq: "Once nightly, empty stomach",
    note: "Rides the natural night-time GH pulse; the lowest-burden version of the protocol",
  },
  {
    protocol: "DAC version",
    dose: "1–2 mg CJC-1295 DAC + 100–300 mcg ipamorelin",
    freq: "CJC once or twice weekly; ipamorelin daily",
    note: "Produces a continuous GH 'bleed' rather than pulses — the main pharmacological criticism of DAC",
  },
  {
    protocol: "Cycle length seen in practice",
    dose: "—",
    freq: "8–12 weeks, then a break",
    note: "No controlled human data defines an optimal cycle; long-term dosing has never been studied",
  },
];

const TIMING = [
  {
    icon: Moon,
    title: "Bedtime is the highest-value slot",
    text: "The largest natural GH pulse occurs in the first hours of slow-wave sleep. Injecting 30–60 minutes before bed stacks on top of that pulse rather than fighting it.",
  },
  {
    icon: Utensils,
    title: "Fasted — carbs and fat blunt it",
    text: "Insulin and free fatty acids suppress GH release. The convention is no food for about 2 hours before and 30–45 minutes after. A carb-heavy meal beforehand measurably flattens the pulse.",
  },
  {
    icon: Activity,
    title: "Post-training is second best",
    text: "Exercise raises endogenous GH on its own. Some protocols use a post-workout dose, though eating quickly after training conflicts with the fasting rule.",
  },
  {
    icon: Clock,
    title: "Spacing matters more than total",
    text: "Pulsatility is the point. Doses are spaced roughly 3+ hours apart so somatostatin feedback can reset between them; clustering them wastes the second injection.",
  },
];

const RECON_ROWS = [
  { vial: "2 mg", bac: "2 mL", conc: "1000 mcg/mL", unit: "100 mcg = 0.10 mL = 10 units" },
  { vial: "5 mg", bac: "2 mL", conc: "2500 mcg/mL", unit: "100 mcg = 0.04 mL = 4 units" },
  { vial: "5 mg", bac: "5 mL", conc: "1000 mcg/mL", unit: "100 mcg = 0.10 mL = 10 units" },
  { vial: "10 mg", bac: "5 mL", conc: "2000 mcg/mL", unit: "100 mcg = 0.05 mL = 5 units" },
];

const RECON_STEPS = [
  {
    name: "Do the arithmetic before you touch the vial",
    text: "Concentration in mcg per mL equals vial strength in micrograms divided by the millilitres of bacteriostatic water added. A 5 mg (5000 mcg) vial with 5 mL of water gives 1000 mcg/mL, which makes a 100 mcg dose exactly 10 units on a U-100 syringe.",
  },
  {
    name: "Choose a concentration you can actually measure",
    text: "At 2500 mcg/mL a 100 mcg dose is 4 units — a tiny, error-prone volume. Diluting to 1000 mcg/mL so the dose lands near 10 units cuts measurement error dramatically.",
  },
  {
    name: "Swab both stoppers",
    text: "Wipe the rubber stopper of the peptide vial and the bacteriostatic water vial with alcohol and let them air dry on a clean, uncluttered surface.",
  },
  {
    name: "Run the water down the vial wall",
    text: "Insert the needle at an angle and let the bacteriostatic water trickle slowly down the inside glass wall. Never spray it directly onto the lyophilised cake — physical force degrades the peptide.",
  },
  {
    name: "Swirl, never shake",
    text: "Roll the vial gently between your fingers until the solution is completely clear. Shaking foams the solution and can denature the peptide. Discard anything cloudy or containing particles.",
  },
  {
    name: "Label and refrigerate",
    text: "Write the concentration and mix date on the vial and store at 2–8 °C. Bacteriostatic water carries a beyond-use window of roughly 28 days once punctured.",
  },
  {
    name: "Convert the dose to syringe units",
    text: "Volume in mL equals dose in micrograms divided by concentration in micrograms per mL; a U-100 insulin syringe has 100 units per mL, so multiply the millilitres by 100 to get units.",
  },
];

const TIMELINE = [
  {
    phase: "Nights 1–7",
    body: "Sleep depth is the first thing most people notice — often within the first two or three nights. A flushing, warm or tingling sensation for a few minutes after injection is common and reflects the GH pulse. Body composition has not changed yet.",
  },
  {
    phase: "Weeks 2–4",
    body: "Water retention, mild puffiness in the hands and face, and better recovery between training sessions. IGF-1 drawn now gives the first objective signal that anything is actually happening.",
  },
  {
    phase: "Weeks 4–8",
    body: "Where connective-tissue and recovery reports cluster, alongside modest changes in skin and body composition. Any strength or size change over this window is far more attributable to training and protein than to the peptides.",
  },
  {
    phase: "Weeks 8–12",
    body: "Receptor desensitisation is the standard concern with continuous ghrelin-receptor stimulation, which is why cycles are typically bounded here. Fasting glucose is worth rechecking before deciding to continue.",
  },
];

const SIDE_EFFECTS = [
  {
    effect: "Water retention / puffiness",
    when: "First 1–3 weeks, dose-dependent",
    manage: "Usually settles; persistent oedema means the dose is too high",
  },
  {
    effect: "Tingling or numb hands (carpal-tunnel type)",
    when: "Higher doses, cumulative",
    manage: "A classic GH-excess sign — reduce the dose; ongoing symptoms mean stop",
  },
  {
    effect: "Head rush / flushing after injection",
    when: "Minutes after dosing",
    manage: "Expected with a strong pulse; lie down for a few minutes if pronounced",
  },
  {
    effect: "Lethargy or grogginess",
    when: "Mornings, early in a cycle",
    manage: "Often over-dosing at night; drop to a single 100 mcg bedtime dose",
  },
  {
    effect: "Raised fasting glucose / insulin resistance",
    when: "Sustained elevated GH",
    manage: "Test fasting glucose and HbA1c; the main metabolic risk of the protocol",
  },
  {
    effect: "Injection-site redness or itching",
    when: "Anytime",
    manage: "Rotate sites, use fresh needles, let alcohol dry fully first",
  },
  {
    effect: "Increased appetite",
    when: "Ipamorelin, usually mild",
    manage:
      "Far weaker than GHRP-6 or GHRP-2; if hunger is severe, the product may not be what it claims",
  },
  {
    effect: "Vivid dreams / disrupted sleep",
    when: "Bedtime dosing",
    manage: "Move the dose earlier in the evening",
  },
];

const MONITORING = [
  "IGF-1 at baseline and again at 4–6 weeks — the single most informative marker",
  "Fasting glucose and HbA1c at baseline and every 8–12 weeks",
  "Fasting insulin if glucose drifts upward",
  "Blood pressure and any hand/wrist tingling, weekly",
  "Body composition or at minimum waist, weight and key lifts, monthly",
  "Sleep quality logged subjectively — it is the earliest signal either way",
  "Thyroid panel if energy drops, since GH axis changes can affect T4 to T3 conversion",
];

const AVOID = [
  "Any active or prior malignancy — GH and IGF-1 are growth signals",
  "Diabetes or established insulin resistance without physician supervision",
  "Pregnancy, breastfeeding or planning pregnancy",
  "Under 25 with open growth plates, or any unsupervised adolescent use",
  "Untreated proliferative retinopathy",
  "Diagnosed pituitary tumour or a history of acromegaly",
  "Tested athletes — GHRH analogues and GHRPs are prohibited at all times by WADA",
];

const ALTERNATIVES = [
  {
    name: "Ipamorelin alone",
    detail:
      "Still raises GH, but without the GHRH side you lose most of the synergy. Cleaner and lower-risk, correspondingly less effect.",
  },
  {
    name: "GHRP-2 / GHRP-6",
    detail:
      "Stronger GH release than ipamorelin, but both meaningfully raise cortisol and prolactin, and GHRP-6 causes intense hunger. Ipamorelin was specifically developed to avoid that.",
  },
  {
    name: "Hexarelin",
    detail:
      "The most potent of the GHRPs and the fastest to desensitise, with clearer cortisol and prolactin elevation. Short cycles only.",
  },
  {
    name: "Tesamorelin",
    detail:
      "An actually approved GHRH analogue (for HIV-associated lipodystrophy) with real trial data. Prescription-only, and the closest regulated comparator to the CJC side of this pair.",
  },
  {
    name: "Recombinant HGH",
    detail:
      "Direct exogenous growth hormone. Far more powerful and far more suppressive of natural production, prescription-only, and with a much larger side-effect profile.",
  },
  {
    name: "MK-677 (ibutamoren)",
    detail:
      "Oral, long-acting ghrelin-receptor agonist. No injections, but sustained elevation, strong appetite stimulation and the clearest insulin-resistance signal of the group.",
  },
];

const MISTAKES = [
  "Dosing above roughly 1 mcg/kg per injection expecting a bigger pulse — the receptor response saturates, the side effects do not",
  "Injecting after a meal, which blunts the pulse insulin was already suppressing",
  "Stacking two injections a couple of hours apart, so the second lands in a somatostatin trough",
  "Choosing a concentration where the dose is 3–4 syringe units, guaranteeing measurement error",
  "Judging a cycle on scale weight in week two, when the change is mostly water",
  "Running it continuously for months without an IGF-1 or fasting-glucose test",
  "Assuming DAC and no-DAC are interchangeable — they need completely different schedules",
  "Shaking the vial, freezing reconstituted solution, or using a vial past the bacteriostatic-water window",
];

const FAQS = [
  {
    q: "What is CJC-1295 with ipamorelin?",
    a: "It is a pairing of two research peptides that raise growth hormone through different receptors. CJC-1295 is a growth-hormone-releasing hormone (GHRH) analogue that increases the size of a GH pulse; ipamorelin is a selective ghrelin-receptor agonist (a GHRP) that triggers pulses and blunts somatostatin, the brake on GH release. Used together they raise GH more than either does alone. Neither is an approved medicine for this purpose.",
  },
  {
    q: "Why are CJC-1295 and ipamorelin used together?",
    a: "They act on separate pathways that reinforce each other. GHRH analogues increase the amplitude of a pulse, GHRPs increase pulse frequency and suppress somatostatin inhibition. Because the limiting factor for a GHRH analogue is somatostatin tone, adding a GHRP removes that ceiling — which is why combined GHRH plus GHRP dosing produces a larger GH release than the sum of the two given separately.",
  },
  {
    q: "What is the difference between CJC-1295 with DAC and without DAC?",
    a: "DAC (drug affinity complex) is a linker that binds the peptide to serum albumin, extending its half-life from roughly 30 minutes to about 6–8 days. With DAC you get continuously elevated GH from once- or twice-weekly injections; without DAC (often sold as Mod GRF 1-29) you get one sharp pulse per injection. The pharmacological criticism of DAC is that a constant GH 'bleed' does not mimic natural pulsatile secretion, and pulsatility appears to matter for how tissues respond.",
  },
  {
    q: "What doses appear in the literature and in practice?",
    a: "The most commonly described pairing is 100 mcg of CJC-1295 no-DAC with 100 mcg of ipamorelin per injection, one to three times daily. That reflects the widely cited saturation point of roughly 1 mcg per kg of body weight — beyond it, GH response plateaus while side effects keep climbing. DAC protocols instead use 1–2 mg of CJC-1295 weekly with daily ipamorelin. None of these are approved dosing recommendations; the published human CJC-1295 studies used single doses in a research setting.",
  },
  {
    q: "When should you inject it?",
    a: "Before bed on an empty stomach is the conventional slot, because the largest natural GH pulse occurs in early slow-wave sleep and dosing on top of it compounds the effect. Food matters: insulin and circulating fatty acids suppress GH, so the convention is no food for about two hours before and 30–45 minutes after. When multiple daily doses are used they are spaced at least three hours apart so somatostatin feedback resets between them.",
  },
  {
    q: "Do you really have to fast around the injection?",
    a: "The fasting rule is not folklore — insulin is a direct suppressor of growth hormone release, and elevated free fatty acids blunt the somatotroph response as well. A carbohydrate-heavy meal shortly before dosing measurably reduces the resulting pulse. The practical version is a two-hour gap before and about 30–45 minutes after, with the bedtime dose being easiest to arrange.",
  },
  {
    q: "How do you reconstitute and dose CJC-1295 and ipamorelin?",
    a: "Both arrive as lyophilised powder and are reconstituted with bacteriostatic water. Concentration in mcg/mL equals vial strength in micrograms divided by millilitres of water added, so a 5 mg vial with 5 mL gives 1000 mcg/mL and a 100 mcg dose is 0.1 mL — 10 units on a U-100 insulin syringe. Choosing a dilution that puts the dose near 10 units rather than 3 or 4 substantially reduces measurement error.",
  },
  {
    q: "How long until you notice anything?",
    a: "Deeper sleep is usually the first reported change, often within the first few nights. Water retention and improved recovery tend to appear in weeks two to four. Any body-composition or connective-tissue change is a multi-week to multi-month process, and in the first fortnight scale weight moves mostly because of fluid rather than tissue.",
  },
  {
    q: "Will CJC-1295 with ipamorelin build muscle?",
    a: "Not the way anabolic steroids or exogenous HGH do. Raising GH within physiological range improves recovery, sleep and body composition at the margins; it does not override training and protein intake. Trials of GH secretagogues have generally shown increases in lean body mass with limited or inconsistent gains in strength — some of that lean mass is fluid. Expect a modest assist, not a transformation.",
  },
  {
    q: "What are the side effects?",
    a: "Most commonly water retention and puffiness, a flushing or head-rush sensation after injection, tingling or numbness in the hands at higher doses, grogginess, vivid dreams and injection-site irritation. The metabolic concern that matters most is reduced insulin sensitivity and rising fasting glucose with sustained elevated GH. Ipamorelin is selective, so unlike GHRP-6 and GHRP-2 it causes little cortisol, prolactin or hunger response.",
  },
  {
    q: "Does ipamorelin raise cortisol or prolactin?",
    a: "Barely, and that selectivity is the whole reason it exists. In the original characterisation work ipamorelin released growth hormone with a potency comparable to GHRP-6 but without the accompanying ACTH and cortisol release that the earlier secretagogues produced. That is also why it does not cause the ravenous hunger GHRP-6 is known for.",
  },
  {
    q: "How long should a cycle run?",
    a: "Protocols in circulation typically run 8–12 weeks with a break afterwards, on the reasoning that continuous ghrelin-receptor stimulation risks desensitisation and that sustained GH elevation drifts toward insulin resistance. There is no controlled human data establishing an optimal cycle length, duration or long-term safety — the honest answer is that nobody has studied it properly.",
  },
  {
    q: "Does it suppress your own growth hormone production?",
    a: "Secretagogues work by stimulating the pituitary rather than replacing its output, so they do not shut down the axis the way exogenous HGH does. Feedback is still real, though: IGF-1 and somatostatin rise in response to elevated GH, which is part of why receptor desensitisation and diminishing returns are described over long uninterrupted runs.",
  },
  {
    q: "What should you monitor?",
    a: "IGF-1 at baseline and around week four to six is the most informative single test — it tells you whether the product is doing anything at all. Add fasting glucose and HbA1c, since insulin resistance is the primary metabolic risk, plus blood pressure and any hand or wrist tingling. Anyone using unapproved compounds should be doing this with a physician who knows about it.",
  },
  {
    q: "Is CJC-1295 with ipamorelin legal?",
    a: "Neither is an FDA-approved drug for this use. In 2023 the FDA moved a group of peptides including ipamorelin and CJC-1295 into the category of bulk substances that compounding pharmacies may not use, citing insufficient safety evidence and immunogenicity concerns, which removed the main legitimate US supply route. Vials sold online carry 'research use only' labelling, which is a legal shield rather than a quality guarantee.",
  },
  {
    q: "Is it banned in sport?",
    a: "Yes. GHRH analogues such as CJC-1295 and growth-hormone secretagogues such as ipamorelin are both on the WADA Prohibited List under the peptide hormones and growth factors category, prohibited at all times, in and out of competition.",
  },
  {
    q: "What if you miss a dose?",
    a: "For the short-acting no-DAC pairing, skip it and resume the next scheduled injection — the peptide clears in well under an hour and there is nothing to catch up on. Never double a dose. For weekly DAC dosing, a missed injection is usually taken when remembered, since blood levels decline over days rather than hours.",
  },
  {
    q: "How should the vials be stored?",
    a: "Lyophilised powder is stable refrigerated and should be kept cold, dark and dry. Once reconstituted with bacteriostatic water, store at 2–8 °C, never freeze, and respect the roughly 28-day beyond-use window of the bacteriostatic water. Discard any solution that turns cloudy, discoloured or shows particles.",
  },
];

const REFS = [
  {
    cite: "Teixeira Ionescu M, Frohman LA, et al. Sustained growth hormone (GH) and insulin-like growth factor I responses to single doses of the GH-releasing hormone analogue CJC-1295 in healthy adults. J Clin Endocrinol Metab. 2005;90(8):4792–4797.",
    url: "https://pubmed.ncbi.nlm.nih.gov/15827104/",
  },
  {
    cite: "Teixeira Ionescu M, Frohman LA. Pulsatile secretion of growth hormone (GH) persists during continuous stimulation by CJC-1295, a long-acting GH-releasing hormone analog. J Clin Endocrinol Metab. 2006;91(12):4792–4797.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16352683/",
  },
  {
    cite: "Raun K, Hansen BS, Johansen NL, et al. Ipamorelin, the first selective growth hormone secretagogue. Eur J Endocrinol. 1998;139(5):552–561.",
    url: "https://pubmed.ncbi.nlm.nih.gov/9849822/",
  },
  {
    cite: "Sinha DK, Balasubramanian A, Tatem AJ, et al. Beyond the androgen receptor: the role of growth hormone secretagogues in the modern management of body composition in hypogonadal males. Transl Androl Urol. 2018;7(Suppl 1):S178–S188.",
    url: "https://pubmed.ncbi.nlm.nih.gov/29644184/",
  },
  {
    cite: "U.S. Food and Drug Administration. Human Drug Compounding — bulk drug substances that raise significant safety risks (category 2), including ipamorelin and CJC-1295.",
    url: "https://www.fda.gov/drugs/human-drug-compounding",
  },
  {
    cite: "World Anti-Doping Agency. Prohibited List — S2 Peptide Hormones, Growth Factors, Related Substances and Mimetics (growth hormone secretagogues and GHRH analogues).",
    url: "https://www.wada-ama.org/en/prohibited-list",
  },
];

export const Route = createFileRoute("/library/cjc-1295-ipamorelin")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "author", content: "DoseRoutine" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "Two lyophilised peptide vials, a U-100 insulin syringe, bacteriostatic water and an alcohol swab on a light surface — DoseRoutine",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "CJC-1295 and ipamorelin vials with a U-100 insulin syringe and bacteriostatic water — DoseRoutine" },
      ...ogLocaleMeta("en"),
    ],
    links: [
      // Preload the LCP hero so it starts downloading with the HTML, not after
      // React hydrates. imagesrcset/imagesizes must mirror the <picture> above.
      {
        rel: "preload",
        as: "image",
        href: "/og/cjc-1295-ipamorelin-960.webp",
        imageSrcSet:
          "/og/cjc-1295-ipamorelin-640.webp 640w, /og/cjc-1295-ipamorelin-960.webp 960w, /og/cjc-1295-ipamorelin-1200.webp 1200w",
        imageSizes: "(min-width: 768px) 768px, 100vw",
        type: "image/webp",
        fetchPriority: "high",
      },
      { rel: "canonical", href: CANONICAL },
      ...hreflangLinks("/library/cjc-1295-ipamorelin"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
          },
          headline: TITLE,
          description: DESC,
          url: CANONICAL,
          image: [OG_IMAGE],
          inLanguage: "en",
          author: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine" },
          publisher: { "@type": "Organization", "@id": "https://doseroutine.com/#organization", name: "DoseRoutine",
            logo: { "@type": "ImageObject", url: "https://doseroutine.com/icon-512.png" },
          },
          datePublished: "2026-08-02",
          dateModified: REVIEWED,
          citation: REFS.map((r) => r.cite),
          mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to reconstitute CJC-1295 and ipamorelin vials",
          description:
            "The reconstitution arithmetic and handling steps for lyophilised CJC-1295 and ipamorelin vials, including converting a microgram dose to insulin-syringe units.",
          totalTime: "PT10M",
          supply: [
            { "@type": "HowToSupply", name: "Lyophilised peptide vial" },
            { "@type": "HowToSupply", name: "Bacteriostatic water" },
            { "@type": "HowToSupply", name: "Alcohol swabs" },
            { "@type": "HowToSupply", name: "U-100 insulin syringe" },
          ],
          step: RECON_STEPS.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.name,
            text: s.text,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Library",
              item: "https://doseroutine.com/library",
            },
            { "@type": "ListItem", position: 2, name: "CJC-1295 with ipamorelin", item: CANONICAL },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Peptide library · Growth hormone secretagogues
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            CJC-1295 with ipamorelin: dosing, timing and reconstitution
          </h1>
          <p className="text-lg text-muted-foreground">
            The most common growth-hormone peptide pairing, explained properly — what each half
            actually does, why DAC changes everything, the doses and timing rules in circulation,
            the reconstitution maths people get wrong, and the risks nobody advertises.
          </p>
          <p className="text-xs text-muted-foreground">
            Reviewed {REVIEWED} · {REFS.length} cited sources · Educational reference, not medical
            advice
          </p>
          <ResponsiveImage
            src="/og/cjc-1295-ipamorelin-960.jpg"
            webpSrcSet="/og/cjc-1295-ipamorelin-640.webp 640w, /og/cjc-1295-ipamorelin-960.webp 960w, /og/cjc-1295-ipamorelin-1200.webp 1200w"
            fallbackSrcSet="/og/cjc-1295-ipamorelin-640.jpg 640w, /og/cjc-1295-ipamorelin-960.jpg 960w, /og/cjc-1295-ipamorelin.jpg 1200w"
            // Article column is capped at 768px; below that the hero is full-bleed.
            sizes="(min-width: 768px) 768px, 100vw"
            alt="Flat-lay photograph of two lyophilised peptide vials for a CJC-1295 and ipamorelin stack, a U-100 insulin syringe, a vial of bacteriostatic water and an alcohol swab on a light gray surface"
            width={1200}
            height={630}
            loading="eager"
            fetchPriority="high"
            className="aspect-[1200/630] rounded-xl border object-cover"
          />
        </header>

        <Card className="space-y-3 p-5">
          <div className="text-sm font-semibold">Key takeaways</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Two different mechanisms:{" "}
                <strong className="text-foreground">CJC-1295 is a GHRH analogue</strong> (pulse
                size) and <strong className="text-foreground">ipamorelin is a GHRP</strong> (pulse
                trigger, and it lifts the somatostatin brake).
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">DAC vs no-DAC is the biggest decision.</strong>{" "}
                ~30-minute half-life and daily pulses, versus ~6–8 days and a continuous GH bleed.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              100 mcg + 100 mcg, fasted, before bed is the conventional pairing — roughly the 1
              mcg/kg saturation point.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Concentration (mcg/mL) = vial mcg ÷ mL of BAC water. Units to draw = mL × 100.
            </li>
            <li className="flex gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              Neither is approved for this use, both are banned in sport, and insulin resistance is
              the risk that matters most.
            </li>
          </ul>
        </Card>

        {/* Conversion point right after the summary, where intent peaks. */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cta/40 bg-cta/5 p-4">
          <InlineSignupButton size="md" label="Track CJC-1295 + ipamorelin free" />
          <span className="text-xs text-muted-foreground">
            Dose reminders, titration schedule and interaction checks — no card needed.
          </span>
        </div>

        <nav aria-label="On this page" className="rounded-xl border p-4">
          <div className="mb-2 text-sm font-semibold">On this page</div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {TOC.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="hover:text-primary hover:underline">
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Card className="space-y-2 border-l-4 border-l-warning p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-warning" /> Not approved medicines
          </div>
          <p className="text-sm text-muted-foreground">
            Neither CJC-1295 nor ipamorelin is approved for the uses described here, and in 2023 the
            FDA placed both in the compounding category reserved for substances raising significant
            safety concerns. Everything below is a description of the published research and the
            protocols circulating in practice — not instructions to self-administer.
          </p>
        </Card>

        <section id="what-it-is" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">What CJC-1295 with ipamorelin actually is</h2>
          <p className="text-sm text-muted-foreground">
            Growth hormone is released in bursts from the pituitary, controlled by two opposing
            signals: GHRH tells the gland to release, somatostatin tells it to stop. This pairing
            pushes on both levers at once. CJC-1295 is a modified GHRH peptide that survives in the
            bloodstream long enough to matter; ipamorelin is a selective agonist at the ghrelin
            receptor that triggers a release and simultaneously reduces somatostatin's braking
            effect.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="space-y-1 p-4">
              <Activity className="h-5 w-5 text-primary" />
              <div className="text-sm font-semibold">CJC-1295 — the amplifier</div>
              <p className="text-xs text-muted-foreground">
                A GHRH(1-29) analogue with four amino-acid substitutions that resist enzymatic
                breakdown. It makes each pulse bigger, but somatostatin still caps how big.
              </p>
            </Card>
            <Card className="space-y-1 p-4">
              <ClipboardList className="h-5 w-5 text-accent" />
              <div className="text-sm font-semibold">Ipamorelin — the trigger</div>
              <p className="text-xs text-muted-foreground">
                A pentapeptide ghrelin-receptor agonist, developed specifically to release GH
                without the cortisol, prolactin and hunger that earlier GHRPs cause.
              </p>
            </Card>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Agent</th>
                  <th className="py-2 pr-3 font-semibold">Half-life</th>
                  <th className="py-2 font-semibold">Practical effect</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {PK.map((p) => (
                  <tr key={p.agent} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3">
                      <span className="font-medium text-foreground">{p.agent}</span>
                      <span className="block text-xs">{p.cls}</span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{p.half}</td>
                    <td className="py-2">{p.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="why-combined" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Why the two are combined</h2>
          <p className="text-sm text-muted-foreground">
            A GHRH analogue on its own runs into a ceiling: however loudly it signals, somatostatin
            tone limits the size of the release. A GHRP on its own triggers pulses but has less to
            work with. Combine them and the GHRP removes the brake while the GHRH analogue presses
            the accelerator, which is why combined GHRH-plus-GHRP dosing produces a larger GH
            release than either agent alone — and larger than simply adding the two effects
            together.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="space-y-1 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                GHRH alone
              </div>
              <div className="h-3 w-1/3 rounded bg-primary/60" />
              <p className="text-xs text-muted-foreground">Bigger pulse, capped by somatostatin.</p>
            </Card>
            <Card className="space-y-1 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                GHRP alone
              </div>
              <div className="h-3 w-2/5 rounded bg-accent/60" />
              <p className="text-xs text-muted-foreground">
                Triggers a pulse and lowers the brake, with less amplitude behind it.
              </p>
            </Card>
            <Card className="space-y-1 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Both together
              </div>
              <div className="h-3 w-full rounded bg-primary" />
              <p className="text-xs text-muted-foreground">
                Synergistic — more than the sum of the two given separately.
              </p>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">
            Illustrative comparison of relative GH response, not measured data from a single study.
          </p>
        </section>

        <section id="dac" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">
            DAC vs no-DAC — the decision that changes everything
          </h2>
          <p className="text-sm text-muted-foreground">
            Most confusion about CJC-1295 comes from two very different products sharing one name.
            The DAC version carries a linker that binds it to albumin in the blood, stretching the
            half-life from about half an hour to roughly a week. That is not a convenience tweak —
            it changes the shape of the hormone curve entirely.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="space-y-2 p-4">
              <div className="text-sm font-semibold">CJC-1295 with DAC</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Once or twice weekly injection</li>
                <li>• Single doses raised GH and IGF-1 for days in published human work</li>
                <li>• Continuously elevated baseline rather than discrete pulses</li>
                <li>• Harder to unwind if side effects appear — it is in you for a week</li>
              </ul>
            </Card>
            <Card className="space-y-2 p-4">
              <div className="text-sm font-semibold">CJC-1295 no-DAC (Mod GRF 1-29)</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Injected 1–3× daily</li>
                <li>• One sharp pulse per dose, then back to baseline</li>
                <li>• Closer to natural pulsatile secretion</li>
                <li>• Clears in under an hour, so problems resolve quickly</li>
              </ul>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            The pulsatility argument is the crux. Endogenous GH arrives in bursts with long troughs
            between, and receptor signalling appears tuned to that pattern; a flat elevated level is
            not physiologically equivalent, and sustained elevation is also what drives the
            insulin-resistance concern. Published work on continuous CJC-1295 stimulation found that
            pulsatile secretion did persist underneath the raised baseline, but the practical
            preference in most current protocols is still the short-acting version paired with
            ipamorelin.
          </p>
        </section>

        <section id="dosing" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">
            Dosing as described in the literature and in practice
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Protocol</th>
                  <th className="py-2 pr-3 font-semibold">Dose</th>
                  <th className="py-2 pr-3 font-semibold">Frequency</th>
                  <th className="py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {DOSES.map((d) => (
                  <tr key={d.protocol} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-medium text-foreground">{d.protocol}</td>
                    <td className="py-2 pr-3">{d.dose}</td>
                    <td className="py-2 pr-3">{d.freq}</td>
                    <td className="py-2">{d.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card className="space-y-2 border-l-4 border-l-primary p-5">
            <div className="text-sm font-semibold">The saturation dose is the whole point</div>
            <p className="text-sm text-muted-foreground">
              Roughly 1 mcg per kilogram of body weight — about 100 mcg for most adults — is the
              commonly cited point at which the pituitary response to a GHRP saturates. Doubling to
              200 mcg does not double the GH release; it does increase water retention, tingling and
              cost. If a protocol is not working at 100 mcg, the answer is usually timing, food, or
              the product itself, not a bigger dose.
            </p>
          </Card>
        </section>

        <section id="timing" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Timing, and why the fasting rule exists</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TIMING.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.title} className="space-y-1 p-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="text-sm font-semibold">{t.title}</div>
                  <p className="text-xs text-muted-foreground">{t.text}</p>
                </Card>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            If you only ever take one dose, take it at night on an empty stomach. That single choice
            captures most of the available effect and avoids the two most common ways people waste
            the protocol: injecting after dinner, and stacking doses too close together.
          </p>
        </section>

        <section id="reconstitution" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Reconstitution maths</h2>
          <p className="text-sm text-muted-foreground">
            Both peptides ship as lyophilised powder and mean nothing until they are mixed and
            measured. The whole calculation is one division:{" "}
            <strong>concentration (mcg/mL) = vial strength (mcg) ÷ BAC water added (mL)</strong>.
            Then <strong>volume to draw (mL) = dose (mcg) ÷ concentration</strong>, and a U-100
            insulin syringe carries 100 units per millilitre.
          </p>
          <Card className="space-y-3 p-5">
            <div className="text-sm font-semibold">Worked example: 5 mg vial, 5 mL BAC water</div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">Concentration</div>
                <div className="font-semibold">5000 ÷ 5 = 1000 mcg/mL</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">Volume for 100 mcg</div>
                <div className="font-semibold">100 ÷ 1000 = 0.1 mL</div>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <div className="text-xs text-muted-foreground">On a U-100 syringe</div>
                <div className="font-semibold">0.1 × 100 = 10 units</div>
              </div>
            </div>
          </Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Vial</th>
                  <th className="py-2 pr-3 font-semibold">BAC water</th>
                  <th className="py-2 pr-3 font-semibold">Concentration</th>
                  <th className="py-2 font-semibold">100 mcg dose</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {RECON_ROWS.map((r) => (
                  <tr key={`${r.vial}-${r.bac}`} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-foreground">{r.vial}</td>
                    <td className="py-2 pr-3">{r.bac}</td>
                    <td className="py-2 pr-3">{r.conc}</td>
                    <td className="py-2">{r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            {RECON_STEPS.map((s, i) => (
              <div key={s.name} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
          <Card className="space-y-2 p-5">
            <div className="text-sm font-semibold">Why 10 units beats 4 units</div>
            <p className="text-sm text-muted-foreground">
              On a U-100 syringe the smallest reliable graduation is about one unit. At 2500 mcg/mL
              a 100 mcg dose is 4 units, so being one unit out is a 25% dosing error. At 1000 mcg/mL
              the same dose is 10 units and the same slip is 10%. Dilute to a concentration that
              puts your dose in double figures.
            </p>
          </Card>
        </section>

        <section id="timeline" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">What changes, and when</h2>
          <div className="space-y-3 border-l-2 border-border pl-4">
            {TIMELINE.map((t) => (
              <div key={t.phase} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="text-sm font-semibold">{t.phase}</div>
                <p className="text-sm text-muted-foreground">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="expectations" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Realistic expectations</h2>
          <p className="text-sm text-muted-foreground">
            This pairing raises growth hormone within, or somewhat above, the physiological range.
            It is not exogenous HGH and it is not an anabolic steroid. Studies of growth hormone
            secretagogues have generally shown gains in lean body mass with limited or inconsistent
            improvements in strength — and a portion of that lean mass is fluid rather than
            contractile tissue.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="space-y-2 p-4">
              <div className="text-sm font-semibold text-primary">Reasonable to expect</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Deeper, more consolidated sleep, often quickly</li>
                <li>• Better day-to-day recovery between hard sessions</li>
                <li>• Modest body-composition shift over months, alongside training</li>
                <li>• Skin and connective-tissue reports, largely subjective</li>
              </ul>
            </Card>
            <Card className="space-y-2 p-4">
              <div className="text-sm font-semibold text-warning">Not reasonable to expect</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Steroid-like size or strength gains</li>
                <li>• Fat loss without a calorie deficit</li>
                <li>• Results that survive poor sleep, protein or training</li>
                <li>• Any documented long-term safety record — there isn't one</li>
              </ul>
            </Card>
          </div>
        </section>

        <section id="side-effects" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Side effects and how they're managed</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-semibold">Effect</th>
                  <th className="py-2 pr-3 font-semibold">When</th>
                  <th className="py-2 font-semibold">Practical response</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {SIDE_EFFECTS.map((s) => (
                  <tr key={s.effect} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-medium text-foreground">{s.effect}</td>
                    <td className="py-2 pr-3">{s.when}</td>
                    <td className="py-2">{s.manage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            The one that deserves the most attention is glucose. Growth hormone is
            counter-regulatory to insulin, so sustained elevation nudges you toward insulin
            resistance. That is a stronger argument for pulsatile short-acting dosing and bounded
            cycles than any bodybuilding-forum tradition.
          </p>
        </section>

        <section id="monitoring" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Monitoring checklist</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {MONITORING.map((m) => (
              <li key={m} className="flex gap-2">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {m}
              </li>
            ))}
          </ul>
        </section>

        <section id="avoid" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Who should avoid it entirely</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {AVOID.map((a) => (
              <li key={a} className="flex gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                {a}
              </li>
            ))}
          </ul>
        </section>

        <section id="alternatives" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">How it compares to the other secretagogues</h2>
          <div className="space-y-3">
            {ALTERNATIVES.map((a) => (
              <Card key={a.name} className="space-y-1 p-4">
                <div className="text-sm font-semibold">{a.name}</div>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="sourcing" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Legality, sport and sourcing</h2>
          <p className="text-sm text-muted-foreground">
            Neither peptide is an approved medicine for these uses. In 2023 the FDA placed a group
            of peptides including ipamorelin and CJC-1295 into the compounding category reserved for
            bulk substances that raise significant safety concerns, citing insufficient evidence and
            immunogenicity risk — which closed the main legitimate route of supply in the US. Both
            are also prohibited at all times under the WADA Prohibited List.
          </p>
          <p className="text-sm text-muted-foreground">
            What remains is a grey market labelled &quot;research use only&quot;, and testing of
            research peptides has repeatedly found:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Vials under- or over-dosed relative to the printed strength</li>
            <li>Incorrect or partially degraded peptide sequences</li>
            <li>Endotoxin and bacterial contamination from non-sterile filling</li>
            <li>Residual solvents and unidentified process impurities</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            A batch-matched third-party certificate of analysis with HPLC purity and mass-spec
            identity is the minimum evidence anyone should accept — and it still says nothing about
            sterility.
          </p>
        </section>

        <section id="storage" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Storage and handling</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="space-y-1 p-4">
              <Thermometer className="h-5 w-5 text-primary" />
              <div className="text-sm font-semibold">Before reconstitution</div>
              <p className="text-xs text-muted-foreground">
                Lyophilised powder is the stable form. Keep it cold, dark and dry, and avoid
                repeated temperature swings.
              </p>
            </Card>
            <Card className="space-y-1 p-4">
              <Thermometer className="h-5 w-5 text-accent" />
              <div className="text-sm font-semibold">After reconstitution</div>
              <p className="text-xs text-muted-foreground">
                Refrigerate at 2–8 °C, never freeze, and respect the roughly 28-day beyond-use
                window of the bacteriostatic water. Discard anything cloudy or particulate.
              </p>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            Label every vial with concentration and mix date, rotate injection sites across the
            abdomen so the same patch is not used repeatedly, and never reuse a needle.
          </p>
        </section>

        <section id="mistakes" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">The mistakes that waste a cycle</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {MISTAKES.map((m) => (
              <li key={m} className="flex gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {m}
              </li>
            ))}
          </ul>
        </section>

        <section id="faq" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="references" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-bold">References &amp; sources</h2>
          <p className="text-xs text-muted-foreground">
            Peer-reviewed publications and regulatory guidance cited on this page. Last reviewed{" "}
            {REVIEWED}.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-xs text-muted-foreground">
            {REFS.map((r) => (
              <li key={r.url}>
                {r.cite}{" "}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {r.url}
                </a>
              </li>
            ))}
          </ol>
        </section>

        <Card className="flex items-start gap-3 p-5">
          <Info className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Track peptide cycles properly in DoseRoutine</p>
            <p className="text-muted-foreground">
              Reconstitution maths, multi-dose timing reminders, vial inventory, injection-site
              rotation and IGF-1 trends in one place.
            </p>
            <Link
              to="/auth"
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <div className="space-y-2 text-sm">
          <div>
            See also:{" "}
            <Link to="/library/guides/hexarelin-protocol" className="text-primary hover:underline">
              Hexarelin protocol
            </Link>{" "}
            ·{" "}
            <Link
              to="/library/peptide-stacks-for-muscle-growth"
              className="text-primary hover:underline"
            >
              Peptide stacks for muscle growth
            </Link>{" "}
            ·{" "}
            <Link to="/reconstitution-calculator" className="text-primary hover:underline">
              Reconstitution calculator
            </Link>{" "}
            ·{" "}
            <Link to="/library" className="text-primary hover:underline">
              Compound library
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational reference only, not medical advice. CJC-1295 and ipamorelin are not approved
          medicines — do not start, stop or combine any protocol without a qualified physician.
        </p>
        <AttributionFooter sourceUrl={CANONICAL} />
      </article>
    </main>
  );
}
