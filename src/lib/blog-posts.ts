/**
 * DoseRoutine "Research & Updates" blog.
 *
 * Curated, hand-dated posts covering developments that change how people
 * actually run a stack (approvals, phase 3 readouts, first-in-human trials).
 * Rendered by src/routes/blog.$slug.tsx and listed by src/routes/blog.index.tsx.
 *
 * Every claim here must be traceable to a reference in `refs`. Dates are the
 * real publication dates — never build time.
 */

export type BlogSection = {
  heading: string;
  body?: string[];
  bullets?: string[];
};

export type BlogRef = { cite: string; url: string };

/** Facets used by the /blog search + filter UI. */
export type BlogTagKind = "compound" | "mechanism" | "phase";
export type BlogTag = { kind: BlogTagKind; label: string };

export const BLOG_TAG_KIND_LABEL: Record<BlogTagKind, string> = {
  compound: "Compound",
  mechanism: "Mechanism",
  phase: "Trial phase",
};

export type BlogPost = {
  slug: string;
  /** <h1> on the page. */
  heading: string;
  /** <title> tag. */
  title: string;
  /** 50-160 chars, complete sentence. */
  description: string;
  /** Short label for the index card. */
  category: string;
  published: string;
  updated: string;
  /** Speakable lead paragraph — the answer an LLM should lift. */
  intro: string;
  keyPoints: string[];
  sections: BlogSection[];
  faqs: { q: string; a: string }[];
  refs: BlogRef[];
  /** Compound / mechanism / trial-phase facets for search and filtering. */
  tags: BlogTag[];
  /**
   * Optional hero/featured image (site-relative or absolute). When set it wins
   * over the auto-generated social card in OG/Twitter tags.
   */
  featuredImage?: string;
  /** Alt text for `featuredImage`. Falls back to the heading. */
  featuredImageAlt?: string;
  related: { href: string; label: string }[];
};

import { LONGTAIL_BLOG_POSTS } from "@/lib/blog-posts-longtail";

