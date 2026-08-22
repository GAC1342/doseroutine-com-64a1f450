import { createFileRoute } from "@tanstack/react-router";
import { VsComparisonPage, type VsFaq, type VsRow } from "@/components/vs-comparison-page";
import { vsHead } from "@/lib/vs-head";

export const PATH = "/vs/dosecast";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Dosecast Alternative for Peptides, TRT and Stacks";
const DESC =
  "DoseRoutine is a Dosecast alternative with reliable dose reminders plus peptide reconstitution math, injection site rotation, vials, labs and interactions.";

export const FAQ: VsFaq[] = [
  {
    q: "Is DoseRoutine a Dosecast alternative?",
    a: "Yes. DoseRoutine covers the reminder features people rely on in Dosecast — multiple times per day, as-needed doses, skipped and postponed doses, refill warnings — and adds peptide and hormone tooling Dosecast does not have, including reconstitution math and injection-site rotation.",
  },
  {
    q: "Does DoseRoutine handle complex schedules like Dosecast?",
    a: "Yes. Daily, every-N-days, specific weekdays, cyclical on/off protocols and multiple times per day are all supported, and every dose can export to your calendar as an .ics alarm so it fires even if the app is closed.",
  },
  {
    q: "What does DoseRoutine add over Dosecast for injections?",
    a: "A reconstitution calculator that turns vial mg plus BAC water into exact syringe units, an injection-site rotation map with history, vial inventory that predicts when you run out, and an interaction checker that looks at the whole stack rather than one drug at a time.",
  },
  {
    q: "Does DoseRoutine track supplements and nutrition too?",
    a: "Yes. Prescriptions, peptides, hormones and supplements share one routine, and meals can be logged by photo so protein and macros sit on the same timeline as your doses and lab results.",
  },
  {
    q: "How much does DoseRoutine cost compared with Dosecast Pro?",
    a: "DoseRoutine is free to start; Pro is $9.99/month or $59.99/year. Dosecast sells a comparable subscription for its advanced reminder features.",
  },
];

const COMPARISON: VsRow[] = [
  { feature: "Reliable multi-time daily reminders", us: true, them: true },
  { feature: "As-needed and postponed doses", us: true, them: true },
  { feature: "Refill / supply warnings", us: true, them: true },
  { feature: "Cyclical on/off protocols", us: true, them: "Limited" },
  { feature: "Peptide reconstitution calculator", us: true, them: false },
  { feature: "Syringe unit conversion (U-100 / U-40)", us: true, them: false },
  { feature: "Injection site rotation map", us: true, them: false },
  { feature: "Vial inventory with run-out prediction", us: true, them: false },
  { feature: "HRT / TRT cycle tracking", us: true, them: false },
  { feature: "Bloodwork tracking with trends", us: true, them: false },
  { feature: "475+ compound research library", us: true, them: false },
  { feature: "Whole-routine interaction checking", us: true, them: false },
  { feature: "Nutrition and macro logging", us: true, them: false },
  { feature: "Body metrics and workouts", us: true, them: false },
  { feature: "Calendar (.ics) export per dose", us: true, them: false },
  { feature: "Pricing", us: "Free · $9.99/mo", them: "Free · paid Pro tier" },
];

export const Route = createFileRoute("/vs/dosecast")({
  head: () =>
    vsHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "vs. Dosecast",
      faq: FAQ,
    }),
  component: DosecastAlternative,
});

function DosecastAlternative() {
  return (
    <VsComparisonPage
      competitor="Dosecast"
      eyebrow="Dosecast alternative"
      heading="The Dosecast alternative for peptides, hormones and stacks"
      intro="Dosecast is a dependable medication reminder. DoseRoutine matches the reminder engine — multi-time doses, postponed doses, refill warnings — and then keeps going into the parts of a peptide or TRT protocol a reminder app was never built for."
      comparison={COMPARISON}
      whenThem="If you take a short list of prescriptions and all you want is a reminder that never misses, Dosecast does that job well and has done it for years. DoseRoutine earns its place only once vials, injections, cycles or lab results enter the picture."
      migration="Add your current medications in DoseRoutine using the compound library, set the same times you have in Dosecast, then export the schedule to your calendar so the alarms are identical before you turn the old ones off. Vials and injection sites can be added afterwards without redoing anything."
      faq={FAQ}
      canonical={CANONICAL}
      path={PATH}
      proseId="vs-dosecast"
    />
  );
}
