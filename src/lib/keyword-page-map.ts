/**
 * Keyword → page map for the medication-reminder query family.
 *
 * One page owns each primary keyword. Everything else is a supporting term
 * that page should cover in its body copy, headings or FAQ — never a reason to
 * create a second page (that is how sites cannibalise their own rankings).
 *
 * Volume / CPC / difficulty are Semrush estimates (US database, Aug 2026).
 * They are planning inputs, not facts to publish on the site.
 */

export type KeywordIntent =
  | "commercial" // comparing / choosing an app
  | "transactional" // ready to install
  | "informational" // learning how or why
  | "navigational"; // looking for a named competitor

export type FunnelStage = "awareness" | "consideration" | "decision";

export type KeywordTarget = {
  /** The one keyword this page is allowed to compete for. */
  primaryKeyword: string;
  /** Semrush estimated US monthly searches. */
  volume: number;
  /** Semrush keyword difficulty, 0–100. Under ~30 is realistic quickly. */
  difficulty: number | null;
  intent: KeywordIntent;
  stage: FunnelStage;
  cluster: KeywordCluster;
  /** Route the keyword should rank with. */
  targetPath: string;
  /** Whether that route already exists in the app. */
  status: "live" | "planned";
  /** Terms the target page should also cover — not separate pages. */
  supportingKeywords: string[];
  /** People-also-ask style questions the page should answer directly. */
  questions: string[];
  /** What the page must do for the visitor to satisfy the intent. */
  pageJob: string;
};

export type KeywordCluster =
  | "Hub: medication reminder app"
  | "Best-of roundups"
  | "Platform (iOS / Android)"
  | "Audience"
  | "Competitor alternatives"
  | "How-to / setup"
  | "Product surfaces";

export const KEYWORD_CLUSTERS: KeywordCluster[] = [
  "Hub: medication reminder app",
  "Best-of roundups",
  "Platform (iOS / Android)",
  "Audience",
  "Competitor alternatives",
  "How-to / setup",
  "Product surfaces",
];