const CURATED_BLOG_POSTS: BlogPost[] = [
  {
    slug: "retatrutide-triumph-phase-3-results",
    tags: [
      { kind: "compound", label: "Retatrutide" },
      { kind: "compound", label: "Tirzepatide" },
      { kind: "mechanism", label: "GLP-1 receptor agonist" },
      { kind: "mechanism", label: "GIP receptor agonist" },
      { kind: "mechanism", label: "Glucagon receptor agonist" },
      { kind: "phase", label: "Phase 3" },
    ],
    heading: "Retatrutide's Phase 3 results are in — and the filing slipped to 2027",
    title: "Retatrutide Phase 3 TRIUMPH Results Explained | DoseRoutine",
    description:
      "Retatrutide hit its endpoints in TRIUMPH-2 and TRIUMPH-3 with about 20% weight loss at 80 weeks. Here is what the data shows and when it may reach patients.",
    category: "GLP-1 & metabolic",
    published: "2026-08-10",
    updated: "2026-08-10",
    intro:
      "Eli Lilly reported in July 2026 that retatrutide, a triple GLP-1/GIP/glucagon receptor agonist, met its primary endpoints in the Phase 3 TRIUMPH-2 and TRIUMPH-3 trials, with weight loss of roughly 20% at 80 weeks on the highest 12 mg dose. Lilly now plans to file for FDA approval in the first quarter of 2027, later than previously guided — so retatrutide remains investigational and is not legally available as an approved medicine anywhere.",
    keyPoints: [
      "TRIUMPH-2 (obesity or overweight plus type 2 diabetes): up to 20.8% body-weight loss and up to a 1.6-point A1C reduction at 80 weeks on 12 mg.",
      "Lower doses still worked: roughly 12.7% at 4 mg and 19.1% at 9 mg in TRIUMPH-2.",
      "TRIUMPH-3 studied severe obesity with established cardiovascular disease — strong weight loss, but the extra cardiovascular benefit over existing drugs is still an open question.",
      "Regulatory filing moved to Q1 2027, meaning approval realistically lands later in 2027 at the earliest.",
      "Everything sold as 'retatrutide' today is a research chemical from an unregulated supply chain, not the trial drug.",
    ],
    sections: [
      {
        heading: "What retatrutide actually is",
        body: [
          "Retatrutide is a once-weekly peptide that activates three receptors at once: GLP-1 (appetite and glycemic control), GIP (insulin sensitivity and tolerability) and glucagon (energy expenditure and hepatic fat mobilisation). Semaglutide hits one of those; tirzepatide hits two. The glucagon arm is the differentiator, and it is also why the compound raises heart rate and can nudge liver enzymes and glucose in ways the dual agonists do not.",
        ],
      },
      {
        heading: "What the TRIUMPH readouts changed",
        body: [
          "Before July 2026, the headline retatrutide numbers came from a Phase 2 trial where the top-dose group lost about 24% of body weight at 48 weeks in people without diabetes. Phase 3 in people with type 2 diabetes came in lower — about 20.8% at 80 weeks — which is expected: diabetes consistently blunts weight response across this drug class.",
          "The commercially interesting part is glycemic control. An A1C drop of up to 1.6 points at those weight-loss levels puts retatrutide in the conversation as a diabetes therapy, not only an obesity drug.",
        ],
      },
      {
        heading: "What is still unanswered",
        bullets: [
          "Cardiovascular outcomes: weight loss and CV event reduction are not the same endpoint, and the added benefit of the glucagon arm over tirzepatide has not been demonstrated.",
          "Lean mass: no trial in this programme was designed around body composition, so the muscle question stays open (see our post on the myostatin and activin combinations).",
          "Tolerability at 12 mg over multi-year use, including heart-rate elevation.",
          "Discontinuation: as with every incretin, weight regain after stopping is the default unless behaviour and lean mass are preserved.",
        ],
      },
      {
        heading: "What this means if you are tracking a stack",
        body: [
          "Nothing about the TRIUMPH data makes grey-market retatrutide safer. Trial participants received titrated, sterile, assayed drug with clinician monitoring of A1C, heart rate, liver enzymes and lipids. Vials bought online match none of those conditions, and dose errors in the microgram-to-milligram conversion are the single most common failure we see.",
          "If you are on any incretin, the tracking that matters is boringly practical: dose and date logged, injection sites rotated, weight and waist trended alongside a lean-mass proxy, and a standing note of every interacting medicine (insulin and sulfonylureas above all, because dose reductions are usually needed as weight falls).",
        ],
      },
    ],
    faqs: [
      {
        q: "Is retatrutide FDA approved in 2026?",
        a: "No. As of August 2026 retatrutide is investigational. Lilly announced positive Phase 3 TRIUMPH-2 and TRIUMPH-3 results in July 2026 and plans to submit a regulatory filing in the first quarter of 2027, so an approval decision would come later in 2027 at the earliest.",
      },
      {
        q: "How much weight did people lose on retatrutide in Phase 3?",
        a: "In TRIUMPH-2, adults with obesity or overweight plus type 2 diabetes lost up to 20.8% of body weight (about 49.6 lb) at 80 weeks on the 12 mg dose, with 19.1% at 9 mg and 12.7% at 4 mg, alongside A1C reductions of up to 1.6 points.",
      },
      {
        q: "Is retatrutide better than tirzepatide?",
        a: "On weight loss the top-line numbers look at least as strong, and the Phase 2 data in people without diabetes were higher. But the trials were not head to head, no cardiovascular outcome advantage has been shown, and tirzepatide is approved while retatrutide is not. 'Better' is not established.",
      },
      {
        q: "Why did the FDA filing get delayed to 2027?",
        a: "Lilly moved its expected submission from late 2026 to the first quarter of 2027 as the Phase 3 programme reported out. The company framed it as completing the data package rather than a safety problem.",
      },
      {
        q: "Is research-grade retatrutide the same as the trial drug?",
        a: "No. Compounds sold as research chemicals are not manufactured, assayed or filled to pharmaceutical standards, and purity, actual peptide content and sterility are unverified. They also carry no titration schedule or medical monitoring, which is where most harm occurs.",
      },
    ],
    refs: [
      {
        cite: "Eli Lilly. Lilly's triple agonist retatrutide successful in two additional Phase 3 obesity trials. July 23, 2026.",
        url: "https://www.prnewswire.com/news-releases/lillys-triple-agonist-retatrutide-successful-in-two-additional-phase-3-obesity-trials-delivering-significant-improvements-in-weight-and-a1c-302832674.html",
      },
      {
        cite: "BioSpace. Lilly preps FDA run for 'triple-G' weight loss drug with Phase 3 data. July 23, 2026.",
        url: "https://www.biospace.com/drug-development/lilly-preps-fda-run-for-triple-g-weight-loss-drug-with-phase-3-data",
      },
      {
        cite: "BioPharma Dive. Lilly, with new data, to seek FDA approval of obesity drug retatrutide. July 23, 2026.",
        url: "https://www.biopharmadive.com/news/lilly-retatrutide-fda-application-obesity-drug-results/825987/",
      },
      {
        cite: "Jastreboff AM, et al. Triple-hormone-receptor agonist retatrutide for obesity — a Phase 2 trial. N Engl J Med. 2023;389(6):514–526.",
        url: "https://pubmed.ncbi.nlm.nih.gov/37366315/",
      },
    ],
    related: [
      { href: "/library/retatrutide-dosage", label: "Retatrutide dosage reference" },
      { href: "/library/compare/semaglutide-vs-tirzepatide", label: "Semaglutide vs tirzepatide" },
      { href: "/interaction-checker", label: "Check your stack for interactions" },
    ],
  },

  {
    slug: "orforglipron-foundayo-oral-glp-1",
    tags: [
      { kind: "compound", label: "Orforglipron" },
      { kind: "compound", label: "Semaglutide" },
      { kind: "mechanism", label: "GLP-1 receptor agonist" },
      { kind: "mechanism", label: "Small molecule" },
      { kind: "phase", label: "FDA approved" },
    ],
    heading: "The first small-molecule GLP-1 pill is approved — what Foundayo changes",
    title: "Orforglipron (Foundayo): Oral GLP-1 Pill Explained | DoseRoutine",
    description:
      "The FDA approved orforglipron, sold as Foundayo, in 2026. Here is how the daily GLP-1 pill compares with injections on results, dosing rules and side effects.",
    category: "GLP-1 & metabolic",
    published: "2026-08-10",
    updated: "2026-08-10",
    intro:
      "In April 2026 the FDA approved orforglipron (brand name Foundayo), the first small-molecule oral GLP-1 receptor agonist for chronic weight management. Unlike oral semaglutide, it is not a peptide, so it does not require fasting or a water-only window — it is a daily tablet taken with or without food. In the ATTAIN programme it produced placebo-adjusted weight reductions of roughly 9–11 percentage points at 72 weeks, with about 12.4% mean loss in adherent participants on the highest dose.",
    keyPoints: [
      "Approved for obesity, or overweight with at least one weight-related condition, alongside diet and activity.",
      "Daily tablet with no food or water timing restrictions — the practical difference versus oral semaglutide.",
      "Roughly 12.4% mean weight loss in adherent highest-dose participants at 72 weeks; less than top-dose injectable tirzepatide.",
      "Same class-wide GI side effects (nausea, vomiting, diarrhoea, constipation) and the same boxed warning regarding thyroid C-cell tumours.",
      "Being a small molecule, it is manufactured at chemical scale rather than peptide scale, which is why analysts expect better supply and price pressure.",
    ],
    sections: [
      {
        heading: "Why 'small molecule' is the headline",
        body: [
          "Every GLP-1 you have heard of until now is a peptide. Peptides get digested, which is why they are injected — and why oral semaglutide has to be swallowed on an empty stomach with no more than 120 mL of water and a 30-minute wait. Orforglipron is a non-peptide molecule that survives the gut on its own. That removes the ritual that quietly wrecks adherence, and it makes production a standard chemical synthesis instead of a fermentation-and-purification bottleneck.",
        ],
      },
      {
        heading: "How it stacks up on results",
        bullets: [
          "Orforglipron (ATTAIN, 72 weeks): about 12.4% mean weight loss in adherent top-dose participants; roughly 9–11 points placebo-adjusted.",
          "Injectable semaglutide 2.4 mg (STEP 1, 68 weeks): about 14.9%.",
          "Injectable tirzepatide 15 mg (SURMOUNT-1, 72 weeks): about 20.9%.",
          "Read that as: a pill that gets most of the way to weekly semaglutide, without needles, refrigeration or a fasting window.",
        ],
      },
      {
        heading: "The practical trade-offs",
        body: [
          "Daily dosing means daily adherence. A missed weekly injection is one event a person notices; a missed tablet is easy to lose track of, and GI tolerability is worst during titration, which is exactly when people skip doses. Every mainstream trial in this class showed that adherence, not potency, decided the real-world result.",
          "The safety profile is class-typical: pancreatitis, gallbladder disease, acute kidney injury from dehydration during vomiting, diabetic retinopathy complications in people with diabetes, and the rodent thyroid C-cell boxed warning that contraindicates use with a personal or family history of medullary thyroid carcinoma or MEN 2.",
        ],
      },
      {
        heading: "If you are switching or stacking",
        bullets: [
          "Do not overlap an injectable GLP-1 with an oral one — the receptor effects add, and so does the GI burden.",
          "Oral absorption is where interactions bite: anything that slows gastric emptying changes the absorption of other oral drugs taken at the same time, and that matters most for narrow-therapeutic-index medicines such as levothyroxine, warfarin and some seizure medicines.",
          "Insulin and sulfonylurea doses usually need reducing as weight falls; hypoglycaemia is a combination effect, not a GLP-1 effect on its own.",
          "Log the tablet at a fixed anchor time. A daily pill with no food rule is easy to take and easy to forget.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is Foundayo?",
        a: "Foundayo is the brand name for orforglipron, a once-daily oral small-molecule GLP-1 receptor agonist approved by the FDA in 2026 for chronic weight management in adults with obesity, or overweight with at least one weight-related condition, used with a reduced-calorie diet and increased physical activity.",
      },
      {
        q: "Do you have to take orforglipron on an empty stomach?",
        a: "No. Unlike oral semaglutide, orforglipron is not a peptide and does not require fasting or a water-only window. It can be taken with or without food, which is one of its main practical advantages.",
      },
      {
        q: "How much weight can you lose on orforglipron?",
        a: "In the ATTAIN trials, placebo-adjusted weight reduction was roughly 9–11 percentage points at 72 weeks, with mean loss of about 12.4% (around 27 lb) in adherent participants on the highest dose. Individual results vary widely.",
      },
      {
        q: "Is the GLP-1 pill as good as Ozempic or Zepbound?",
        a: "On average it produces less weight loss than top-dose injectable tirzepatide and slightly less than injectable semaglutide, but more convenience. For people who will not or cannot inject, the pill that gets taken beats the injection that does not.",
      },
      {
        q: "What are the main side effects?",
        a: "Nausea, vomiting, diarrhoea, constipation and abdominal pain, mostly during dose escalation. Serious risks flagged in labelling include pancreatitis, gallbladder disease, kidney injury from dehydration, and a boxed warning regarding thyroid C-cell tumours seen in rodents with this drug class.",
      },
    ],
    refs: [
      {
        cite: "AJMC. FDA Approves Lilly's Oral GLP-1 Orforglipron for Obesity. April 1, 2026.",
        url: "https://www.ajmc.com/view/fda-approves-lilly-s-oral-glp-1-orforglipron-for-obesity",
      },
      {
        cite: "Eli Lilly. FOUNDAYO (orforglipron) tablets — US Prescribing Information. Initial U.S. Approval 2026.",
        url: "https://pi.lilly.com/us/foundayo-uspi.pdf",
      },
      {
        cite: "Medical News Today. FDA approves Foundayo, an oral GLP-1 alternative to Wegovy and Ozempic. April 8, 2026.",
        url: "https://www.medicalnewstoday.com/articles/fda-approves-oral-glp-1-pill-foundayo-for-weight-loss",
      },
      {
        cite: "Wilding JPH, et al. Once-weekly semaglutide in adults with overweight or obesity (STEP 1). N Engl J Med. 2021;384(11):989–1002.",
        url: "https://pubmed.ncbi.nlm.nih.gov/33567185/",
      },
      {
        cite: "Jastreboff AM, et al. Tirzepatide once weekly for the treatment of obesity (SURMOUNT-1). N Engl J Med. 2022;387(3):205–216.",
        url: "https://pubmed.ncbi.nlm.nih.gov/35658024/",
      },
    ],
    related: [
      { href: "/for/glp-1", label: "DoseRoutine for GLP-1 users" },
      { href: "/library/compare/semaglutide-vs-tirzepatide", label: "Semaglutide vs tirzepatide" },
      { href: "/interaction-checker", label: "Check oral-absorption interactions" },
    ],
  },

  {
    slug: "glp-1-muscle-loss-myostatin-combinations",
    tags: [
      { kind: "compound", label: "Bimagrumab" },
      { kind: "compound", label: "Trevogrumab" },
      { kind: "compound", label: "Semaglutide" },
      { kind: "mechanism", label: "Myostatin / activin inhibition" },
      { kind: "mechanism", label: "GLP-1 receptor agonist" },
      { kind: "phase", label: "Phase 2" },
    ],
    heading: "The muscle problem with GLP-1s finally has trial data behind it",
    title: "GLP-1 Muscle Loss: Bimagrumab & Trevogrumab Data | DoseRoutine",
    description:
      "Up to 40% of GLP-1 weight loss can be lean mass. New Phase 2 trials pairing semaglutide with bimagrumab or trevogrumab show how much of it is preventable.",
    category: "Body composition",
    published: "2026-08-10",
    updated: "2026-08-10",
    intro:
      "Up to 40% of the weight lost on GLP-1 therapy can come from lean mass, not fat. Two Phase 2 programmes now show that this is partly fixable with drugs: the BELIEVE trial combined semaglutide with bimagrumab (an activin-receptor blocker) and produced greater total weight loss while preserving lean mass, and Regeneron's COURAGE trial combining semaglutide with trevogrumab (anti-myostatin) prevented roughly half of the semaglutide-induced lean-mass loss while increasing fat loss.",
    keyPoints: [
      "BELIEVE (published in Nature Medicine, March 2026): semaglutide plus bimagrumab produced more weight loss with lean mass preserved, so a much larger share of the loss was fat.",
      "COURAGE (26-week Phase 2 data): semaglutide plus trevogrumab prevented about half the lean-mass loss and increased fat-mass loss.",
      "Both are investigational combinations — neither is approved, and neither is available outside trials.",
      "Nothing here replaces the two interventions that already work: adequate protein and progressive resistance training.",
      "If you are on a GLP-1, scale weight is the wrong single metric. Track fat and lean mass separately.",
    ],
    sections: [
      {
        heading: "Why lean mass falls at all",
        body: [
          "Any large energy deficit costs some lean tissue — that is normal physiology, and part of the 'lean mass' in a DXA scan is water, glycogen and connective tissue rather than contractile muscle. What makes incretin therapy different is speed and appetite suppression: people lose weight fast and often eat far less protein while doing it, at the exact moment protein requirements per kilogram go up.",
          "The consequences are not cosmetic. Lower muscle mass means lower resting energy expenditure, worse glucose disposal, poorer function with age, and an easier path to regaining fat after stopping.",
        ],
      },
      {
        heading: "What the drug combinations did",
        bullets: [
          "Bimagrumab blocks activin type II receptors, the signalling node that suppresses muscle growth. In BELIEVE, adding it to semaglutide shifted the composition of the loss heavily toward fat while lean mass held.",
          "Trevogrumab is an anti-GDF8 (myostatin) antibody. In COURAGE, adding it to semaglutide preserved roughly half of the lean mass that semaglutide alone would have cost, and fat loss went up. An additional arm added garetosmab (anti-activin A).",
          "Both trials also reported numeric improvements in waist circumference, blood pressure, lipids and A1C across treatment groups.",
          "Neither trial is a longevity or performance study. These are obesity-quality-of-weight-loss trials in Phase 2.",
        ],
      },
      {
        heading: "What actually applies to you today",
        bullets: [
          "Protein: roughly 1.2–1.6 g per kilogram of body weight per day during active loss, split across meals. Appetite suppression makes this a planning problem, not a willpower problem.",
          "Resistance training two to three times a week. It is the only intervention with consistent evidence for retaining muscle in a deficit, and it does not need to be complicated.",
          "Slow the taper. Titrating up faster than tolerated produces the sharpest deficits and the worst intake.",
          "Measure something other than weight: waist and hip circumference, grip strength, a repeatable lift, and body-composition scans if you have access.",
          "Be sceptical of grey-market 'myostatin inhibitor' peptides marketed off the back of these headlines. Follistatin-type products sold online are not the trial antibodies and have no human safety data.",
        ],
      },
      {
        heading: "How to track it in DoseRoutine",
        body: [
          "Body metrics and workout logging exist for exactly this pattern: log the GLP-1 dose and titration date, log weight and waist on a fixed cadence, log resistance sessions, and read them on the same timeline. When lean mass is the thing at risk, the useful signal is whether training volume and protein held while weight fell — not the number on the scale.",
        ],
      },
    ],
    faqs: [
      {
        q: "How much muscle do you lose on GLP-1 medications?",
        a: "Studies report that up to about 40% of the weight lost on GLP-1-based therapy can be lean mass, which includes skeletal muscle, connective tissue and water. The proportion is smaller when protein intake is adequate and resistance training is maintained.",
      },
      {
        q: "What is bimagrumab?",
        a: "Bimagrumab is an investigational monoclonal antibody that blocks activin type II receptors, releasing a brake on muscle growth. In the Phase 2 BELIEVE trial, combining it with semaglutide produced greater weight loss while preserving lean mass compared with semaglutide alone.",
      },
      {
        q: "What is trevogrumab?",
        a: "Trevogrumab is an investigational anti-GDF8 (anti-myostatin) antibody. In Regeneron's Phase 2 COURAGE trial, adding it to semaglutide prevented about half of the semaglutide-induced lean-mass loss while increasing fat-mass loss over 26 weeks.",
      },
      {
        q: "Can I buy a myostatin inhibitor to protect muscle on a GLP-1?",
        a: "Not legitimately. Bimagrumab and trevogrumab are investigational biologics available only in clinical trials. Peptides sold online as myostatin or follistatin products are unrelated research chemicals with no human efficacy or safety evidence for this use.",
      },
      {
        q: "How much protein should I eat on a GLP-1?",
        a: "Most clinical guidance during active weight loss lands around 1.2–1.6 g of protein per kilogram of body weight per day, spread across meals, combined with resistance training two to three times weekly. Discuss targets with your clinician if you have kidney disease.",
      },
    ],
    refs: [
      {
        cite: "Heymsfield SB, et al. Bimagrumab and semaglutide alone or in combination for the treatment of obesity: a phase 2 randomized clinical trial. Nat Med. 2026.",
        url: "https://medicalxpress.com/news/2026-03-trial-glp-combo-therapy-fat.html",
      },
      {
        cite: "Regeneron Pharmaceuticals. Results from Phase 2 COURAGE trial demonstrating potential to improve quality of GLP-1 receptor agonist-induced weight loss by preserving lean mass. September 17, 2025.",
        url: "https://investor.regeneron.com/news-releases/news-release-details/results-phase-2-courage-trial-demonstrating-potential-improve",
      },
      {
        cite: "Pennington Biomedical Research Center. Combination GLP-1 therapy shows fat mass loss while preserving lean mass in adults with obesity. March 5, 2026.",
        url: "https://www.pbrc.edu/news/media/2026/semaglutide_and_bimagrumab.aspx",
      },
      {
        cite: "Wilding JPH, et al. Once-weekly semaglutide in adults with overweight or obesity (STEP 1). N Engl J Med. 2021;384(11):989–1002.",
        url: "https://pubmed.ncbi.nlm.nih.gov/33567185/",
      },
    ],
    related: [
      { href: "/for/glp-1", label: "DoseRoutine for GLP-1 users" },
      { href: "/library/compare/semaglutide-vs-tirzepatide", label: "Semaglutide vs tirzepatide" },
      { href: "/best-glp-1-tracking-app", label: "Tracking a GLP-1 protocol" },
    ],
  },

  {
    slug: "klotho-partial-reprogramming-first-human-trials",
    tags: [
      { kind: "compound", label: "Klotho" },
      { kind: "compound", label: "Yamanaka factors" },
      { kind: "mechanism", label: "mRNA therapy" },
      { kind: "mechanism", label: "Partial epigenetic reprogramming" },
      { kind: "phase", label: "Phase 1" },
    ],
    heading: "Longevity biology reached first-in-human: klotho mRNA and partial reprogramming",
    title: "Klotho mRNA & Partial Reprogramming Trials 2026 | DoseRoutine",
    description:
      "Two longevity approaches entered human testing in 2026: alpha-klotho mRNA therapy and partial reprogramming. Here is what is real and what is not.",
    category: "Longevity",
    published: "2026-08-10",
    updated: "2026-08-10",
    intro:
      "Two of the most-hyped ideas in aging biology moved into human testing in 2026. Life Biosciences received FDA clearance for a Phase 1 trial of ER-100, a gene therapy delivering the Yamanaka factors OCT-4, SOX-2 and KLF-4 for partial epigenetic reprogramming in an eye disease, and Klothea Bio began a small Phase 1b of an alpha-klotho mRNA therapy. Both are early safety studies in tiny populations — neither is evidence that any supplement, peptide or clinic protocol extends human lifespan.",
    keyPoints: [
      "ER-100 (Life Biosciences) is the first partial-reprogramming therapy cleared by the FDA for a human trial, targeting optic-nerve disease rather than aging as a whole.",
      "It delivers three of the four Yamanaka factors via AAV — deliberately omitting c-MYC, the one most associated with tumour risk.",
      "Klothea Bio's aKL003 is a Phase 1b of alpha-klotho mRNA in lipid nanoparticles: about 21 subjects, two injections, randomised 2:1 against saline.",
      "The klotho study runs at a clinic in a special economic zone in Honduras, outside the FDA/EMA pathway — a meaningful caveat for how the results should be read.",
      "Endpoints in both are safety, tolerability and protein expression. Neither trial can show a lifespan effect.",
    ],
    sections: [
      {
        heading: "Partial reprogramming, in plain terms",
        body: [
          "Yamanaka factors can revert an adult cell to a stem-cell-like state. Run that process to completion and you get a pluripotent cell — useful in a dish, catastrophic in a living tissue, because cells that forget what they are become tumours. Partial reprogramming applies the factors briefly, aiming to reset age-associated epigenetic marks while the cell keeps its identity. In mice it has restored vision in damaged optic nerves.",
          "Life Biosciences' ER-100 takes that into people with optic-nerve disease, where the eye offers a contained compartment, a measurable endpoint and a manageable risk profile. That choice tells you how early this is: nobody is dosing a healthy person systemically with reprogramming factors.",
        ],
      },
      {
        heading: "Klotho, and why the trial design matters",
        body: [
          "Alpha-klotho is a protein whose levels fall with age and correlate with kidney function, cognition and cardiovascular health; overexpressing it extends lifespan in mice. Klothea's approach is mRNA in a lipid nanoparticle — the delivery platform proven at scale by COVID vaccines — to make the body transiently produce klotho itself.",
          "The trial is 21 subjects, two doses, randomised against saline, measuring safety and protein expression. It is being run at the GARM Clinic in Próspera, Roatán, a jurisdiction chosen by several longevity companies to move faster than conventional regulators allow. Speed is real; so is the reduced oversight, and results from that setting will face a higher bar before mainstream adoption.",
        ],
      },
      {
        heading: "What this does and does not license you to do",
        bullets: [
          "It does not validate any supplement marketed as a 'klotho booster'. No oral product has been shown to raise circulating alpha-klotho meaningfully in humans.",
          "It does not validate peptide 'reprogramming' protocols, epitalon, or exosome infusions sold by longevity clinics. None of these are the therapies in trial.",
          "It does mean the mechanisms are now testable in humans, with real safety data arriving within a couple of years.",
          "The interventions with actual human outcome evidence are unchanged: resistance and aerobic training, sleep, blood pressure and lipid control, glucose regulation, not smoking, and treating what your labs actually show.",
        ],
      },
      {
        heading: "How to read longevity news without getting sold something",
        bullets: [
          "Check the species. Most 'lifespan extension' headlines are mice, worms or cells.",
          "Check the endpoint. Phase 1 measures safety and drug levels — never longevity.",
          "Check the n. Twenty-one people cannot show efficacy for anything.",
          "Check the regulator. A trial outside FDA/EMA oversight is not automatically bad science, but it is a different evidentiary standard.",
          "Check who profits from your conclusion. Clinics quoting Phase 1 press releases while selling infusions are the pattern to distrust.",
        ],
      },
    ],
    faqs: [
      {
        q: "Has partial reprogramming been tested in humans?",
        a: "Yes, as of 2026. Life Biosciences received FDA clearance for a Phase 1 trial of ER-100, an AAV gene therapy delivering OCT-4, SOX-2 and KLF-4 to partially reprogram cells, in people with optic-nerve disease. It is a safety study, not a lifespan study.",
      },
      {
        q: "What is the klotho trial?",
        a: "Klothea Bio is running a Phase 1b randomised, double-blind, placebo-controlled study of aKL003, an alpha-klotho mRNA in lipid nanoparticles. About 21 subjects receive two injections at 0.5 mg, randomised 2:1 against saline, with safety, tolerability and protein expression as endpoints.",
      },
      {
        q: "Can I take a supplement to increase klotho?",
        a: "No supplement has been shown to raise circulating alpha-klotho to a clinically meaningful degree in humans. Observational data link higher klotho with exercise and kidney health, but that is not the same as a product that raises it.",
      },
      {
        q: "Why omit c-MYC from the Yamanaka factors?",
        a: "c-MYC is a well-known oncogene, and its inclusion is the main tumour-risk driver in reprogramming. Using only OCT-4, SOX-2 and KLF-4 keeps most of the rejuvenation effect seen in animal work while lowering that risk, which is why clinical programmes use the three-factor combination.",
      },
      {
        q: "Are longevity clinics offering these therapies now?",
        a: "Some clinics sell products with similar names — exosomes, peptide 'reprogramming' protocols, klotho-branded supplements. None of them are the therapies being tested in these trials, and none have human outcome data behind them.",
      },
    ],
    refs: [
      {
        cite: "Nature Biotechnology. FDA go-ahead to test cellular rejuvenation therapy in humans. February 17, 2026.",
        url: "https://www.nature.com/articles/s41587-026-03037-z",
      },
      {
        cite: "ClinicalTrials.gov. aKLmRNA-mediated Protein Replacement Therapy (aKL003), NCT07544420. Klothea Bio Inc.",
        url: "https://clinicaltrials.gov/study/NCT07544420",
      },
      {
        cite: "Longevity.Technology. Klothea initiates longevity-focused human trial of klotho therapy. February 24, 2026.",
        url: "https://longevity.technology/news/klothea-initiates-longevity-focused-human-trial-of-klotho-therapy/",
      },
      {
        cite: "Lu Y, et al. Reprogramming to recover youthful epigenetic information and restore vision. Nature. 2020;588(7836):124–129.",
        url: "https://pubmed.ncbi.nlm.nih.gov/33268865/",
      },
      {
        cite: "Kuro-o M, et al. Mutation of the mouse klotho gene leads to a syndrome resembling ageing. Nature. 1997;390(6655):45–51.",
        url: "https://pubmed.ncbi.nlm.nih.gov/9363890/",
      },
    ],
    related: [
      { href: "/for/biohackers", label: "DoseRoutine for biohackers" },
      { href: "/library/womens-health/longevity", label: "Longevity compound library" },
      { href: "/editorial-policy", label: "How we source and review content" },
    ],
  },
];

export const BLOG_POSTS: BlogPost[] = [...CURATED_BLOG_POSTS, ...LONGTAIL_BLOG_POSTS];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export const BLOG_POSTS_NEWEST_FIRST = [...BLOG_POSTS].sort((a, b) =>
  b.published.localeCompare(a.published),
);

/** Weight per shared tag kind — a shared compound is a stronger signal than a phase. */
const RELATED_TAG_WEIGHT: Record<BlogTagKind, number> = {
  compound: 5,
  mechanism: 3,
  phase: 1,
};

export type RelatedBlogPost = { post: BlogPost; shared: BlogTag[]; score: number };

/**
 * Other posts that share tags with this one, strongest overlap first.
 * Ties break toward the newer post so the section stays current.
 */
export function relatedBlogPosts(post: BlogPost, limit = 3): RelatedBlogPost[] {
  const own = new Map(post.tags.map((t) => [`${t.kind}:${t.label}`, t]));
  if (own.size === 0) return [];

  return BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .map((p) => {
      const shared: BlogTag[] = [];
      let score = 0;
      for (const tag of p.tags) {
        if (own.has(`${tag.kind}:${tag.label}`)) {
          shared.push(tag);
          score += RELATED_TAG_WEIGHT[tag.kind];
        }
      }
      return { post: p, shared, score };
    })
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.published.localeCompare(a.post.published) ||
        a.post.heading.localeCompare(b.post.heading),
    )
    .slice(0, limit);
}

