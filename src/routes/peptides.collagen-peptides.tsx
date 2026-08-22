import { createFileRoute } from "@tanstack/react-router";
import { PeptideGuidePage } from "@/components/peptide-guide-page";
import { peptideGuideHead } from "@/lib/peptide-guide-head";
import { clusterRelated } from "@/lib/peptide-cluster-links";

export const PATH = "/peptides/collagen-peptides";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Collagen Peptides Supplements: Skin, Joints & Dosing";
const DESC =
  "What collagen peptides are, what the trials actually show for skin and joints, how much to take per day, and when it is not worth the money.";

export const FAQ = [
  {
    q: "What are collagen peptides?",
    a: "Collagen peptides are collagen protein that has been enzymatically hydrolysed into short amino acid chains, typically 2 to 20 residues. The fragments dissolve in cold liquid and are absorbed intact or as di- and tripeptides, unlike whole collagen or gelatin.",
  },
  {
    q: "Do collagen peptides work for skin?",
    a: "Meta-analyses of randomised trials report small but consistent improvements in skin hydration and elasticity after 8 to 12 weeks of daily hydrolysed collagen. Effects are modest, most trials are industry funded, and improvements fade after stopping. It is a marginal gain, not a transformation.",
  },
  {
    q: "How much collagen peptides per day?",
    a: "Skin trials most often used 2.5 to 10 g per day. Joint and tendon trials used 5 to 15 g, with 10 g the most common dose. Studies of collagen for tendon and bone frequently pair it with vitamin C. There is no established benefit to exceeding 15 g daily.",
  },
  {
    q: "Are collagen peptides good for joints?",
    a: "Trials in athletes and people with activity-related knee pain report reduced pain scores with 5 to 10 g daily over 3 to 6 months. Evidence for structural cartilage change is weaker than evidence for symptom relief, and undenatured type II collagen at 40 mg is a separate intervention with its own data.",
  },
  {
    q: "What is the difference between collagen peptides and gelatin?",
    a: "Both come from collagen. Gelatin is partially broken down and gels when cold; collagen peptides are hydrolysed further, dissolve in any temperature liquid, and do not gel. Peptides absorb faster; gelatin is cheaper and works in cooking.",
  },
  {
    q: "How long until collagen peptides work?",
    a: "Skin outcome trials generally measure at 8 and 12 weeks; joint pain trials at 12 to 24 weeks. If nothing has changed after three consistent months at 10 g daily, more time or a higher dose is unlikely to help.",
  },
];

const SECTIONS = [
  {
    heading: "What collagen peptides actually are",
    paragraphs: [
      "Collagen is the most abundant protein in the body — the scaffold in skin, tendon, cartilage and bone. As a whole protein it is too large and too poorly soluble to be a useful supplement, so manufacturers hydrolyse it with enzymes into short chains. Those chains are collagen peptides, sometimes labeled hydrolysed collagen or collagen hydrolysate. They are the same thing.",
      "The mechanism is not that you eat collagen and it becomes your collagen. Absorbed di- and tripeptides such as prolyl-hydroxyproline appear in blood after ingestion and are thought to act partly as signalling molecules that prompt fibroblasts to increase their own collagen synthesis, and partly as raw material. Both effects are plausible; neither is dramatic.",
    ],
  },
  {
    heading: "Which type of collagen do you need?",
    table: {
      caption: "Types most commonly sold, and where each sits in the body.",
      head: ["Type", "Main source", "Found in", "Marketed for"],
      rows: [
        ["Type I", "Bovine hide, fish skin/scales", "Skin, tendon, bone", "Skin, hair, nails"],
        ["Type II", "Chicken sternum cartilage", "Joint cartilage", "Joint comfort"],
        ["Type III", "Bovine hide", "Skin, blood vessels, organs", "Sold alongside type I"],
        ["Marine (type I)", "Fish", "Skin", "Skin; suits pescatarian diets"],
      ],
    },
    paragraphs: [
      "Most powders are type I and III from bovine or marine sources, which is what the skin research used. Undenatured type II collagen is a different product entirely: it is dosed at 40 mg, not 10 g, and works through an immune-tolerance mechanism rather than as a substrate.",
    ],
  },
  {
    heading: "What the evidence supports — and what it does not",
    bullets: [
      "Skin hydration and elasticity: multiple randomised placebo-controlled trials and pooled analyses show small improvements at 2.5–10 g daily for 8–12 weeks.",
      "Wrinkle depth: measured improvements exist but are smaller and less consistent than the hydration findings.",
      "Joint pain in active people and knee osteoarthritis: several trials at 5–10 g daily report reduced pain scores over 3–6 months.",
      "Tendon and ligament: preliminary work uses 15 g with vitamin C taken about an hour before loading exercise; the data are early.",
      "Hair and nail growth: nail brittleness data are limited and small; hair claims are largely unsupported.",
      "Gut health, weight loss and 'anti-ageing' generally: not supported by controlled human evidence.",
      "Industry funding is common across this literature. Treat single-product trials with the caution you would give any manufacturer-run study.",
    ],
  },
  {
    heading: "How to take collagen peptides",
    steps: [
      "Pick a dose based on the goal: 2.5–10 g daily for skin, 10 g daily for joint comfort, 15 g pre-exercise with vitamin C for tendon work.",
      "Mix into any liquid — hydrolysed peptides dissolve cold and do not gel.",
      "Take it at whatever time you will actually remember; only the tendon protocol has a timing rationale.",
      "Count the protein. Ten grams of collagen peptides is 10 g of protein, but it is incomplete protein — very low tryptophan — so it should not replace your main protein sources.",
      "Give it 8 to 12 weeks before judging, and take it daily. Intermittent use is the most common reason people see nothing.",
      "Re-evaluate at 12 weeks against something you wrote down at the start, not against memory.",
    ],
  },
  {
    heading: "Safety and who should skip it",
    paragraphs: [
      "Collagen peptides are food-derived protein and are well tolerated; the most common complaints are mild bloating or a taste people dislike. Allergy is the real consideration — marine collagen is a fish product, and bovine collagen is not suitable for anyone avoiding beef products. Anyone with chronic kidney disease should discuss any added protein load with their clinician.",
      "One under-discussed point: collagen peptide powders are animal-tissue derived, and heavy-metal testing quality varies by manufacturer. Third-party verification programs such as NSF Certified for Sport or Informed Choice are the practical way to check.",
    ],
  },
];