export const KEYWORD_PAGE_MAP: KeywordTarget[] = [
  // ── Hub ────────────────────────────────────────────────────────────────
  {
    primaryKeyword: "medication reminder app",
    volume: 1900,
    difficulty: 56,
    intent: "commercial",
    stage: "consideration",
    cluster: "Hub: medication reminder app",
    targetPath: "/best-medication-reminder-app",
    status: "live",
    supportingKeywords: [
      "med reminder app",
      "drug reminder app",
      "medication reminder",
      "medication reminders",
      "medicine app",
    ],
    questions: [
      "Is there an app to remind you to take medication?",
      "What is the best medication reminder app?",
      "Do medication reminder apps improve health?",
    ],
    pageJob:
      "Hub page: explain what a reminder app does, who each type suits, and route visitors to the roundup, platform and audience pages.",
  },
  {
    primaryKeyword: "pill reminder app",
    volume: 1600,
    difficulty: 55,
    intent: "commercial",
    stage: "consideration",
    cluster: "Hub: medication reminder app",
    targetPath: "/articles/pill-reminder-app",
    status: "live",
    supportingKeywords: ["pill reminder", "med reminder", "am pm pill reminder", "pill alarm app"],
    questions: [
      "What is the best pill reminder app?",
      "What is the best pill reminder app without ads?",
    ],
    pageJob:
      "Cover the simpler 'just remind me to take a pill' intent and show when a fuller tracker is worth it.",
  },
  {
    primaryKeyword: "medication tracker app",
    volume: 480,
    difficulty: null,
    intent: "commercial",
    stage: "consideration",
    cluster: "Hub: medication reminder app",
    targetPath: "/articles/medication-reminder-app",
    status: "live",
    supportingKeywords: [
      "medication tracker",
      "medication tracking",
      "medicine tracker",
      "medication app",
    ],
    questions: ["What is the difference between a reminder app and a medication tracker?"],
    pageJob:
      "Explain tracking (history, adherence, doctor reports) as distinct from alerts — the differentiator for DoseRoutine.",
  },

  // ── Best-of roundups ───────────────────────────────────────────────────
  {
    primaryKeyword: "best medication reminder apps",
    volume: 880,
    difficulty: null,
    intent: "commercial",
    stage: "decision",
    cluster: "Best-of roundups",
    targetPath: "/articles/best-medication-reminder-apps",
    status: "live",
    supportingKeywords: [
      "what are the best apps for setting medication reminders",
      "top medication reminder apps",
    ],
    questions: ["What is the best medication reminder app right now?"],
    pageJob: "Ranked roundup with an honest comparison table and clear 'who each app is for'.",
  },
  {
    primaryKeyword: "best apps for managing prescriptions",
    volume: 2900,
    difficulty: null,
    intent: "commercial",
    stage: "decision",
    cluster: "Best-of roundups",
    targetPath: "/articles/best-apps-managing-prescriptions",
    status: "live",
    supportingKeywords: ["prescription app", "prescription manager app", "prescription tracker"],
    questions: ["What app helps manage multiple prescriptions?"],
    pageJob:
      "Highest-volume term in the family: focus on multi-prescription households, refills and interactions.",
  },
  {
    primaryKeyword: "free medication reminder app",
    volume: 320,
    difficulty: null,
    intent: "commercial",
    stage: "decision",
    cluster: "Best-of roundups",
    targetPath: "/articles/best-free-medication-reminder-apps",
    status: "live",
    supportingKeywords: [
      "medication reminder app free",
      "pill reminder app without ads",
      "free pill reminder",
    ],
    questions: ["What is the best medication reminder app without ads?"],
    pageJob:
      "State plainly what is free in each app, including DoseRoutine's free tier — price honesty converts here.",
  },

  // ── Platform ───────────────────────────────────────────────────────────
  {
    primaryKeyword: "medication reminder app iphone",
    volume: 260,
    difficulty: null,
    intent: "transactional",
    stage: "decision",
    cluster: "Platform (iOS / Android)",
    targetPath: "/articles/best-medication-reminder-apps-iphone",
    status: "live",
    supportingKeywords: [
      "ios medication reminder",
      "iphone pill reminder app",
      "apple health meds",
    ],
    questions: [
      "How to set pill reminders on iPhone?",
      "How to set up medication reminder in the Health app?",
    ],
    pageJob: "iOS-specific setup, Health app sync and Apple notification limits.",
  },
  {
    primaryKeyword: "medication reminder app android",
    volume: 210,
    difficulty: null,
    intent: "transactional",
    stage: "decision",
    cluster: "Platform (iOS / Android)",
    targetPath: "/articles/best-medication-reminder-apps-android",
    status: "live",
    supportingKeywords: ["android pill reminder", "how to set reminder in android"],
    questions: ["How do I stop Android battery settings from killing my reminders?"],
    pageJob: "Android setup, battery-optimisation gotchas and exact-alarm permissions.",
  },

  // ── Audience ───────────────────────────────────────────────────────────
  {
    primaryKeyword: "pill reminder app for seniors",
    volume: 170,
    difficulty: null,
    intent: "commercial",
    stage: "decision",
    cluster: "Audience",
    targetPath: "/articles/best-pill-reminder-apps-for-seniors",
    status: "live",
    supportingKeywords: [
      "medication reminder for elderly",
      "how to remind elderly to take pills",
      "large text pill reminder",
    ],
    questions: [
      "How do I remind an elderly parent to take their pills?",
      "Can a caregiver see if a dose was taken?",
    ],
    pageJob: "Accessibility, caregiver visibility and simple setup someone else can do.",
  },
  {
    primaryKeyword: "glp-1 dose reminder app",
    volume: 140,
    difficulty: null,
    intent: "commercial",
    stage: "decision",
    cluster: "Audience",
    targetPath: "/best-glp-1-tracking-app",
    status: "live",
    supportingKeywords: [
      "weekly injection reminder",
      "semaglutide reminder app",
      "shot day tracker",
    ],
    questions: ["How do I remember a weekly injection instead of a daily pill?"],
    pageJob: "Weekly-cadence reminders, titration schedules and injection-site rotation.",
  },
  {
    primaryKeyword: "supplement reminder app",
    volume: 210,
    difficulty: null,
    intent: "commercial",
    stage: "consideration",
    cluster: "Audience",
    targetPath: "/best-supplement-tracker-app",
    status: "live",
    supportingKeywords: ["vitamin reminder app", "supplement tracker", "stack reminder"],
    questions: ["Can one app handle both prescriptions and supplements?"],
    pageJob:
      "Bridge the supplement audience into the medication-reminder family and cover interaction timing.",
  },

  // ── Competitor alternatives ────────────────────────────────────────────
  {
    primaryKeyword: "medisafe alternative",
    volume: 320,
    difficulty: null,
    intent: "navigational",
    stage: "decision",
    cluster: "Competitor alternatives",
    targetPath: "/vs/medisafe",
    status: "live",
    supportingKeywords: ["medisafe app", "medisafe vs", "apps like medisafe"],
    questions: ["Is there a Medisafe alternative without ads?"],
    pageJob: "Fair side-by-side comparison; be specific about what Medisafe does better too.",
  },
  {
    primaryKeyword: "mytherapy alternative",
    volume: 170,
    difficulty: null,
    intent: "navigational",
    stage: "decision",
    cluster: "Competitor alternatives",
    targetPath: "/vs/mytherapy",
    status: "live",
    supportingKeywords: ["mytherapy app", "my therapy app", "apps like mytherapy"],
    questions: ["How does DoseRoutine compare with MyTherapy?"],
    pageJob: "Comparison focused on tracking depth, exports and privacy.",
  },
  {
    primaryKeyword: "pill reminder app alternative",
    volume: 90,
    difficulty: null,
    intent: "navigational",
    stage: "decision",
    cluster: "Competitor alternatives",
    targetPath: "/vs/pill-reminder",
    status: "live",
    supportingKeywords: ["pill reminder app vs", "switch from pill reminder"],
    questions: ["What should I use instead of a basic pill reminder?"],
    pageJob: "Capture switchers from alert-only apps.",
  },
  {
    primaryKeyword: "round health alternative",
    volume: 70,
    difficulty: null,
    intent: "navigational",
    stage: "decision",
    cluster: "Competitor alternatives",
    targetPath: "/vs/round-health",
    status: "live",
    supportingKeywords: ["round health app", "apps like round health"],
    questions: ["Is there a Round Health alternative on Android?"],
    pageJob: "Comparison, with the Android availability gap called out.",
  },

  // ── How-to / setup ─────────────────────────────────────────────────────
  {
    primaryKeyword: "how to set up medication reminder in health app",
    volume: 50,
    difficulty: null,
    intent: "informational",
    stage: "awareness",
    cluster: "How-to / setup",
    targetPath: "/articles/set-up-medication-reminder-health-app",
    status: "live",
    supportingKeywords: [
      "apple health medication reminder",
      "iphone medication schedule",
      "health app meds setup",
    ],
    questions: [
      "How do I add a medication to the Health app?",
      "Why aren't my Health app reminders showing?",
    ],
    pageJob: "Step-by-step walkthrough with screenshots, then the limits of the built-in feature.",
  },
  {
    primaryKeyword: "medication adherence tracking",
    volume: 260,
    difficulty: null,
    intent: "informational",
    stage: "awareness",
    cluster: "How-to / setup",
    targetPath: "/adherence",
    status: "live",
    supportingKeywords: ["adherence rate", "missed dose tracking", "medication compliance"],
    questions: ["What counts as good medication adherence?", "How is adherence calculated?"],
    pageJob: "Define adherence, show how DoseRoutine measures it, link to the doctor report.",
  },
  {
    primaryKeyword: "medication schedule for doctor visit",
    volume: 90,
    difficulty: null,
    intent: "informational",
    stage: "consideration",
    cluster: "How-to / setup",
    targetPath: "/doctor-report",
    status: "live",
    supportingKeywords: ["medication list for doctor", "print medication list", "med list pdf"],
    questions: ["How do I give my doctor a list of everything I take?"],
    pageJob: "Show the exportable report and why bringing one changes the appointment.",
  },
  {
    primaryKeyword: "missed dose what to do",
    volume: 480,
    difficulty: null,
    intent: "informational",
    stage: "awareness",
    cluster: "How-to / setup",
    targetPath: "/articles/missed-dose-what-to-do",
    status: "live",
    supportingKeywords: ["forgot to take medication", "double dose safe", "late dose"],
    questions: ["What should I do if I miss a dose?", "Is it safe to take two doses to catch up?"],
    pageJob:
      "High-volume safety question. Needs careful, sourced guidance plus a clear 'ask your prescriber' boundary.",
  },
  {
    primaryKeyword: "medication reminder for multiple times a day",
    volume: 110,
    difficulty: null,
    intent: "informational",
    stage: "consideration",
    cluster: "How-to / setup",
    targetPath: "/articles/multiple-daily-dose-reminders",
    status: "live",
    supportingKeywords: [
      "twice daily medication reminder",
      "three times a day medication schedule",
      "complex medication schedule app",
    ],
    questions: ["How do I schedule a medication taken three times a day?"],
    pageJob: "Complex-schedule setup guide — the exact case simple alarm apps fail at.",
  },

  // ── Product surfaces (non-blog pages that should rank) ─────────────────
  {
    primaryKeyword: "medication interaction checker",
    volume: 720,
    difficulty: null,
    intent: "transactional",
    stage: "consideration",
    cluster: "Product surfaces",
    targetPath: "/interaction-checker",
    status: "live",
    supportingKeywords: ["drug interaction checker", "supplement interaction checker"],
    questions: ["Can I check whether my medications interact?"],
    pageJob: "Working tool above the fold; explanation and sources underneath.",
  },
  {
    primaryKeyword: "medication reminder app download",
    volume: 90,
    difficulty: null,
    intent: "transactional",
    stage: "decision",
    cluster: "Product surfaces",
    targetPath: "/install",
    status: "live",
    supportingKeywords: ["download medication reminder", "get the app", "install pill reminder"],
    questions: ["Is DoseRoutine on iPhone and Android?"],
    pageJob: "Store links, screenshots and what the free tier includes.",
  },
];