/** All tags across posts, de-duplicated, grouped by kind, sorted by usage. */
export const BLOG_TAGS: BlogTag[] = (() => {
  const counts = new Map<string, { tag: BlogTag; n: number }>();
  for (const post of BLOG_POSTS) {
    for (const tag of post.tags) {
      const key = `${tag.kind}:${tag.label}`;
      const found = counts.get(key);
      if (found) found.n += 1;
      else counts.set(key, { tag, n: 1 });
    }
  }
  const order: BlogTagKind[] = ["compound", "mechanism", "phase"];
  return [...counts.values()]
    .sort(
      (a, b) =>
        order.indexOf(a.tag.kind) - order.indexOf(b.tag.kind) ||
        b.n - a.n ||
        a.tag.label.localeCompare(b.tag.label),
    )
    .map((entry) => entry.tag);
})();

export function blogTagKey(tag: BlogTag): string {
  return `${tag.kind}:${tag.label}`;
}

/** How many posts carry each tag — used to rank autocomplete suggestions. */
export const BLOG_TAG_POST_COUNT: Record<string, number> = (() => {
  const counts: Record<string, number> = {};
  for (const post of BLOG_POSTS) {
    for (const tag of post.tags) {
      const key = blogTagKey(tag);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
})();

export type BlogSuggestion = { tag: BlogTag; key: string; count: number };

/**
 * Autocomplete for the blog search box: matches compound, mechanism and trial
 * phase tags as the reader types. Prefix matches rank above mid-word matches,
 * then by how many posts use the tag. Already-selected tags are excluded.
 */
export function blogSuggestions(
  query: string,
  selectedTagKeys: string[] = [],
  limit = 8,
): BlogSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const taken = new Set(selectedTagKeys);
  const kindOrder: BlogTagKind[] = ["compound", "mechanism", "phase"];

  return BLOG_TAGS.map((tag) => {
    const key = blogTagKey(tag);
    if (taken.has(key)) return null;
    const label = tag.label.toLowerCase();
    const idx = label.indexOf(q);
    if (idx < 0) return null;
    return { tag, key, count: BLOG_TAG_POST_COUNT[key] ?? 0, rank: idx === 0 ? 0 : 1 };
  })
    .filter((v): v is BlogSuggestion & { rank: number } => v !== null)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.count - a.count ||
        kindOrder.indexOf(a.tag.kind) - kindOrder.indexOf(b.tag.kind) ||
        a.tag.label.localeCompare(b.tag.label),
    )
    .slice(0, limit)
    .map(({ tag, key, count }) => ({ tag, key, count }));
}

