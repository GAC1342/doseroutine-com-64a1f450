/**
 * Structured content briefs — one per keyword cluster.
 *
 * A brief is the writing contract for every page in a cluster: the job the
 * page does, the heading skeleton, the FAQs it must answer, and the supporting
 * terms that belong in the body. Keeping them here (rather than in a doc) lets
 * the admin keyword-map view render them next to the keyword that owns a page,
 * and lets tests assert every cluster is briefed.
 */

import {
  KEYWORD_CLUSTERS,
  KEYWORD_PAGE_MAP,
  type KeywordCluster,
  type KeywordTarget,
} from "@/lib/keyword-page-map";

export type BriefSection = {
  /** H2 exactly as it should appear on the page. */
  heading: string;
  /** H3s or bullet beats the section must cover. */
  points: string[];
};

export type ContentBrief = {
  cluster: KeywordCluster;
  /** One sentence: what a visitor from this cluster is actually trying to do. */
  searcherGoal: string;
  /** What the page must deliver for the visit to count as a success. */
  successCriteria: string[];
  /** Target length range, in words. */
  wordCount: [number, number];
  /** Heading skeleton, in order. H1 is always the page title. */
  outline: BriefSection[];
  /** Questions every page in the cluster answers in an FAQ block. */
  faqs: string[];
  /** Vocabulary the body should contain naturally (entities, not keywords to stuff). */
  supportingTerms: string[];
  /** The single action the page pushes toward. */
  primaryCta: string;
  /** Evidence / sourcing expectations for this cluster. */
  evidence: string;
};

