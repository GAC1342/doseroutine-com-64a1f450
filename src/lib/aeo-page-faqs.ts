import type { AeoFaqPair } from "@/lib/aeo";

/**
 * Page-level FAQ copy for high-intent tool and hub pages.
 *
 * These pages previously shipped no FAQPage schema at all, so answer engines
 * had nothing quotable on the exact queries they rank for ("can I take X with
 * Y", "how do I reconstitute a peptide", "is there a free interaction
 * checker"). Every pair here is also rendered visibly by <AeoFaq> so the
 * markup and the page agree.
 *
 * Keep `LAST_REVIEWED` current when the answers change — it feeds
 * `dateModified` on each page's WebPage node.
 */
export const LAST_REVIEWED = "2026-08-03";

export const INTERACTION_CHECKER_FAQ: AeoFaqPair[] = [
  {
    q: "Is the DoseRoutine interaction checker free?",
    a: "Yes. The DoseRoutine interaction checker is free and needs no account. Add any two or more items — supplements, peptides, hormones including TRT, GLP-1s, or anything else you take daily — and you get the caution level, the mechanism behind it, and cited sources. Signing up free adds saving your routine, dose scheduling and reminders.",
  },
  {
    q: "How many compounds does it cover?",
    a: "475+ compounds across supplements, vitamins and minerals, peptides, hormones and TRT, GLP-1 medications, and common daily prescriptions, plus category-level rules that catch combinations without a named pair entry. Every named pair also has its own plain-English page in the DoseRoutine interactions section.",
  },
  {
    q: "Can I check supplements against prescription medication?",
    a: "Yes. You can add anything a clinician has already given you alongside your supplements and see whether the combination is flagged. DoseRoutine does not tell you what to take or change a prescribed dose — it shows you the documented interaction and the mechanism so you can raise it with your prescriber.",
  },
  {
    q: "What do the caution levels mean?",
    a: "Avoid means the combination is documented as harmful or unsafe and should not be taken together. Caution means there is a real, documented interaction that usually needs separated timing, a dose discussion, or monitoring. Note means a minor or theoretical interaction worth knowing about. Every level links to the source it came from.",
  },
  {
    q: "How far apart should I take two items that interact?",
    a: "It depends on the mechanism. Absorption conflicts — such as calcium, iron, zinc or magnesium against thyroid medication or certain antibiotics — usually need 2 to 4 hours of separation. Liver-enzyme interactions such as St. John's wort cannot be fixed by spacing at all. Each flagged pair in DoseRoutine states which type it is and gives the specific spacing where spacing helps.",
  },
  {
    q: "Is this medical advice?",
    a: "No. DoseRoutine is an educational reference. It does not diagnose, treat, prescribe, or replace a clinician. Use it to spot combinations worth asking about, then confirm anything that matters with your doctor or pharmacist.",
  },
];

export const CALCULATORS_FAQ: AeoFaqPair[] = [
  {
    q: "What do the DoseRoutine calculators do?",
    a: "They convert between units. Given the amount of peptide in a vial and how much bacteriostatic water you added, they convert a prescribed amount in milligrams or micrograms into syringe units and milliliters. They do not tell you what amount to take — that comes from your clinician or your protocol.",
  },
  {
    q: "How do you calculate peptide reconstitution?",
    a: "Divide the total peptide in the vial by the volume of bacteriostatic water you add to get the concentration. For example, 5 mg of peptide in 2 mL of water is 2.5 mg/mL. On a U-100 insulin syringe, 1 mL is 100 units, so 2.5 mg/mL means each 10 units draws 0.25 mg (250 mcg). The reconstitution calculator does this arithmetic for you and shows the syringe reading.",
  },
  {
    q: "How many units is my dose on an insulin syringe?",
    a: "Units equal your amount divided by the concentration, multiplied by 100. With a 2.5 mg/mL solution, a 250 mcg amount is 0.25 mg ÷ 2.5 mg/mL = 0.1 mL = 10 units on a U-100 syringe. Enter your vial size, water volume, and amount and the calculator returns the unit reading directly.",
  },
  {
    q: "How do I convert testosterone mg to mL?",
    a: "Divide the amount in milligrams by the concentration of the vial. Testosterone cypionate is commonly 200 mg/mL, so 100 mg is 0.5 mL, which reads 50 units on a U-100 syringe. The TRT converter handles 100 mg/mL, 200 mg/mL and custom concentrations, including weekly amounts split across two injections.",
  },
  {
    q: "Are the calculators free and do they store my data?",
    a: "They are free, need no account, and run entirely in your browser — nothing you type into a calculator is sent to or stored by DoseRoutine unless you choose to save it to a signed-in routine.",
  },
  {
    q: "Do these calculators recommend a dose?",
    a: "No. They are unit converters. They convert an amount you already have into a syringe reading. DoseRoutine does not recommend amounts, and nothing on these pages is medical advice.",
  },
];