/** Lowercased haystack used for free-text search on the blog index. */
function searchHaystack(post: BlogPost): string {
  return [
    post.heading,
    post.description,
    post.category,
    post.intro,
    ...post.keyPoints,
    ...post.tags.map((t) => t.label),
    ...post.sections.map((s) => [s.heading, ...(s.body ?? []), ...(s.bullets ?? [])].join(" ")),
    ...post.faqs.map((f) => `${f.q} ${f.a}`),
  ]
    .join(" ")
    .toLowerCase();
}

const HAYSTACKS = new Map(BLOG_POSTS.map((p) => [p.slug, searchHaystack(p)]));

/**
 * Filter posts by free text and any number of selected tag keys.
 * Tags are AND-ed across kinds and OR-ed within a kind, so picking two
 * compounds widens the list while adding a phase narrows it.
 */
export function filterBlogPosts(
  posts: BlogPost[],
  query: string,
  selectedTagKeys: string[],
): BlogPost[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const byKind = new Map<BlogTagKind, Set<string>>();
  for (const key of selectedTagKeys) {
    const idx = key.indexOf(":");
    if (idx < 0) continue;
    const kind = key.slice(0, idx) as BlogTagKind;
    const set = byKind.get(kind) ?? new Set<string>();
    set.add(key);
    byKind.set(kind, set);
  }

  return posts.filter((post) => {
    const keys = new Set(post.tags.map(blogTagKey));
    for (const set of byKind.values()) {
      if (![...set].some((k) => keys.has(k))) return false;
    }
    if (terms.length === 0) return true;
    const hay = HAYSTACKS.get(post.slug) ?? "";
    return terms.every((t) => hay.includes(t));
  });
}

