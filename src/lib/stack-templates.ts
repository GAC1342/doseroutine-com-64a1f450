// Curated starter stacks. Each item references a compound by slug (must exist in public.compounds).
// Frequencies match user_compounds schema: 'daily' | 'weekly' | 'as_needed' | 'twice_weekly' | etc.
// Not medical advice — templates are conservative starting points users can edit before saving.

export type TemplateItem = {
  slug: string;
  dose: number;
  unit: string;
  frequency: "daily" | "weekly" | "twice_weekly" | "as_needed";
  days?: number[]; // 0=Sun..6=Sat, used when frequency==='weekly' or 'twice_weekly'
  times: string[]; // ["08:00"]
  with_food?: boolean;
  notes?: string;
};

export type StackTemplate = {
  id: string;
  name: string;
  tagline: string;
  category:
    | "Hormones"
    | "Peptides"
    | "Longevity"
    | "Metabolic"
    | "Sleep"
    | "Cognitive"
    | "Recovery";
  emoji: string;
  description: string;
  disclaimer?: string;
  items: TemplateItem[];
};

export const STACK_TEMPLATES: StackTemplate[] = [
  {
    id: "trt-starter",
    name: "TRT Starter",
    tagline: "Testosterone + aromatase control + HPTA support",
    category: "Hormones",
    emoji: "💉",
    description:
      "A conservative TRT protocol: twice-weekly testosterone cypionate with low-dose anastrozole as needed and HCG to preserve testicular function. Always start with a physician and baseline labs.",
    disclaimer:
      "Prescription-only in most jurisdictions. Titrate based on labs (total T, free T, E2, hematocrit).",
    items: [
      {
        slug: "testosterone-cypionate",
        dose: 100,
        unit: "mg",
        frequency: "twice_weekly",
        days: [1, 4],
        times: ["08:00"],
        notes: "Split weekly dose (e.g. 200mg/wk → 100mg Mon/Thu)",
      },
      {
        slug: "hcg",
        dose: 500,
        unit: "IU",
        frequency: "twice_weekly",
        days: [1, 4],
        times: ["08:00"],
        notes: "Preserves testicular volume and fertility",
      },
      {
        slug: "anastrozole",
        dose: 0.25,
        unit: "mg",
        frequency: "as_needed",
        times: ["08:00"],
        notes: "Only if E2 elevated on labs — most men don't need it",
      },
    ],
  },
  {
    id: "glp1-titration",
    name: "GLP-1 Titration",
    tagline: "Semaglutide standard 4-dose ramp",
    category: "Metabolic",
    emoji: "⚖️",
    description:
      "Standard semaglutide dose escalation. Start at 0.25mg weekly and titrate up every 4 weeks to reduce GI side effects.",
    disclaimer: "Adjust titration speed based on tolerance. Not for type 1 diabetes.",
    items: [
      {
        slug: "semaglutide",
        dose: 0.25,
        unit: "mg",
        frequency: "weekly",
        days: [0],
        times: ["09:00"],
        notes: "Weeks 1–4. Increase to 0.5mg after 4 weeks if tolerated.",
      },
    ],
  },
  {
    id: "bpc-tb500-healing",
    name: "Injury Recovery",
    tagline: "BPC-157 + TB-500 for tendon/soft tissue",
    category: "Peptides",
    emoji: "🩹",
    description:
      "Popular healing stack for tendon, ligament, and soft-tissue injuries. Typical 4–6 week cycle. BPC-157 daily, TB-500 loading dose then weekly.",
    items: [
      {
        slug: "bpc-157",
        dose: 250,
        unit: "mcg",
        frequency: "daily",
        times: ["08:00", "20:00"],
        notes: "250mcg subq 2x/day near injury site if possible",
      },
      {
        slug: "tb-500",
        dose: 2,
        unit: "mg",
        frequency: "weekly",
        days: [1],
        times: ["08:00"],
        notes: "Loading: 2mg 2x/week for 4 weeks, then 2mg/week maintenance",
      },
    ],
  },
  {
    id: "longevity-core",
    name: "Longevity Core",
    tagline: "Evidence-based daily foundation",
    category: "Longevity",
    emoji: "🌱",
    description:
      "The daily foundation most longevity protocols agree on: Vitamin D3, Omega-3, Magnesium, and Creatine. Cheap, safe, well-studied.",
    items: [
      {
        slug: "vitamin-d3",
        dose: 5000,
        unit: "IU",
        frequency: "daily",
        times: ["08:00"],
        with_food: true,
        notes: "Target 25(OH)D 40–60 ng/mL",
      },
      {
        slug: "omega-3",
        dose: 2,
        unit: "g",
        frequency: "daily",
        times: ["08:00"],
        with_food: true,
        notes: "Combined EPA+DHA",
      },
      {
        slug: "magnesium-glycinate",
        dose: 400,
        unit: "mg",
        frequency: "daily",
        times: ["21:00"],
        notes: "Evening — supports sleep",
      },
      {
        slug: "creatine",
        dose: 5,
        unit: "g",
        frequency: "daily",
        times: ["08:00"],
        notes: "Any time works; consistency matters more than timing",
      },
    ],
  },
  {
    id: "sleep-stack",
    name: "Sleep Stack",
    tagline: "Wind-down protocol",
    category: "Sleep",
    emoji: "🌙",
    description:
      "Gentle wind-down stack. Magnesium glycinate for muscle relaxation, L-theanine for calm, low-dose melatonin for sleep-onset (not maintenance).",
    items: [
      { slug: "magnesium-glycinate", dose: 400, unit: "mg", frequency: "daily", times: ["21:00"] },
      { slug: "l-theanine", dose: 200, unit: "mg", frequency: "daily", times: ["21:00"] },
      {
        slug: "melatonin",
        dose: 0.3,
        unit: "mg",
        frequency: "daily",
        times: ["21:30"],
        notes: "Low dose (0.3mg) works better than 5–10mg for most people",
      },
    ],
  },
  {
    id: "cognitive-focus",
    name: "Cognitive Focus",
    tagline: "AM stack for clean energy",
    category: "Cognitive",
    emoji: "🧠",
    description:
      "Morning stack for focus and mental clarity. Methylene blue at very low dose (do not combine with SSRIs), L-theanine to smooth caffeine, ashwagandha for stress modulation.",
    disclaimer:
      "Do NOT take methylene blue with SSRIs, SNRIs, MAOIs, or other serotonergic drugs — serotonin syndrome risk.",
    items: [
      {
        slug: "methylene-blue",
        dose: 5,
        unit: "mg",
        frequency: "daily",
        times: ["08:00"],
        notes: "USP grade only. Stains everything blue.",
      },
      {
        slug: "l-theanine",
        dose: 200,
        unit: "mg",
        frequency: "daily",
        times: ["08:00"],
        notes: "Pair with morning coffee",
      },
      {
        slug: "ashwagandha",
        dose: 600,
        unit: "mg",
        frequency: "daily",
        times: ["08:00"],
        with_food: true,
      },
    ],
  },
  {
    id: "nad-longevity",
    name: "NAD+ Longevity",
    tagline: "Cellular energy support",
    category: "Longevity",
    emoji: "⚡",
    description:
      "Weekly sublingual NAD+ with liposomal glutathione for antioxidant support. Popular anti-aging stack.",
    items: [
      {
        slug: "nad-sublingual",
        dose: 50,
        unit: "mg",
        frequency: "daily",
        times: ["08:00"],
        notes: "Sublingual dissolves under tongue for 60–90s",
      },
      {
        slug: "liposomal-glutathione",
        dose: 500,
        unit: "mg",
        frequency: "daily",
        times: ["08:00"],
      },
    ],
  },
  {
    id: "recovery-basics",
    name: "Training Recovery",
    tagline: "Support hard training",
    category: "Recovery",
    emoji: "🏋️",
    description:
      "Foundational recovery stack for lifters and athletes. Creatine for performance, magnesium for sleep and cramping, omega-3 for inflammation.",
    items: [
      { slug: "creatine", dose: 5, unit: "g", frequency: "daily", times: ["08:00"] },
      {
        slug: "omega-3",
        dose: 3,
        unit: "g",
        frequency: "daily",
        times: ["08:00"],
        with_food: true,
      },
      { slug: "magnesium-glycinate", dose: 400, unit: "mg", frequency: "daily", times: ["21:00"] },
      {
        slug: "ashwagandha",
        dose: 600,
        unit: "mg",
        frequency: "daily",
        times: ["21:00"],
        with_food: true,
        notes: "May lower cortisol and support recovery",
      },
    ],
  },
];
