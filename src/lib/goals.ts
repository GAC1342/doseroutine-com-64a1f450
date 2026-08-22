export const GOALS = [
  {
    slug: "weight-loss",
    title: "Weight Loss",
    blurb: "Compounds studied for fat loss, appetite regulation, and metabolic health.",
  },
  {
    slug: "muscle",
    title: "Muscle & Strength",
    blurb: "Peptides, hormones, and supplements used for lean-mass gain and strength.",
  },
  {
    slug: "recovery",
    title: "Recovery & Healing",
    blurb: "Tissue repair, tendon and joint recovery, post-training resilience.",
  },
  {
    slug: "brain",
    title: "Brain & Cognition",
    blurb: "Nootropics and neuropeptides for focus, memory, and mood.",
  },
  {
    slug: "longevity",
    title: "Longevity",
    blurb: "Interventions targeting healthspan, cellular aging, and senescence.",
  },
  {
    slug: "mitochondria",
    title: "Mitochondrial Health",
    blurb: "Support for cellular energy production and mitochondrial biogenesis.",
  },
  {
    slug: "endurance",
    title: "Endurance & Performance",
    blurb: "Aerobic capacity, VO₂ max, and stamina.",
  },
  {
    slug: "prostate",
    title: "Prostate Health",
    blurb: "Compounds researched for BPH, urinary flow, and long-term prostate support.",
  },
  {
    slug: "testosterone",
    title: "Testosterone Support",
    blurb: "Botanicals and minerals studied for supporting healthy testosterone levels.",
  },
  {
    slug: "libido",
    title: "Sexual Health & Libido",
    blurb: "Compounds researched for libido, sexual performance, arousal, and erectile function.",
  },
  {
    slug: "mens-longevity",
    title: "Men's Longevity",
    blurb: "Cardiovascular, hormonal, prostate, and mitochondrial support for men over 40.",
  },
  {
    slug: "womens-longevity",
    title: "Women's Longevity",
    blurb: "Bone, skin, muscle, and cellular-aging support through perimenopause and beyond.",
  },
  {
    slug: "menopause",
    title: "Menopause Support",
    blurb: "Hormones and botanicals studied for hot flashes, sleep, mood, and bone loss.",
  },
  {
    slug: "fertility",
    title: "Fertility & Cycle",
    blurb: "Egg quality, ovulation, luteal-phase support, and cycle regularity — including PCOS.",
  },
  {
    slug: "immune",
    title: "Immune Function",
    blurb: "Compounds studied for immune defense, infection duration, and immune-cell function.",
  },
  {
    slug: "cardiovascular",
    title: "Heart & Circulation",
    blurb: "Blood pressure, lipids, endothelial function, and blood flow.",
  },
  {
    slug: "bone-joint",
    title: "Bone & Joint Health",
    blurb: "Bone mineral density, cartilage, tendon, and joint comfort.",
  },
  {
    slug: "sleep",
    title: "Sleep Quality",
    blurb: "Sleep onset, sleep depth, and overnight recovery.",
  },
  {
    slug: "blood-sugar",
    title: "Blood Sugar & Insulin",
    blurb: "Fasting glucose, HbA1c, post-meal spikes, and insulin sensitivity.",
  },
  {
    slug: "skin-hair",
    title: "Skin & Hair",
    blurb: "Skin elasticity, collagen density, wound healing, and hair quality.",
  },
] as const;

export type GoalSlug = (typeof GOALS)[number]["slug"];

export function goalTitle(slug: string): string {
  return GOALS.find((g) => g.slug === slug)?.title ?? slug;
}

/** True when a compound's goal tag maps to a real /goals/<slug> hub page. */
export function isGoalSlug(slug: string): boolean {
  return GOALS.some((g) => g.slug === slug);
}