export const CONTENT_BRIEFS: ContentBrief[] = [
  {
    cluster: "Hub: medication reminder app",
    searcherGoal:
      "Understand what a medication reminder app does and decide which kind of app fits their situation.",
    successCriteria: [
      "Defines reminder vs. tracker in the first 150 words",
      "Sends the reader to a roundup, platform or audience page within two scrolls",
      "States plainly that DoseRoutine is free to start, no card",
    ],
    wordCount: [1200, 1800],
    outline: [
      {
        heading: "What a medication reminder app actually does",
        points: [
          "Scheduled alerts vs. logged history",
          "Why phone alarms fail for more than one medication",
        ],
      },
      {
        heading: "Reminder app vs. medication tracker",
        points: ["Adherence history", "Doctor-ready exports", "Interaction and timing checks"],
      },
      {
        heading: "Which type fits you",
        points: [
          "One daily pill",
          "Several prescriptions at different times",
          "Weekly injections and supplements",
          "Caregiver managing someone else",
        ],
      },
      {
        heading: "What to look for before you install",
        points: ["Offline reminders", "Ads and paywalls", "Data privacy", "Export options"],
      },
      { heading: "How DoseRoutine handles it", points: ["Free tier scope", "Where to start"] },
    ],
    faqs: [
      "Is there an app to remind you to take medication?",
      "What is the difference between a reminder app and a medication tracker?",
      "Do medication reminder apps actually improve adherence?",
      "Do I need to pay to use DoseRoutine?",
    ],
    supportingTerms: [
      "adherence",
      "dose schedule",
      "refill reminder",
      "pill organizer",
      "notification permissions",
      "caregiver",
    ],
    primaryCta: "Start a free schedule in DoseRoutine",
    evidence: "Cite adherence research for any claim about outcomes; never imply clinical benefit.",
  },
  {
    cluster: "Best-of roundups",
    searcherGoal: "Pick an app today from a shortlist they can trust.",
    successCriteria: [
      "A comparison table above the fold-plus-one",
      "Every app has an explicit 'best for' line",
      "Honest weaknesses listed for DoseRoutine too",
    ],
    wordCount: [1800, 2600],
    outline: [
      { heading: "The short answer", points: ["Top pick, runner-up, best free option"] },
      {
        heading: "How we compared these apps",
        points: ["Criteria", "What we did not test", "Last reviewed date"],
      },
      {
        heading: "Comparison table",
        points: ["Price", "Platforms", "Ads", "Export", "Interaction checks"],
      },
      { heading: "The apps, reviewed", points: ["One H3 per app: who it's for, pros, cons"] },
      { heading: "How to choose", points: ["Decision checklist by situation"] },
    ],
    faqs: [
      "What is the best medication reminder app right now?",
      "What is the best free option?",
      "Which app is best for multiple prescriptions?",
      "Are these apps available on both iPhone and Android?",
    ],
    supportingTerms: [
      "free tier",
      "subscription",
      "ad-free",
      "refill tracking",
      "family sharing",
      "data export",
    ],
    primaryCta: "Compare DoseRoutine side by side",
    evidence: "Pricing and platform claims must be dated and re-checked each quarter.",
  },
  {
    cluster: "Platform (iOS / Android)",
    searcherGoal: "Get reminders working reliably on the phone they already own.",
    successCriteria: [
      "Numbered setup steps a non-technical reader can follow",
      "Covers the OS-specific reason reminders get silenced",
      "Links to the general roundup for app choice",
    ],
    wordCount: [1200, 1800],
    outline: [
      { heading: "Set it up in under five minutes", points: ["Numbered steps with exact taps"] },
      {
        heading: "Why reminders stop appearing",
        points: [
          "iOS: Focus modes, notification summary, Low Power Mode",
          "Android: battery optimisation, exact-alarm permission, OEM task killers",
        ],
      },
      { heading: "Using the built-in health app", points: ["What it does", "Where it stops"] },
      { heading: "Best apps on this platform", points: ["Three picks with 'best for' lines"] },
    ],
    faqs: [
      "How do I set pill reminders on this phone?",
      "Why aren't my medication reminders showing up?",
      "Do reminders work without internet?",
      "Can reminders repeat several times a day?",
    ],
    supportingTerms: [
      "notification permission",
      "exact alarm",
      "battery optimisation",
      "Focus mode",
      "Apple Health",
      "Health Connect",
    ],
    primaryCta: "Install DoseRoutine on this device",
    evidence: "Name the OS version any setting path was verified on.",
  },
  {
    cluster: "Audience",
    searcherGoal: "Find an app that fits a specific person or regimen, not a generic pill alarm.",
    successCriteria: [
      "Speaks to the audience's actual constraint in the intro",
      "Covers the accessibility or cadence detail generic roundups skip",
      "Offers a setup path someone else can complete on their behalf",
    ],
    wordCount: [1400, 2000],
    outline: [
      { heading: "What makes this different", points: ["The constraint generic apps miss"] },
      { heading: "Features that matter here", points: ["Ranked, with why each matters"] },
      { heading: "Setting it up", points: ["Steps, including setup by a caregiver or partner"] },
      { heading: "Recommended apps", points: ["Picks with 'best for' lines"] },
    ],
    faqs: [
      "Which app suits this situation best?",
      "Can someone else see whether a dose was taken?",
      "Does it handle non-daily schedules?",
      "Is there a large-text or simplified mode?",
    ],
    supportingTerms: [
      "caregiver visibility",
      "large text",
      "weekly cadence",
      "titration",
      "injection site rotation",
      "supplement stack",
    ],
    primaryCta: "Set up a schedule for this regimen",
    evidence: "Any dosing cadence example must be generic and paired with a prescriber disclaimer.",
  },
  {
    cluster: "Competitor alternatives",
    searcherGoal: "Decide whether to switch away from an app they already know by name.",
    successCriteria: [
      "Names what the competitor does better, specifically",
      "Feature table with dated, verifiable rows",
      "Describes what switching involves",
    ],
    wordCount: [1200, 1800],
    outline: [
      { heading: "Short verdict", points: ["Who should switch, who should stay"] },
      {
        heading: "Feature comparison",
        points: ["Table: price, ads, export, tracking depth, platforms"],
      },
      { heading: "Where the other app wins", points: ["Two or three genuine strengths"] },
      { heading: "Where DoseRoutine wins", points: ["Tracking depth, exports, privacy"] },
      { heading: "Switching over", points: ["Re-entering a schedule, exporting history"] },
    ],
    faqs: [
      "Is there a good alternative to this app?",
      "Can I move my history across?",
      "Is DoseRoutine free?",
      "Does it show ads?",
    ],
    supportingTerms: ["alternative", "switch", "import history", "ad-free", "privacy policy"],
    primaryCta: "See the full comparison",
    evidence: "Comparison rows must be checkable from public pages; date the review.",
  },
  {
    cluster: "How-to / setup",
    searcherGoal: "Complete one specific task or answer one specific safety question.",
    successCriteria: [
      "Direct answer in the first paragraph, before any preamble",
      "Numbered steps or a decision rule, not an essay",
      "Explicit 'ask your prescriber' boundary on anything clinical",
    ],
    wordCount: [1000, 1600],
    outline: [
      { heading: "The short answer", points: ["Two to three sentences, answer first"] },
      { heading: "Step by step", points: ["Numbered, one action per step"] },
      { heading: "Common exceptions", points: ["Where the general rule does not apply"] },
      { heading: "When to call your prescriber or pharmacist", points: ["Clear triggers"] },
      { heading: "Making it automatic", points: ["How the app removes the decision next time"] },
    ],
    faqs: [
      "What should I do in this situation?",
      "Is the obvious shortcut safe?",
      "How do I stop this happening again?",
      "Who should I ask if I'm unsure?",
    ],
    supportingTerms: [
      "missed dose",
      "double dose",
      "dose spacing",
      "habit anchor",
      "schedule template",
      "pharmacist",
    ],
    primaryCta: "Build the schedule that prevents it",
    evidence:
      "Safety guidance must cite an authority (FDA, NHS, pharmacy body) and never give drug-specific instructions.",
  },
  {
    cluster: "Product surfaces",
    searcherGoal: "Use the tool immediately, or download the app.",
    successCriteria: [
      "Working tool or store links above the fold",
      "Explanation and sourcing below, not before",
      "No paywall surprise — free scope stated on the page",
    ],
    wordCount: [600, 1200],
    outline: [
      { heading: "Use it now", points: ["The tool or the install buttons"] },
      { heading: "How it works", points: ["Method in plain language"] },
      { heading: "Where the data comes from", points: ["Named sources and update cadence"] },
      { heading: "Limits", points: ["What it cannot tell you"] },
    ],
    faqs: [
      "Is this free to use?",
      "Where does the data come from?",
      "Is this medical advice?",
      "Is the app on iPhone and Android?",
    ],
    supportingTerms: ["interaction checker", "free tier", "data sources", "offline", "privacy"],
    primaryCta: "Open the tool",
    evidence: "Name every data source on the page with a last-updated date.",
  },
];