const REFERENCES = [
  {
    cite: "de Miranda RB, Weimer P, Rossi RC. Effects of hydrolyzed collagen supplementation on skin aging: a systematic review and meta-analysis. Int J Dermatol. 2021;60(12):1449–1461.",
    url: "https://pubmed.ncbi.nlm.nih.gov/33742704/",
  },
  {
    cite: "Pu S-Y, Huang Y-L, Pu C-M, et al. Effects of Oral Collagen for Skin Anti-Aging: A Systematic Review and Meta-Analysis. Nutrients. 2023;15(9):2080.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37432204/",
  },
  {
    cite: "Clark KL, Sebastianelli W, Flechsenhar KR, et al. 24-week study on the use of collagen hydrolysate as a dietary supplement in athletes with activity-related joint pain. Curr Med Res Opin. 2008;24(5):1485–1496.",
    url: "https://pubmed.ncbi.nlm.nih.gov/18416885/",
  },
  {
    cite: "Shaw G, Lee-Barthel A, Ross ML, et al. Vitamin C-enriched gelatin supplementation before intermittent activity augments collagen synthesis. Am J Clin Nutr. 2017;105(1):136–143.",
    url: "https://pubmed.ncbi.nlm.nih.gov/27852613/",
  },
  {
    cite: "Iwai K, Hasegawa T, Taguchi Y, et al. Identification of food-derived collagen peptides in human blood after oral ingestion of gelatin hydrolysates. J Agric Food Chem. 2005;53(16):6531–6536.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16076145/",
  },
  {
    cite: "NIH Office of Dietary Supplements. Dietary Supplements for Exercise and Athletic Performance — Fact Sheet for Health Professionals.",
    url: "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/",
  },
];

export const Route = createFileRoute("/peptides/collagen-peptides")({
  head: () =>
    peptideGuideHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "Collagen peptides",
      faq: FAQ,
      type: "MedicalWebPage",
    }),
  component: Page,
});

function Page() {
  return (
    <PeptideGuidePage
      heading="Collagen peptides supplements: skin, joints and dosing"
      answer="Collagen peptides are hydrolysed collagen — short amino acid chains your gut can absorb. Randomised trials show small, consistent gains in skin hydration and elasticity at 2.5 to 10 g daily over 8 to 12 weeks, and reduced activity-related joint pain at 5 to 10 g daily. Benefits fade once you stop."
      sections={SECTIONS}
      faq={FAQ}
      references={REFERENCES}
      reviewed="August 2026"
      productNote={{
        title: "Collagen only works if you actually take it daily",
        body: "DoseRoutine logs your daily scoop, keeps a streak so you can see whether you really hit 12 consistent weeks, and charts it beside the skin, joint or training notes you record — so the 12-week check is data, not memory.",
      }}
      related={clusterRelated(PATH)}
      canonical={CANONICAL}
    />
  );
}
