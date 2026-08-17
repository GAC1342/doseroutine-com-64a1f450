/**
 * Internal linking plan: /best-* roundups and /for/* use-case pages → the most
 * relevant sections of the retatrutide and orforglipron research posts.
 *
 * Why sections and not just posts: an anchored deep link tells search and
 * answer engines exactly which passage answers the page's topic, and gives
 * readers a landing point instead of the top of a long article.
 *
 * Each entry names a post slug plus the *exact* section heading in that post.
 * `resolveMarketingBlogLinks()` turns the heading into the same anchor id the
 * blog renderer emits (see `sectionAnchorId`) and throws if the heading no
 * longer exists, so a renamed section fails CI instead of shipping a dead
 * fragment. Anchor text is descriptive by rule — never "read more" / "click
 * here" — and states the topic of the destination section.
 */

import { BLOG_POSTS } from "@/lib/blog-posts";
import { sectionAnchorId } from "@/lib/blog-section-anchors";

export type PlannedBlogLink = {
  /** Blog post slug (without /blog/). */
  post: string;
  /** Exact heading text of the target section inside that post. */
  section: string;
  /** Descriptive anchor text. */
  anchor: string;
  /** One line of context shown after the link. */
  blurb: string;
};

export type ResolvedBlogLink = PlannedBlogLink & {
  /** Fully-formed internal href including the section fragment. */
  href: string;
  /** Title of the post the section lives in, for grouping in the UI. */
  postTitle: string;
  /** Href of the post itself (no fragment). */
  postHref: string;
};

const RETA_TRIUMPH = "retatrutide-triumph-phase-3-results";
const RETA_BACWATER = "how-much-bacteriostatic-water-for-10mg-retatrutide";
const ORFO_ORAL = "orforglipron-foundayo-oral-glp-1";
const ORFO_AVAILABLE = "when-will-orforglipron-be-available";
const MISSED_DOSE = "missed-weekly-glp-1-dose-what-to-do";
const FRIDGE_LIFE = "how-long-does-reconstituted-peptide-last-in-the-fridge";
const MG_TO_UNITS = "tirzepatide-mg-to-units-on-an-insulin-syringe";
const SITE_ROTATION = "glp-1-injection-site-rotation-schedule";
const BEST_TIME = "best-time-of-day-to-take-a-weekly-glp-1-injection";
const METFORMIN = "metformin-and-glp-1-together-what-changes";
const PROTEIN = "how-much-protein-while-on-a-glp-1";
const VIAL_BAD = "signs-a-peptide-vial-has-gone-bad";