const BY_CLUSTER = new Map<KeywordCluster, ContentBrief>(CONTENT_BRIEFS.map((b) => [b.cluster, b]));

export function briefForCluster(cluster: KeywordCluster): ContentBrief | null {
  return BY_CLUSTER.get(cluster) ?? null;
}

export function briefForPath(path: string): ContentBrief | null {
  const target = KEYWORD_PAGE_MAP.find((r) => r.targetPath === path);
  return target ? briefForCluster(target.cluster) : null;
}

/** Clusters that exist in the keyword map but have no brief yet. */
export function unbriefedClusters(): KeywordCluster[] {
  return KEYWORD_CLUSTERS.filter((c) => !BY_CLUSTER.has(c));
}

/**
 * A page-level brief: the cluster contract merged with the keyword row's own
 * supporting terms and people-also-ask questions. This is what a writer gets.
 */
export type PageBrief = {
  target: KeywordTarget;
  brief: ContentBrief;
  /** Cluster FAQs plus the row's own questions, de-duplicated. */
  faqs: string[];
  /** Cluster vocabulary plus the row's supporting keywords, de-duplicated. */
  supportingTerms: string[];
};

export function pageBrief(path: string): PageBrief | null {
  const target = KEYWORD_PAGE_MAP.find((r) => r.targetPath === path);
  if (!target) return null;
  const brief = briefForCluster(target.cluster);
  if (!brief) return null;
  return {
    target,
    brief,
    faqs: dedupe([...target.questions, ...brief.faqs]),
    supportingTerms: dedupe([...target.supportingKeywords, ...brief.supportingTerms]),
  };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

/** CSV export so a brief can be handed to a writer alongside the keyword map. */
export function briefsToCsv(): string {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = [
    "Cluster",
    "Searcher goal",
    "Word count",
    "Outline",
    "FAQs",
    "Supporting terms",
    "Primary CTA",
    "Evidence",
  ];
  const lines = CONTENT_BRIEFS.map((b) =>
    [
      b.cluster,
      b.searcherGoal,
      `${b.wordCount[0]}-${b.wordCount[1]}`,
      b.outline.map((s) => `${s.heading}: ${s.points.join("; ")}`).join(" | "),
      b.faqs.join(" | "),
      b.supportingTerms.join(" | "),
      b.primaryCta,
      b.evidence,
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}
