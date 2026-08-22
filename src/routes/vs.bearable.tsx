import { createFileRoute } from "@tanstack/react-router";
import { VsComparisonPage, type VsFaq, type VsRow } from "@/components/vs-comparison-page";
import { vsHead } from "@/lib/vs-head";

export const PATH = "/vs/bearable";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Bearable Alternative for Peptides, TRT and Supplements";
const DESC =
  "DoseRoutine is a Bearable alternative that keeps symptom and mood tracking next to real dosing tools: reconstitution math, vials, labs and interactions.";

export const FAQ: VsFaq[] = [
  {
    q: "Is DoseRoutine a good Bearable alternative?",
    a: "If you use Bearable mainly to see how a treatment affects how you feel, DoseRoutine covers the same idea from the dosing side: it tracks every dose, injection site, cycle week and lab result, then lines them up with check-ins on one timeline. Bearable is stronger for granular symptom and mood factors; DoseRoutine is stronger for the protocol itself.",
  },
  {
    q: "Can I track symptoms and mood in DoseRoutine?",
    a: "Yes. Daily check-ins record energy, sleep, mood and side effects, and they appear on the same timeline as your doses, bloodwork and body metrics, so a change in how you feel can be read against what you were actually taking that week.",
  },
  {
    q: "Does Bearable handle peptides and injections?",
    a: "Bearable can log a custom item as taken, but it has no reconstitution calculator, no syringe-unit conversion, no injection-site rotation map and no vial inventory. Those are the parts of a peptide or TRT protocol that most often go wrong, and they are built into DoseRoutine.",
  },
  {
    q: "Do I have to give up my Bearable history?",
    a: "No — keep Bearable running while you set up DoseRoutine. Most people rebuild their current protocol in DoseRoutine first (it takes a few minutes with the 475+ compound library) and then decide which app they keep opening.",
  },
  {
    q: "How much does DoseRoutine cost compared with Bearable Pro?",
    a: "DoseRoutine is free to start; Pro is $9.99/month or $59.99/year and unlocks the calculators, interaction checking, AI planning and unlimited history. Bearable Pro is priced in a similar range for its symptom-tracking features.",
  },
];

const COMPARISON: VsRow[] = [
  { feature: "Symptom, mood and energy tracking", us: true, them: true },
  { feature: "Correlation between inputs and how you feel", us: true, them: true },
  { feature: "Dose logging with adherence history", us: true, them: "Basic" },
  { feature: "Peptide reconstitution calculator", us: true, them: false },
  { feature: "Syringe unit conversion (U-100 / U-40)", us: true, them: false },
  { feature: "Injection site rotation map", us: true, them: false },
  { feature: "Vial inventory and refill predictions", us: true, them: false },
  { feature: "HRT / TRT cycle weeks", us: true, them: false },
  { feature: "Bloodwork tracking with trends", us: true, them: false },
  { feature: "475+ compound research library", us: true, them: false },
  { feature: "Interaction checking across the whole routine", us: true, them: false },
  { feature: "Nutrition and macro logging", us: true, them: false },
  { feature: "Shareable clinician PDF", us: true, them: true },
  { feature: "Calendar (.ics) alarms per dose", us: true, them: false },
  { feature: "Pricing", us: "Free · $9.99/mo", them: "Free · paid Pro tier" },
];

export const Route = createFileRoute("/vs/bearable")({
  head: () =>
    vsHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "vs. Bearable",
      faq: FAQ,
    }),
  component: BearableAlternative,
});

function BearableAlternative() {
  return (
    <VsComparisonPage
      competitor="Bearable"
      eyebrow="Bearable alternative"
      heading="The Bearable alternative for people running a real protocol"
      intro="Bearable is excellent at recording how you feel. DoseRoutine keeps that daily check-in habit and adds everything a peptide, TRT or supplement protocol actually needs — reconstitution math, injection sites, vial counts, labs and interaction checks on one timeline."
      comparison={COMPARISON}
      whenThem="If your goal is fine-grained symptom science — dozens of custom factors, detailed pain or mood scales, chronic-illness pattern hunting — Bearable is purpose-built for it and goes deeper than DoseRoutine does on that axis. Nothing here is trying to talk you out of it."
      migration="Rebuild your current protocol in DoseRoutine first: search the compound library, set doses and schedules, and add any vials you have open. Keep logging in Bearable for a week or two in parallel. Most people find that once dosing, labs and check-ins live in the same place, the second app stops getting opened."
      faq={FAQ}
      canonical={CANONICAL}
      path={PATH}
      proseId="vs-bearable"
    />
  );
}
