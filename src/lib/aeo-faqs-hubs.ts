import type { AeoFaqPair } from "@/lib/aeo";
import { GOALS, type GoalSlug } from "@/lib/goals";

/**
 * FAQ copy for hub/tool pages that previously shipped no FAQPage schema:
 * goal hubs, /compare, /vs, /vs-supplement-planner, /booty-workout.
 *
 * Every pair here is also rendered visibly via <AeoFaq> so the JSON-LD and
 * the on-page text match exactly. Keep answers factual — no invented stats
 * or testimonials.
 */
export const LAST_REVIEWED = "2026-08-03";

/** Per-goal FAQ, derived from each goal's own title/blurb so answers differ by goal. */
function buildGoalFaq(slug: GoalSlug): AeoFaqPair[] {
  const goal = GOALS.find((g) => g.slug === slug);
  if (!goal) return [];
  const { title, blurb } = goal;
  const lower = title.toLowerCase();
  return [
    {
      q: `What compounds does DoseRoutine list for ${lower}?`,
      a: `DoseRoutine's ${title} hub lists compounds tagged in our library for this goal — ${blurb.replace(/\.$/, "")}. Each entry links to a full profile covering mechanism, typical timing, food rules, and documented interactions. The list is a curated starting point for research, not a ranked "best" list or a purchase recommendation.`,
    },
    {
      q: `Is the ${lower} compound list medical advice?`,
      a: `No. The ${title} page is an educational reference, not a treatment plan. It groups compounds that have been studied or discussed in relation to this goal so you have a starting point for your own research or a conversation with a clinician. It does not diagnose a condition or tell you what to take.`,
    },
    {
      q: `How do I track a ${lower} stack in DoseRoutine?`,
      a: `Open any compound from the ${title} list, then add it to your DoseRoutine account. DoseRoutine schedules the dose, sends reminders, and checks it against everything else in your routine for documented interactions before you commit to a combination. Tracking requires a free account; browsing the compound profiles does not.`,
    },
    {
      q: `Does DoseRoutine check interactions between ${lower} compounds?`,
      a: `Yes. Once compounds from this list are in your DoseRoutine routine, the built-in interaction checker screens every pair against its database and flags documented cautions, spacing rules, or combinations to avoid. This works the same way whether the items are supplements, peptides, or prescribed hormones — the check runs across your whole routine, not just this list.`,
    },
    {
      q: `Are the compounds on this list proven to work for ${lower}?`,
      a: `Evidence varies by compound — some have controlled human trials for this goal, others have only preliminary or animal research, and DoseRoutine does not claim otherwise on this page. Open a compound's full profile to see what kind of evidence exists for it before deciding whether it fits your situation.`,
    },
  ];
}

const GOAL_FAQ_ENTRIES = GOALS.map((g) => [g.slug, buildGoalFaq(g.slug)] as const);

/** Map of goal slug -> FAQ pairs, keyed the same way as GOALS. */
export const GOAL_HUB_FAQS: Record<GoalSlug, AeoFaqPair[]> = Object.fromEntries(
  GOAL_FAQ_ENTRIES,
) as Record<GoalSlug, AeoFaqPair[]>;

export const COMPARE_FAQ: AeoFaqPair[] = [
  {
    q: "Is the DoseRoutine compare tool free?",
    a: "Yes. Pick any two compounds from the search box and DoseRoutine shows category, half-life, typical timing, food rules, and whether they're injectable or controlled, side by side, at no cost and without an account. Signing up free adds saving the comparison and tracking either compound in your own routine.",
  },
  {
    q: "What compounds can I compare?",
    a: "Any two entries in the DoseRoutine library — peptides, hormones including TRT, vitamins, minerals, and common supplements. Search by name or a known alias in either column; the tool excludes whichever compound is already selected on the other side so you can't compare an item against itself.",
  },
  {
    q: "Does the comparison tool check for interactions between the two compounds?",
    a: "No, the compare page shows facts side by side — half-life, timing, food rules, and goal tags — but it does not run an interaction check. Use the DoseRoutine interaction checker, or add both compounds to a routine, to see whether that specific pair has a documented caution.",
  },
  {
    q: "Can I link directly to a specific comparison?",
    a: "Yes. Once both compounds are selected, the page URL includes both slugs as query parameters, so the exact comparison can be bookmarked or shared and will load with the same two compounds already picked.",
  },
  {
    q: "Where do the half-life and timing numbers come from?",
    a: "They come from the same compound profiles used throughout the DoseRoutine library, each with its own sourcing. Open either compound's full profile from the comparison to see the underlying detail and citations rather than just the summary row shown in the table.",
  },
];