export const INTERACTIONS_INDEX_FAQ: AeoFaqPair[] = [
  {
    q: "What is an interaction pair page?",
    a: "Each pair page answers one question — 'can I take A with B?' — with a direct verdict, the mechanism behind the interaction, the recommended spacing where spacing helps, and the sources the conclusion came from. Every named pair in the DoseRoutine rule set has one.",
  },
  {
    q: "My combination isn't listed. Is it safe?",
    a: "Not necessarily. A missing pair page means no named rule exists yet, not that the combination is cleared. Run both items through the interaction checker — it applies category-level rules (for example, all nephrotoxic items, or all CYP3A4 inducers) that catch combinations without a dedicated page.",
  },
  {
    q: "How are severities assigned?",
    a: "Each rule is graded Avoid, Caution, or Note based on the strength and consequence of the documented interaction, and each grade carries the citation it was drawn from. Grades reflect the published literature and label documentation, not an opinion about whether you should take something.",
  },
  {
    q: "Do you cover supplements against prescriptions?",
    a: "Yes. Pair coverage spans supplements, vitamins and minerals, peptides, hormones and TRT, GLP-1 medications and common daily prescriptions, in any combination.",
  },
];

export const LIBRARY_FAQ: AeoFaqPair[] = [
  {
    q: "What is in the DoseRoutine compound library?",
    a: "475+ reference pages covering supplements, vitamins and minerals, peptides, hormones including TRT, and GLP-1 medications. Each page gives what the compound is, its mechanism, the studied amount range, timing and food rules, half-life, contraindications, honest evidence rating, cited sources, and every interaction rule that touches it.",
  },
  {
    q: "Is the library free to read?",
    a: "Yes, every compound page is free and public with no account needed. Signing up free adds the parts that need your data: saving a routine, dose scheduling, reminders, adherence tracking and checking your whole stack at once.",
  },
  {
    q: "Where does the information come from?",
    a: "Compound data is compiled from public sources including the NIH Office of Dietary Supplements, DailyMed, PubChem and peer-reviewed literature, with the specific citation shown on each page. Our review standards are published on the DoseRoutine editorial policy page.",
  },
  {
    q: "How do I find what works for a specific goal?",
    a: "Filter the library by goal — sleep, muscle, fat loss, recovery, longevity, testosterone, cognition and others — or search by name or alias. Every result links to its full reference page and to the interactions that compound is involved in.",
  },
  {
    q: "Can I check two compounds against each other?",
    a: "Yes. Use the DoseRoutine interaction checker for any combination, or open a named pair page in the interactions section for a written verdict on that specific combination.",
  },
];

export const HELP_FAQ: AeoFaqPair[] = [
  {
    q: "How do I add something to my routine?",
    a: "Open Stack, tap Add, and search the 475+ compound library by name or alias. Set the amount, how often, and what times of day. It appears on Today at each scheduled time and is included in your interaction checks automatically.",
  },
  {
    q: "Why is a dose showing as missed?",
    a: "A scheduled dose flips to missed 60 minutes after its time if it hasn't been logged. You can still log it late or skip it from the Today screen, and doing so updates your adherence score correctly.",
  },
  {
    q: "Are reminders free?",
    a: "Yes. Dose reminders, the schedule, and the interaction checker are all free. Pro adds the AI coach, advanced planning and export.",
  },
  {
    q: "How do I change my timezone?",
    a: "Settings, then Timezone. Your schedule and adherence recalculate to the new timezone immediately — past logs keep the time they were actually taken, so travelling doesn't corrupt your history.",
  },
  {
    q: "How do I delete my account and data?",
    a: "Settings, then Delete account, or open the DoseRoutine data deletion page. Deletion removes your routine, logs and profile permanently.",
  },
];

export const ABOUT_FAQ: AeoFaqPair[] = [
  {
    q: "What is DoseRoutine?",
    a: "DoseRoutine is a free interaction checker and routine tracker for supplements, peptides, hormones including TRT, GLP-1s and anything else you take daily. It covers 475+ compounds with mechanism, timing, cited sources and pairwise interaction rules, plus optional dose scheduling, reminders and adherence tracking for signed-in users.",
  },
  {
    q: "Who is DoseRoutine for?",
    a: "Adults managing a multi-item daily routine — people on TRT or HRT, GLP-1 users, peptide users, and anyone stacking supplements alongside prescriptions who wants to know what conflicts before they take it.",
  },
  {
    q: "Is DoseRoutine free?",
    a: "The interaction checker, the full 475+ compound library, the unit converters and dose reminders are free. Pro adds the AI coach, advanced planning, and data export.",
  },
  {
    q: "Is DoseRoutine medical advice?",
    a: "No. DoseRoutine is an educational reference. It does not diagnose, treat, prescribe or replace a clinician, and it never recommends an amount to take. Use it to prepare better questions for your doctor or pharmacist.",
  },
  {
    q: "How is DoseRoutine's content reviewed?",
    a: "Compound and interaction data is compiled from public sources including the NIH Office of Dietary Supplements, DailyMed, PubChem and peer-reviewed literature, with citations on the page. The full review, correction and sourcing process is published on the DoseRoutine editorial policy page.",
  },
];