/** Sort modes offered by the /blog index. */
export type BlogSort = "newest" | "oldest" | "relevance";
export const BLOG_SORTS: BlogSort[] = ["newest", "oldest", "relevance"];
export const BLOG_SORT_LABEL: Record<BlogSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  relevance: "Most relevant",
};

/** Posts per page on the /blog index. */
export const BLOG_PAGE_SIZE = 3;

/**
 * Relevance score for a post against a free-text query.
 *
 * Weighted by where the term appears: heading and tags mean the post is
 * *about* the term, body text only means it was mentioned.
 */
export function scoreBlogPost(post: BlogPost, query: string): number {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0;

  const heading = post.heading.toLowerCase();
  const description = `${post.description} ${post.intro}`.toLowerCase();
  const tags = post.tags.map((t) => t.label.toLowerCase()).join(" ");
  const hay = HAYSTACKS.get(post.slug) ?? "";

  let score = 0;
  for (const term of terms) {
    if (tags.includes(term)) score += 8;
    if (heading.includes(term)) score += 6;
    if (description.includes(term)) score += 3;
    const body = hay.split(term).length - 1;
    score += Math.min(body, 6);
  }
  return score;
}

/** Sort a filtered list. `relevance` falls back to newest without a query. */
export function sortBlogPosts(posts: BlogPost[], sort: BlogSort, query = ""): BlogPost[] {
  const byNewest = (a: BlogPost, b: BlogPost) =>
    b.published.localeCompare(a.published) || a.heading.localeCompare(b.heading);

  if (sort === "oldest") {
    return [...posts].sort(
      (a, b) => a.published.localeCompare(b.published) || a.heading.localeCompare(b.heading),
    );
  }
  if (sort === "relevance" && query.trim().length > 0) {
    return [...posts].sort(
      (a, b) => scoreBlogPost(b, query) - scoreBlogPost(a, query) || byNewest(a, b),
    );
  }
  return [...posts].sort(byNewest);
}