/* ── Derived views ────────────────────────────────────────────────────── */

export function keywordsByCluster(): Array<[KeywordCluster, KeywordTarget[]]> {
  return KEYWORD_CLUSTERS.map(
    (cluster) =>
      [cluster, KEYWORD_PAGE_MAP.filter((k) => k.cluster === cluster)] as [
        KeywordCluster,
        KeywordTarget[],
      ],
  ).filter(([, rows]) => rows.length > 0);
}

/** Total estimated monthly searches the map targets. */
export function totalMappedVolume(rows: KeywordTarget[] = KEYWORD_PAGE_MAP): number {
  return rows.reduce((sum, r) => sum + r.volume, 0);
}

/**
 * Keyword cannibalisation: the same primary keyword (or a supporting term that
 * is another page's primary) pointing at more than one page.
 */
export function findCannibalization(rows: KeywordTarget[] = KEYWORD_PAGE_MAP): Array<{
  keyword: string;
  paths: string[];
}> {
  const owners = new Map<string, Set<string>>();
  const add = (keyword: string, path: string) => {
    const key = keyword.trim().toLowerCase();
    const set = owners.get(key) ?? new Set<string>();
    set.add(path);
    owners.set(key, set);
  };

  for (const row of rows) {
    add(row.primaryKeyword, row.targetPath);
  }
  const primaries = new Set([...owners.keys()]);
  for (const row of rows) {
    for (const supporting of row.supportingKeywords) {
      if (primaries.has(supporting.trim().toLowerCase())) add(supporting, row.targetPath);
    }
  }

  return [...owners.entries()]
    .filter(([, paths]) => paths.size > 1)
    .map(([keyword, paths]) => ({ keyword, paths: [...paths].sort() }));
}

/** Pages that still need to be created. */
export function plannedPages(rows: KeywordTarget[] = KEYWORD_PAGE_MAP): KeywordTarget[] {
  return rows.filter((r) => r.status === "planned");
}

/** CSV for handing the map to a writer or a spreadsheet. */
export function keywordMapToCsv(rows: KeywordTarget[] = KEYWORD_PAGE_MAP): string {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = [
    "Primary keyword",
    "Volume/mo",
    "Difficulty",
    "Intent",
    "Funnel stage",
    "Cluster",
    "Target page",
    "Status",
    "Supporting keywords",
    "Questions to answer",
    "Page job",
  ];
  const lines = rows.map((r) =>
    [
      r.primaryKeyword,
      r.volume,
      r.difficulty ?? "",
      r.intent,
      r.stage,
      r.cluster,
      r.targetPath,
      r.status,
      r.supportingKeywords.join(" | "),
      r.questions.join(" | "),
      r.pageJob,
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}
