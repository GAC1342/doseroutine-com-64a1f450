import type { AeoFaqPair } from "@/lib/aeo";

/**
 * FAQ copy for routes that previously shipped no FAQPage schema at all:
 * /articles, /blog (page 1 only), /closed-testing, /status,
 * /reconstitution-calculator.
 *
 * Every pair here is also rendered visibly on its page so the JSON-LD and
 * the on-page text agree, per DoseRoutine's AEO conventions in
 * src/lib/aeo-page-faqs.ts.
 */

export const ARTICLES_INDEX_FAQ: AeoFaqPair[] = [
  {
    q: "What kind of articles does DoseRoutine publish?",
    a: "Longer-form guides on nutrition, training and protocol tracking — the practical, how-to pieces that don't fit a single compound page. They sit alongside the shorter research write-ups on the DoseRoutine blog and the 475+ compound pages in the library.",
  },
  {
    q: "Are the articles free to read?",
    a: "Yes. Every article is free and public with no account or sign-up required. Creating a free DoseRoutine account adds the parts that need your data, such as saving a routine, dose scheduling, reminders and interaction checks.",
  },
  {
    q: "How do I find an article about a specific drug or topic?",
    a: "Use the search box at the top of the articles page — it matches on title, topic, and drug name, including names mentioned inside the article body, not just the title. You can also filter by topic chips like nutrition, training, or protocol tracking to narrow the list.",
  },
  {
    q: "What is the difference between Articles and the Blog?",
    a: "Articles are longer, evergreen how-to guides on nutrition, training and tracking. The blog covers shorter, dated research updates — new approvals, trial readouts and similar developments — with sources cited for each item.",
  },
  {
    q: "Can I load more articles without leaving the page?",
    a: "Yes. The articles list loads 30 at a time, and a 'Load more articles' button appends the next batch to the page without a full reload, as long as you haven't typed a search term.",
  },
];

export const BLOG_INDEX_FAQ: AeoFaqPair[] = [
  {
    q: "What does the DoseRoutine blog cover?",
    a: "Short, sourced write-ups on peptide, GLP-1, hormone and longevity research — new approvals, phase 3 readouts and first-in-human trials — written so a non-scientist can follow what changed and why it matters for a protocol. Every claim links to the citation it came from.",
  },
  {
    q: "How is this different from the DoseRoutine compound library?",
    a: "The library has one static reference page per compound covering mechanism, dosing range and interactions. The blog covers news as it happens — a new trial result, an FDA decision, a changed guideline — and links back to the relevant library page for background.",
  },
  {
    q: "Can I filter updates by compound or trial phase?",
    a: "Yes. Tags below the search box group updates by compound, mechanism, and trial phase, and you can combine multiple tags with a text search. Sorting can be switched between newest first and relevance to your search term.",
  },
  {
    q: "Is the blog free to read?",
    a: "Yes, every update is free and public with no account needed. Signing up free adds saving items to your routine and checking new compounds against what you already take.",
  },
  {
    q: "Where do the facts in each update come from?",
    a: "Each blog post cites the trial registry entry, regulatory filing, or peer-reviewed source it is based on, and states plainly what is proven versus what is still being marketed ahead of evidence.",
  },
];

export const CLOSED_TESTING_FAQ: AeoFaqPair[] = [
  {
    q: "Do I need to know the developer to join?",
    a: "No. Google requires 12 testers who use the app for 14 days, but they do not need to be friends or family. You can invite people from your audience, social followers, or anyone genuinely interested in tracking supplements, peptides, or hormones.",
  },
  {
    q: "What does a tester actually do?",
    a: "Install the DoseRoutine app from the Play Store test track, create an account, add a few supplements or routines, and use the app for about 14 days. You can report bugs or share feedback through a short form we send by email.",
  },
  {
    q: "Is there a cost?",
    a: "No. Closed testers get premium access free during the testing period. After testing, you can keep using the free plan or choose a paid subscription if you want the premium features.",
  },
  {
    q: "What platforms are supported?",
    a: "Right now closed testing is focused on Android through Google Play. iOS testing will open later through TestFlight.",
  },
  {
    q: "When does the test start?",
    a: "We're collecting testers now and will email everyone on the list once we have enough people to open the test track. You don't need to do anything else — just watch your inbox, including your spam folder.",
  },
  {
    q: "How will I know I'm accepted?",
    a: "We email everyone on the list with a Play Store invite link as soon as the closed testing track is ready. Make sure you check your spam folder.",
  },
];

export const STATUS_FAQ: AeoFaqPair[] = [
  {
    q: "What does the DoseRoutine status page show?",
    a: "It shows the currently deployed build ID for both server and client, how long the server has been running, and live connectivity checks against DoseRoutine's backend services. The page auto-refreshes every 30 seconds while it's open.",
  },
  {
    q: "What does it mean if my build doesn't match the server build?",
    a: "It means your browser has an older version of the app cached from before the latest deploy. Reload the page to fetch the current build — the status page flags this explicitly with a 'reload for latest' notice.",
  },
  {
    q: "What counts as 'degraded' status?",
    a: "Status shows degraded when one or more of the connectivity checks listed on the page fails or responds abnormally, even if the app itself is reachable. Each check lists its own latency and, when relevant, a short detail about the failure.",
  },
  {
    q: "Can I get the status data as raw JSON?",
    a: "Yes. The same data shown on the page is available at /api/public/status, linked at the bottom of the page, for anyone who wants to poll it programmatically.",
  },
  {
    q: "Is this page a substitute for a support channel?",
    a: "No. It only reports build version, uptime and backend connectivity. For account issues or bugs, use DoseRoutine's normal support contact rather than this page.",
  },
];

export const RECONSTITUTION_CALCULATOR_FAQ: AeoFaqPair[] = [
  {
    q: "What does the reconstitution calculator do?",
    a: "It converts a peptide vial's strength and the bacteriostatic water you add into a concentration in mg/mL, then converts your target dose into the exact insulin syringe units to draw on a U-100 or U-40 syringe, plus how many doses the vial holds in total.",
  },
  {
    q: "How is the concentration calculated?",
    a: "Concentration in mg/mL equals the total peptide in the vial divided by the milliliters of bacteriostatic water added. For example, a 5 mg vial reconstituted with 2 mL of water gives a concentration of 2.5 mg/mL.",
  },
  {
    q: "How do syringe units get calculated from my dose?",
    a: "The calculator first converts your dose to milligrams, divides by the concentration to get the volume in mL, then multiplies by 100 for a U-100 syringe or 40 for a U-40 syringe. It also warns you when a dose would need more volume than a single full syringe.",
  },
  {
    q: "Does the calculator work for compounds other than BPC-157?",
    a: "Yes. It works for any peptide reconstituted with bacteriostatic water — the built-in presets cover BPC-157, TB-500, semaglutide, tirzepatide, ipamorelin and CJC-1295, and the vial size, water volume, dose and syringe type fields can be set to any values.",
  },
  {
    q: "Is this calculator free and does it store my numbers?",
    a: "It's free, needs no account, and runs entirely in your browser. Nothing you enter is saved unless you choose to save a result to a signed-in DoseRoutine account, which also lets you track doses remaining and get injection reminders.",
  },
  {
    q: "Does this calculator tell me what dose to take?",
    a: "No. It only converts an amount you already have — from a prescriber or a protocol you're following — into a syringe reading. It is an educational tool, not medical advice; always verify dosing with your prescriber.",
  },
];