/** Reusable link definitions so the same section is described consistently. */
const L = {
  retaWhatItIs: {
    post: RETA_TRIUMPH,
    section: "What retatrutide actually is",
    anchor: "what retatrutide actually is, and how a triple agonist differs",
    blurb: "GLP-1, GIP and glucagon receptor activity explained in plain terms.",
  },
  retaResults: {
    post: RETA_TRIUMPH,
    section: "What the TRIUMPH readouts changed",
    anchor: "what the retatrutide TRIUMPH phase 3 readouts changed",
    blurb: "The weight-loss numbers, and what the trials did not measure.",
  },
  retaUnanswered: {
    post: RETA_TRIUMPH,
    section: "What is still unanswered",
    anchor: "the open questions still left by retatrutide trials",
    blurb: "Durability, lean-mass loss and long-term safety gaps.",
  },
  retaTracking: {
    post: RETA_TRIUMPH,
    section: "What this means if you are tracking a stack",
    anchor: "tracking a retatrutide stack alongside the rest of your protocol",
    blurb: "What to log week to week so titration decisions have data behind them.",
  },
  retaFormula: {
    post: RETA_BACWATER,
    section: "The one formula that covers every vial",
    anchor: "the retatrutide reconstitution formula for any vial size",
    blurb: "Concentration = mg in the vial ÷ mL of bacteriostatic water.",
  },
  retaDilutions: {
    post: RETA_BACWATER,
    section: "Common dilutions for a 10 mg vial",
    anchor: "common bacteriostatic water dilutions for a 10 mg retatrutide vial",
    blurb: "Units per dose at 1 mL, 2 mL, 2.5 mL and 5 mL.",
  },
  retaErrors: {
    post: RETA_BACWATER,
    section: "Why people get this wrong",
    anchor: "the retatrutide dosing errors that cause 10x mistakes",
    blurb: "Unit mix-ups, copied protocols and unreadably small draws.",
  },
  retaStorage: {
    post: RETA_BACWATER,
    section: "Storage after reconstitution",
    anchor: "storing retatrutide after reconstitution",
    blurb: "Fridge limits and what shortens a mixed vial's life.",
  },
  orfoSmallMolecule: {
    post: ORFO_ORAL,
    section: "Why 'small molecule' is the headline",
    anchor: "why orforglipron being a small molecule is the headline",
    blurb: "No peptide handling, no injection, no food-timing ritual.",
  },
  orfoResults: {
    post: ORFO_ORAL,
    section: "How it stacks up on results",
    anchor: "how orforglipron's results compare with injectable GLP-1s",
    blurb: "Where the oral pill lands against semaglutide and tirzepatide.",
  },
  orfoTradeoffs: {
    post: ORFO_ORAL,
    section: "The practical trade-offs",
    anchor: "the practical trade-offs of an oral GLP-1 like orforglipron",
    blurb: "Daily adherence, tolerability and cost realities.",
  },
  orfoSwitching: {
    post: ORFO_ORAL,
    section: "If you are switching or stacking",
    anchor: "switching to or stacking orforglipron with an existing protocol",
    blurb: "What changes in your schedule when a daily oral replaces a weekly shot.",
  },
  orfoTimeline: {
    post: ORFO_AVAILABLE,
    section: "What has to happen before you can fill a prescription",
    anchor: "when orforglipron will actually be available to prescribe",
    blurb: "The regulatory steps between approval headlines and a pharmacy shelf.",
  },
  orfoWhyDifferent: {
    post: ORFO_AVAILABLE,
    section: "Why an oral small molecule is different",
    anchor: "why an oral small molecule scales differently to peptides",
    blurb: "Manufacturing and supply constraints that shaped GLP-1 shortages.",
  },
  orfoTrackDate: {
    post: ORFO_AVAILABLE,
    section: "How to track the real date yourself",
    anchor: "how to track the real orforglipron launch date yourself",
    blurb: "Primary regulatory sources rather than second-hand posts.",
  },
  missedWindows: {
    post: MISSED_DOSE,
    section: "The windows, and why they differ",
    anchor: "how long you have to take a missed weekly GLP-1 dose",
    blurb: "The label windows for each drug, and why they are not the same.",
  },
  missedRetitrate: {
    post: MISSED_DOSE,
    section: "When you need to re-titrate instead of resume",
    anchor: "when a missed GLP-1 dose means re-titrating instead of resuming",
    blurb: "How long a gap has to be before tolerance is gone.",
  },
  missedMoveDay: {
    post: MISSED_DOSE,
    section: "Moving your injection day",
    anchor: "how to move your weekly injection day safely",
    blurb: "The minimum spacing between doses when you shift the schedule.",
  },
  fridgeClocks: {
    post: FRIDGE_LIFE,
    section: "The two clocks",
    anchor: "the two expiry clocks on a reconstituted peptide vial",
    blurb: "Chemical stability versus sterility after the stopper is pierced.",
  },
  fridgeHandling: {
    post: FRIDGE_LIFE,
    section: "Practical handling that actually matters",
    anchor: "fridge handling that actually changes peptide shelf life",
    blurb: "Temperature swings, light and repeated stopper punctures.",
  },
  fridgeTravel: {
    post: FRIDGE_LIFE,
    section: "Travel and the cold chain",
    anchor: "keeping the cold chain intact while travelling with peptides",
    blurb: "What survives a flight and what quietly degrades in a hot car.",
  },
  unitsExamples: {
    post: MG_TO_UNITS,
    section: "Worked examples at common concentrations",
    anchor: "worked mg-to-unit conversions on an insulin syringe",
    blurb: "Unit draws for the concentrations most vials end up at.",
  },
  unitsConfusion: {
    post: MG_TO_UNITS,
    section: "Why 'units' confuses people",
    anchor: "why insulin units are not milligrams",
    blurb: "The volume-versus-mass mix-up behind most 10x dosing errors.",
  },
  unitsErrors: {
    post: MG_TO_UNITS,
    section: "Reducing the chance of an error",
    anchor: "reducing dosing errors when drawing from a vial",
    blurb: "Double-checks that catch a misread syringe before you inject.",
  },
  rotationSchedule: {
    post: SITE_ROTATION,
    section: "The four-week rotation",
    anchor: "a four-week injection site rotation schedule",
    blurb: "A repeatable pattern that keeps sites a full month apart.",
  },
  rotationWhy: {
    post: SITE_ROTATION,
    section: "Why rotation matters more than technique",
    anchor: "why site rotation matters more than injection technique",
    blurb: "Lipohypertrophy and the absorption problems it creates.",
  },
  rotationChecks: {
    post: SITE_ROTATION,
    section: "Checking your own sites",
    anchor: "how to check your own injection sites for damage",
    blurb: "What lumps, dimples and firm patches are telling you.",
  },
  timingPharmacology: {
    post: BEST_TIME,
    section: "The pharmacology, briefly",
    anchor: "why a weekly GLP-1's half-life makes timing mostly irrelevant",
    blurb: "Steady-state levels versus the day you happen to inject.",
  },
  timingWhereItHelps: {
    post: BEST_TIME,
    section: "Where timing does help",
    anchor: "where GLP-1 injection timing genuinely does help",
    blurb: "Nausea patterns, sleep and fitting side effects around your week.",
  },
  timingTrackFirst: {
    post: BEST_TIME,
    section: "Track it before you tinker",
    anchor: "tracking side effects before changing your injection timing",
    blurb: "How many weeks of data you need before a change means anything.",
  },
  metforminOverlap: {
    post: METFORMIN,
    section: "The overlap that catches people out",
    anchor: "the side-effect overlap between metformin and a GLP-1",
    blurb: "Stacked GI effects that get blamed on the wrong drug.",
  },
  metforminActions: {
    post: METFORMIN,
    section: "The interactions that actually need action",
    anchor: "metformin and GLP-1 interactions that need action",
    blurb: "The combinations worth raising with your prescriber.",
  },
  metforminMonitor: {
    post: METFORMIN,
    section: "What to monitor",
    anchor: "what to monitor when combining metformin with a GLP-1",
    blurb: "Labs and symptoms worth logging on the combination.",
  },
  proteinLeanMass: {
    post: PROTEIN,
    section: "Why lean mass is the thing being protected",
    anchor: "why protein intake protects lean mass on a GLP-1",
    blurb: "What the body loses first when appetite drops hard.",
  },
  proteinHitting: {
    post: PROTEIN,
    section: "Hitting the number when you are not hungry",
    anchor: "hitting your protein target when appetite is suppressed",
    blurb: "Practical ways to reach the target on very low appetite.",
  },
  proteinTraining: {
    post: PROTEIN,
    section: "The training half of it",
    anchor: "the resistance training half of protecting lean mass",
    blurb: "Why protein alone does not keep muscle during rapid loss.",
  },
  vialPowder: {
    post: VIAL_BAD,
    section: "Before mixing: check the powder",
    anchor: "checking lyophilised peptide powder before you mix it",
    blurb: "Cake appearance, colour and moisture that signal a bad vial.",
  },
  vialSolution: {
    post: VIAL_BAD,
    section: "After mixing: what a good solution looks like",
    anchor: "what a correctly reconstituted peptide solution looks like",
    blurb: "Clarity, particulates and cloudiness after mixing.",
  },
  vialHidden: {
    post: VIAL_BAD,
    section: "The failure modes you cannot see",
    anchor: "the peptide degradation you cannot see in the vial",
    blurb: "Potency loss that leaves the solution looking perfectly fine.",
  },
} satisfies Record<string, PlannedBlogLink>;