/* ------------------------------------------------------------------ */
/* Tag archives — clean shareable URLs at /blog/tag/<kind>/<slug>      */
/* ------------------------------------------------------------------ */

/** URL-safe slug for a tag label ("GLP-1 receptor agonist" → "glp-1-receptor-agonist"). */
export function blogTagSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type BlogTagArchive = {
  tag: BlogTag;
  slug: string;
  /** Canonical path, e.g. /blog/tag/compound/retatrutide */
  path: string;
  count: number;
  /** Newest `updated` date among the posts in this archive (YYYY-MM-DD). */
  lastmod: string;
};

/** Every tag that has at least one post, with its archive path. */
export const BLOG_TAG_ARCHIVES: BlogTagArchive[] = BLOG_TAGS.map((tag) => {
  const slug = blogTagSlug(tag.label);
  const tagged = BLOG_POSTS.filter((post) =>
    post.tags.some((t) => t.kind === tag.kind && t.label === tag.label),
  );
  return {
    tag,
    slug,
    path: `/blog/tag/${tag.kind}/${slug}`,
    count: BLOG_TAG_POST_COUNT[blogTagKey(tag)] ?? 0,
    lastmod: tagged.reduce(
      (newest, post) => (post.updated > newest ? post.updated : newest),
      tagged[0]?.updated ?? "",
    ),
  };
});

