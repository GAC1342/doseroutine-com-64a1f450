import { createFileRoute } from "@tanstack/react-router";
import { VsComparisonPage, type VsFaq, type VsRow } from "@/components/vs-comparison-page";
import { vsHead } from "@/lib/vs-head";

export const PATH = "/vs/myfitnesspal";
export const CANONICAL = `https://doseroutine.com${PATH}`;
const TITLE = "MyFitnessPal Alternative for Supplements and Peptides";
const DESC =
  "DoseRoutine is a MyFitnessPal alternative for routines beyond food: photo meal scanning plus dose tracking, peptide math, injection sites and labs.";

export const FAQ: VsFaq[] = [
  {
    q: "Can DoseRoutine replace MyFitnessPal?",
    a: "For most people running a supplement, peptide or GLP-1 protocol, yes. DoseRoutine logs meals by photo or barcode with calories and macros, and it does the parts MyFitnessPal does not: doses, injection sites, vials, cycles, bloodwork and interaction checks. MyFitnessPal still has the larger crowd-sourced food database.",
  },
  {
    q: "Does DoseRoutine count calories, protein and carbs?",
    a: "Yes. Scan a meal with the camera or a barcode and DoseRoutine estimates calories, protein, carbs and fat, which you can correct inline. Daily targets and a macro breakdown chart are included.",
  },
  {
    q: "Why track supplements and food in the same app?",
    a: "Because they interact. Minerals compete for absorption with each other and with medications, some compounds need food and some need an empty stomach, and on a GLP-1 your protein intake determines how much of the weight change comes from lean mass. Split across two apps, none of that is visible.",
  },
  {
    q: "Is DoseRoutine good for GLP-1 users?",
    a: "It is one of the main use cases. Dose escalation weeks, injection-site rotation, side-effect check-ins, protein targets and weight trend all sit on one timeline, so you can see the titration and the nutrition together.",
  },
  {
    q: "How much does DoseRoutine cost compared with MyFitnessPal Premium?",
    a: "DoseRoutine is free to start; Pro is $9.99/month or $59.99/year. MyFitnessPal Premium is priced higher on an annual basis and covers nutrition only.",
  },
];

const COMPARISON: VsRow[] = [
  { feature: "Calorie, protein, carb and fat logging", us: true, them: true },
  { feature: "Barcode scanning", us: true, them: true },
  { feature: "Photo meal scanning with AI estimates", us: true, them: "Premium" },
  { feature: "Crowd-sourced food database size", us: "Large", them: "Largest" },
  { feature: "Supplement and medication dose tracking", us: true, them: "Name only" },
  { feature: "Peptide reconstitution calculator", us: true, them: false },
  { feature: "Injection site rotation map", us: true, them: false },
  { feature: "Vial inventory", us: true, them: false },
  { feature: "GLP-1 titration and cycle tracking", us: true, them: false },
  { feature: "Bloodwork tracking with trends", us: true, them: false },
  { feature: "475+ compound research library", us: true, them: false },
  { feature: "Supplement / medication interaction checks", us: true, them: false },
  { feature: "Nutrient timing vs. dose timing warnings", us: true, them: false },
  { feature: "Body metrics and workouts", us: true, them: true },
  { feature: "Pricing", us: "Free · $9.99/mo", them: "Free · Premium tier" },
];

export const Route = createFileRoute("/vs/myfitnesspal")({
  head: () =>
    vsHead({
      path: PATH,
      title: TITLE,
      description: DESC,
      crumb: "vs. MyFitnessPal",
      faq: FAQ,
    }),
  component: MyFitnessPalAlternative,
});

function MyFitnessPalAlternative() {
  return (
    <VsComparisonPage
      competitor="MyFitnessPal"
      eyebrow="MyFitnessPal alternative"
      heading="The MyFitnessPal alternative when your routine is more than food"
      intro="MyFitnessPal is a nutrition app that lets you type in a supplement name. DoseRoutine logs meals by photo or barcode and treats supplements, peptides and hormones as first-class — with doses, vials, injection sites, labs and interaction checks on the same timeline as your macros."
      comparison={COMPARISON}
      whenThem="If your only goal is calorie and macro tracking against the biggest food database available, MyFitnessPal remains the strongest choice and its database depth is genuinely hard to match. DoseRoutine makes sense when the dosing side of your routine matters as much as the food."
      migration="Set your calorie and protein targets in DoseRoutine, then log a few days by photo or barcode to check the numbers land where you expect. Add your supplements and any injectables from the compound library, and you will have nutrition and protocol in one record rather than two apps you have to mentally join."
      faq={FAQ}
      canonical={CANONICAL}
      path={PATH}
      proseId="vs-myfitnesspal"
    />
  );
}