/**
 * The plan. Keys are roundup slugs (`best-*`) and use-case slugs (`/for/<key>`).
 * Every page gets at least one retatrutide section and one orforglipron
 * section, chosen for what that page's visitor is actually trying to do.
 */
export const MARKETING_BLOG_LINKS: Record<string, PlannedBlogLink[]> = {
  // Roundups
  "best-glp-1-tracking-app": [
    L.retaResults,
    L.orfoResults,
    L.orfoSwitching,
    L.missedWindows,
    L.timingWhereItHelps,
    L.retaTracking,
  ],
  "best-peptide-tracking-app": [
    L.retaFormula,
    L.retaDilutions,
    L.unitsExamples,
    L.fridgeClocks,
    L.vialSolution,
    L.orfoSmallMolecule,
  ],
  "best-app-for-tracking-peptides-supplements-hormones": [
    L.retaTracking,
    L.retaStorage,
    L.fridgeHandling,
    L.unitsConfusion,
    L.metforminActions,
    L.orfoSwitching,
  ],
  "best-supplement-tracker-app": [
    L.retaWhatItIs,
    L.orfoTradeoffs,
    L.proteinLeanMass,
    L.metforminOverlap,
    L.retaTracking,
  ],
  "best-biohacking-tracker-app": [
    L.retaUnanswered,
    L.orfoWhyDifferent,
    L.timingPharmacology,
    L.vialHidden,
    L.retaResults,
  ],
  "best-health-stack-insights-app": [
    L.retaTracking,
    L.orfoResults,
    L.timingTrackFirst,
    L.metforminMonitor,
    L.retaUnanswered,
  ],
  "best-trt-tracking-app": [
    L.retaTracking,
    L.orfoSwitching,
    L.retaErrors,
    L.rotationSchedule,
    L.unitsExamples,
  ],
  "best-hormone-therapy-app-for-men": [
    L.retaResults,
    L.orfoTradeoffs,
    L.rotationWhy,
    L.fridgeTravel,
    L.retaTracking,
  ],

  // Use cases
  "glp-1": [
    L.retaResults,
    L.orfoTimeline,
    L.orfoSwitching,
    L.missedWindows,
    L.missedRetitrate,
    L.proteinHitting,
    L.retaTracking,
  ],
  peptides: [
    L.retaFormula,
    L.retaErrors,
    L.unitsExamples,
    L.fridgeClocks,
    L.vialPowder,
    L.orfoSmallMolecule,
  ],
  trt: [
    L.retaTracking,
    L.orfoTradeoffs,
    L.retaStorage,
    L.rotationSchedule,
    L.rotationChecks,
    L.unitsConfusion,
  ],
  biohackers: [
    L.retaUnanswered,
    L.orfoWhyDifferent,
    L.orfoTrackDate,
    L.timingTrackFirst,
    L.proteinTraining,
    L.vialHidden,
  ],
};