/**
 * Newest `updated` date across all posts — the accurate lastmod for the
 * /blog index and /blog/tag hub. Derived from content, never from build time.
 */
export const BLOG_LAST_UPDATED: string = BLOG_POSTS.reduce(
  (newest, post) => (post.updated > newest ? post.updated : newest),
  BLOG_POSTS[0]?.updated ?? "",
);

export function blogTagPath(tag: BlogTag): string {
  return `/blog/tag/${tag.kind}/${blogTagSlug(tag.label)}`;
}

export function isBlogTagKind(value: string): value is BlogTagKind {
  return value === "compound" || value === "mechanism" || value === "phase";
}

/** Resolve a /blog/tag/<kind>/<slug> URL back to its archive, if it exists. */
export function findBlogTagArchive(kind: string, slug: string): BlogTagArchive | undefined {
  if (!isBlogTagKind(kind)) return undefined;
  return BLOG_TAG_ARCHIVES.find((a) => a.tag.kind === kind && a.slug === slug);
}

/** Posts carrying a tag, newest first. */
export function blogPostsForTag(tag: BlogTag): BlogPost[] {
  return BLOG_POSTS_NEWEST_FIRST.filter((post) =>
    post.tags.some((t) => t.kind === tag.kind && t.label === tag.label),
  );
}
