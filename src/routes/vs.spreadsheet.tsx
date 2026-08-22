import { createFileRoute } from "@tanstack/react-router";
import { VsComparisonPage, type VsFaq, type VsRow } from "@/components/vs-comparison-page";
import { vsHead } from "@/lib/vs-head";

export const PATH = "/vs/spreadsheet";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "Tracking Your Stack in a Spreadsheet vs. DoseRoutine";
const DESC =
  "Google Sheets and Notes are the most common way people track peptides, TRT and supplements. What a spreadsheet does well, and where it quietly costs you.";

export const FAQ: VsFaq[] = [
  {
    q: "Is a spreadsheet good enough for tracking peptides or TRT?",
    a: "A spreadsheet is fine for planning a protocol and it is unbeatable for flexibility. It falls down on the daily part: it does not remind you, it does not do reconstitution math, it does not know where your last injection went, and it will not warn you when two things in your stack interact. Those are the errors that actually cost people progress.",
  },
  {
    q: "Can I import my spreadsheet into DoseRoutine?",
    a: "You do not need to import a file. Rebuilding a protocol takes a few minutes because the 475+ compound library already knows typical doses, units, half-lives and timing — you search, confirm the dose and set the schedule. Historical rows can be added as past doses if you want the continuity.",
  },
  {
    q: "What does DoseRoutine do that a spreadsheet formula cannot?",
    a: "Interaction checks across your whole routine, injection-site rotation with visual history, vial run-out predictions, calendar alarms for every dose, bloodwork trends plotted against what you were taking at the time, and a clinician-ready PDF of the whole protocol.",
  },
  {
    q: "I like the control a spreadsheet gives me. Do I lose that?",
    a: "No. Every dose, unit, time and note is editable, custom compounds are supported for anything not in the library, and you can export your data at any time. The structure is there to catch mistakes, not to lock you in.",
  },
  {
    q: "Is DoseRoutine free?",
    a: "It is free to start, which covers tracking a routine and using the library. Pro is $9.99/month or $59.99/year and adds the calculators, interaction checking, AI planning and unlimited history.",
  },
];

const COMPARISON: VsRow[] = [
  { feature: "Total layout flexibility", us: "Structured", them: true },
  { feature: "Works offline on a phone", us: true, them: "Clunky" },
  { feature: "Dose reminders that fire on time", us: true, them: false },
  { feature: "Calendar (.ics) alarms", us: true, them: false },
  { feature: "Reconstitution math done for you", us: true, them: "Manual formulas" },
  { feature: "Syringe unit conversion (U-100 / U-40)", us: true, them: "Manual formulas" },
  { feature: "Injection site rotation with history", us: true, them: false },
  { feature: "Vial inventory and run-out prediction", us: true, them: "Manual" },
  { feature: "Interaction warnings across the stack", us: true, them: false },
  { feature: "475+ compound reference data built in", us: true, them: false },
  { feature: "Bloodwork trends against doses", us: true, them: "Manual charts" },
  { feature: "Nutrition and macro logging", us: true, them: false },
  { feature: "Clinician-ready PDF summary", us: true, them: "Manual" },
  { feature: "Data export", us: true, them: true },
  { feature: "Cost", us: "Free · $9.99/mo", them: "Free" },
];

export const Route = createFileRoute("/vs/spreadsheet")({
  head: () =>
    vsHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "vs. Spreadsheets",
      faq: FAQ,
    }),
  component: SpreadsheetAlternative,
});

function SpreadsheetAlternative() {
  return (
    <VsComparisonPage
      competitor="a spreadsheet"
      eyebrow="Spreadsheet alternative"
      heading="Tracking your stack in a spreadsheet vs. DoseRoutine"
      intro="The most common peptide and TRT tracker in the world is a Google Sheet. It is free, endlessly flexible, and it quietly fails at the three things that matter daily: reminding you, doing the math, and catching interactions."
      comparison={COMPARISON}
      whenThem="A spreadsheet is still the better tool for planning — modelling a cycle, comparing costs per milligram, or sketching a protocol before you commit to it. Plenty of people keep a planning sheet alongside DoseRoutine and only move the live routine across."
      migration="Start with what you are taking right now, not your whole history: search each compound, confirm dose and units, set the schedule. Add any open vials with their concentration so the calculator can take over the arithmetic. If the historical rows matter to you, backfill past doses afterwards — the timeline will accept them."
      faq={FAQ}
      canonical={CANONICAL}
      path={PATH}
      proseId="vs-spreadsheet"
    />
  );
}