export type ResolvedBlogLinkGroup = {
  post: string;
  postTitle: string;
  postHref: string;
  links: ResolvedBlogLink[];
};

/** Group a page's resolved links by source post, preserving plan order. */
export function groupMarketingBlogLinks(pageKey: string): ResolvedBlogLinkGroup[] {
  const groups: ResolvedBlogLinkGroup[] = [];
  for (const link of resolveMarketingBlogLinks(pageKey)) {
    let group = groups.find((g) => g.post === link.post);
    if (!group) {
      group = {
        post: link.post,
        postTitle: link.postTitle,
        postHref: link.postHref,
        links: [],
      };
      groups.push(group);
    }
    group.links.push(link);
  }
  return groups;
}

/** Resolve a page's planned links into hrefs, validating post + section exist. */
export function resolveMarketingBlogLinks(pageKey: string): ResolvedBlogLink[] {
  const planned = MARKETING_BLOG_LINKS[pageKey];
  if (!planned) return [];
  return planned.map((link) => {
    const post = BLOG_POSTS.find((p) => p.slug === link.post);
    if (!post) {
      throw new Error(`Internal link plan: unknown blog post "${link.post}" (page ${pageKey})`);
    }
    const section = post.sections.find((s) => s.heading === link.section);
    if (!section) {
      throw new Error(
        `Internal link plan: post "${link.post}" has no section "${link.section}" (page ${pageKey})`,
      );
    }
    return {
      ...link,
      href: `/blog/${post.slug}#${sectionAnchorId(section.heading)}`,
      postTitle: post.heading,
      postHref: `/blog/${post.slug}`,
    };
  });
}