export const VS_INDEX_FAQ: AeoFaqPair[] = [
  {
    q: "What is this comparisons page for?",
    a: "It's an index of every DoseRoutine head-to-head comparison — against dedicated medication reminder apps like Medisafe and MyTherapy, nutrition trackers like Cronometer and MyFitnessPal, peptide-only loggers, supplement planners, and even a plain spreadsheet — so you can find the one closest to what you're switching from.",
  },
  {
    q: "How is DoseRoutine different from a basic pill reminder app?",
    a: "Pill reminder apps mainly send a notification at a set time. DoseRoutine adds peptide and TRT dose math, reconstitution and unit conversion, cycling and loading protocols, and an interaction checker across your whole routine — not just a list of alarms for pills.",
  },
  {
    q: "Does DoseRoutine replace my nutrition or macro tracker?",
    a: "No. Comparisons like DoseRoutine vs. MyFitnessPal or vs. Cronometer are about keeping dosing and macros in one record rather than two separate apps; DoseRoutine focuses on compounds and dosing, not full food logging or micronutrient breakdowns.",
  },
  {
    q: "Why would I use DoseRoutine instead of a spreadsheet?",
    a: "A spreadsheet works while a routine is simple, but it doesn't send reminders, convert units, or flag interactions automatically, and it breaks down as a stack grows. The vs. spreadsheet comparison walks through specifically where a sheet keeps up and where it quietly falls behind.",
  },
  {
    q: "Are these comparisons independent or sponsored?",
    a: "They're written and published by DoseRoutine, so they naturally describe where DoseRoutine's own features apply. Each comparison sticks to specific, checkable features — what each app tracks and what it doesn't — rather than unverifiable claims about a competitor.",
  },
];

export const VS_SUPPLEMENT_PLANNER_FAQ: AeoFaqPair[] = [
  {
    q: "What's the main difference between DoseRoutine and a supplement planner app?",
    a: "Supplement planner apps are built around vitamins and over-the-counter pills. DoseRoutine covers that same ground plus peptides such as BPC-157 and TB-500, hormones including TRT and HRT, GLP-1 medications, and longevity compounds like rapamycin or NAD+ — all cross-checked against each other in one routine.",
  },
  {
    q: "Will a supplement-only app catch interactions with peptides or TRT?",
    a: "No. A supplement-only app's interaction database is built for vitamins and common OTC pills, so it has nothing to check a peptide, injectable hormone, or GLP-1 medication against. DoseRoutine's interaction checker covers 475+ compounds across all of those categories in the same check.",
  },
  {
    q: "Does DoseRoutine handle micro-dosing units like mcg and IU?",
    a: "Yes. Supplement planners are generally built around capsule counts. DoseRoutine also supports microgram, IU, and mg/kg dosing and syringe-unit conversions, which matter for peptides and TRT but rarely come up in a vitamin-only app.",
  },
  {
    q: "Is DoseRoutine more expensive than a supplement planner app?",
    a: "It depends on the specific app. As shown on this page, DoseRoutine's paid tier is $9.99/month or $59.99/year with a 7-day Pro trial; supplement-only competitors vary but are often cheaper per month because they cover a narrower feature set.",
  },
  {
    q: "Should I switch from my supplement app to DoseRoutine?",
    a: "If vitamins and OTC supplements are your entire routine, a supplement-only app may already cover what you need. If you also take peptides, TRT/HRT, GLP-1s, or any mixed protocol, DoseRoutine is built to track and cross-check all of it in one place instead of splitting your routine across apps.",
  },
];

export const BOOTY_WORKOUT_FAQ: AeoFaqPair[] = [
  {
    q: "Is the DoseRoutine booty workout free?",
    a: "Yes. The 10-minute booty workout timer, all eight exercise illustrations, and the exercise cues are free to use with no account and no sign-up. Creating a free DoseRoutine account adds saving your workout history, streaks, and a monthly goal — the timer itself works for guests too.",
  },
  {
    q: "What equipment do I need?",
    a: "None. All eight moves — squats, glute bridges, donkey kicks, fire hydrants, sumo squats, and standing kickbacks — use only bodyweight and can be done on any floor with enough room to kneel and stand. No bands, weights, or a mat are required, though a mat is more comfortable for the floor moves.",
  },
  {
    q: "How long does the workout take?",
    a: "The default timing is 45 seconds of work per move across eight moves, with a short rest between each, for roughly 10 minutes total. Work and rest durations can both be adjusted in the settings, which changes the total time shown before you start.",
  },
  {
    q: "Can I adjust the work and rest time per move?",
    a: "Yes. The settings let you change both the work duration and the rest duration in small steps within set minimum and maximum ranges, and the total workout time updates immediately to reflect the new timing before you press start.",
  },
  {
    q: "Does it save my progress if I close the page?",
    a: "Yes, for signed-in accounts. Your current step and remaining time are saved automatically as you go, and completed sessions build a history with stats like total completions and time worked. Guests can still use the timer, but progress isn't saved between visits without an account.",
  },
];
