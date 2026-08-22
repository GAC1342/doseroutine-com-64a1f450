/**
 * Per-compound calculator pages.
 *
 * Each entry becomes a keyword-targeted landing page at
 * `/calculators/<slug>` that wraps the shared reconstitution tool with
 * compound-specific presets, dosing context and FAQs.
 *
 * Keep in sync with: src/routes/sitemap[.]xml.ts (URLs are derived from
 * CALCULATOR_PAGES, so no manual edit is needed there) and public/llms.txt.
 */

export type DoseUnit = "mcg" | "mg";

export interface CalcPreset {
  label: string;
  vialMg: number;
  bacMl: number;
  doseValue: number;
  doseUnit: DoseUnit;
}

export interface CalcDoseRow {
  phase: string;
  dose: string;
  frequency: string;
  note: string;
}

export interface CalcFaq {
  q: string;
  a: string;
}

export interface CalculatorPage {
  slug: string;
  /** Compound display name. */
  name: string;
  /** <h1> — matches the head keyword. */
  h1: string;
  title: string;
  description: string;
  /** One-paragraph intro under the h1. */
  intro: string;
  /** Common vial sizes in mg, used for the BAC-water reference table. */
  vialSizes: number[];
  defaults: { vialMg: number; bacMl: number; doseValue: number; doseUnit: DoseUnit };
  presets: CalcPreset[];
  doseRows: CalcDoseRow[];
  /** Practical notes shown as a bulleted "things that trip people up" list. */
  notes: string[];
  faqs: CalcFaq[];
  /** Library page for the compound, when one exists. */
  libraryPath?: string;
  /** Extra internal links (guide pages). */
  relatedPaths?: { path: string; label: string }[];
}

export const CALCULATOR_PAGES: CalculatorPage[] = [
  {
    slug: "retatrutide-dosage-calculator",
    name: "Retatrutide",
    h1: "Retatrutide Dosage Calculator",
    title: "Retatrutide Dosage Calculator — BAC Water & Units | DoseRoutine",
    description:
      "Free retatrutide dosage calculator. Enter vial mg and bacteriostatic water to get mg/mL, exact insulin-syringe units per dose and doses per vial.",
    intro:
      "Retatrutide ships as a lyophilized powder, so every dose depends on how much bacteriostatic water you added. Enter your vial size, your BAC water volume and the dose you want, and this calculator returns the exact number of units to draw on a U-100 insulin syringe.",
    vialSizes: [5, 10, 15, 20, 24],
    defaults: { vialMg: 10, bacMl: 2, doseValue: 2, doseUnit: "mg" },
    presets: [
      { label: "10 mg vial / 2 mL → 2 mg", vialMg: 10, bacMl: 2, doseValue: 2, doseUnit: "mg" },
      { label: "10 mg vial / 2 mL → 4 mg", vialMg: 10, bacMl: 2, doseValue: 4, doseUnit: "mg" },
      { label: "20 mg vial / 2 mL → 8 mg", vialMg: 20, bacMl: 2, doseValue: 8, doseUnit: "mg" },
      { label: "5 mg vial / 1 mL → 1 mg", vialMg: 5, bacMl: 1, doseValue: 1, doseUnit: "mg" },
    ],
    doseRows: [
      {
        phase: "Weeks 1–4",
        dose: "1 mg",
        frequency: "Once weekly",
        note: "Trial starting dose in every Phase 2 arm.",
      },
      {
        phase: "Weeks 5–8",
        dose: "2–4 mg",
        frequency: "Once weekly",
        note: "First escalation step; nausea peaks here.",
      },
      {
        phase: "Weeks 9–16",
        dose: "4–8 mg",
        frequency: "Once weekly",
        note: "Escalate only if side effects are tolerable.",
      },
      {
        phase: "Week 16+",
        dose: "8–12 mg",
        frequency: "Once weekly",
        note: "Highest trial arms; 12 mg gave the largest weight loss.",
      },
    ],
    notes: [
      "Retatrutide is investigational — it is not FDA-approved and no licensed product exists. Dosing figures come from the Phase 2 trial, not a label.",
      "At 10 mg vial + 2 mL BAC water you get 5 mg/mL, so 1 mg = 20 units on a U-100 syringe. Easy mental math.",
      "Adding more BAC water does not change the total drug — it only makes each unit smaller and easier to measure accurately.",
      "Under ~10 units per dose, small measuring errors become large percentage errors. Dilute further if your draw is tiny.",
    ],
    faqs: [
      {
        q: "How much BAC water for a 10 mg retatrutide vial?",
        a: "2 mL is the most common choice: it gives 5 mg/mL, so a 1 mg dose is 20 units, 2 mg is 40 units and 4 mg is 80 units on a U-100 syringe. Use 1 mL if you want a more concentrated vial and smaller draws, or 3 mL if your doses are very small and you want more precision.",
      },
      {
        q: "How many units of retatrutide is 2 mg?",
        a: "It depends entirely on concentration. At 5 mg/mL (10 mg vial + 2 mL), 2 mg = 0.4 mL = 40 units on a U-100 syringe. At 10 mg/mL (10 mg + 1 mL), the same 2 mg is only 20 units.",
      },
      {
        q: "How long does a reconstituted retatrutide vial last?",
        a: "Refrigerated at 2–8 °C and handled sterilely, most users treat a reconstituted vial as good for about 28–30 days. Bacteriostatic water contains benzyl alcohol, which is what allows multi-dose use; sterile water does not and should be treated as single-use.",
      },
      {
        q: "Can I skip titration and start at a high dose?",
        a: "No. The Phase 2 trial escalated every four weeks specifically because gastrointestinal side effects are dose-dependent. Starting high dramatically raises the odds of severe nausea and vomiting.",
      },
    ],
    libraryPath: "/library/retatrutide-dosage",
    relatedPaths: [{ path: "/library/retatrutide-dosage", label: "Full retatrutide dosage guide" }],
  },
  {
    slug: "bpc-157-dosage-calculator",
    name: "BPC-157",
    h1: "BPC-157 Dosage Calculator",
    title: "BPC-157 Dosage Calculator — Reconstitution & Units | DoseRoutine",
    description:
      "Free BPC-157 dosage calculator. Convert vial mg and BAC water into mg/mL, insulin-syringe units per dose and doses per vial for 5 mg and 10 mg vials.",
    intro:
      "BPC-157 is almost always sold as a 5 mg or 10 mg lyophilized vial, and typical doses are in the 250–500 mcg range — small enough that reconstitution volume matters a lot. Enter your numbers below to get the exact units to draw.",
    vialSizes: [5, 10],
    defaults: { vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
    presets: [
      { label: "5 mg / 2 mL → 250 mcg", vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
      { label: "5 mg / 2 mL → 500 mcg", vialMg: 5, bacMl: 2, doseValue: 500, doseUnit: "mcg" },
      { label: "10 mg / 3 mL → 500 mcg", vialMg: 10, bacMl: 3, doseValue: 500, doseUnit: "mcg" },
      { label: "5 mg / 5 mL → 250 mcg", vialMg: 5, bacMl: 5, doseValue: 250, doseUnit: "mcg" },
    ],
    doseRows: [
      {
        phase: "Common low",
        dose: "200–250 mcg",
        frequency: "Once or twice daily",
        note: "Most-used range in anecdotal protocols.",
      },
      {
        phase: "Common standard",
        dose: "250–500 mcg",
        frequency: "Once or twice daily",
        note: "Often split morning and evening.",
      },
      {
        phase: "Localised use",
        dose: "250–500 mcg",
        frequency: "Daily near the site",
        note: "Subcutaneous near the injury area is common practice.",
      },
      {
        phase: "Typical cycle",
        dose: "—",
        frequency: "4–8 weeks",
        note: "Then a break; long-term human safety data does not exist.",
      },
    ],
    notes: [
      "BPC-157 has no completed human efficacy trials. All dosing conventions are extrapolated from rodent studies and user reports.",
      "5 mg + 2 mL = 2.5 mg/mL, so 250 mcg = 10 units on a U-100 syringe — the single most common BPC-157 setup.",
      "If your draw comes out under 5 units, add more BAC water. Measuring 3 units accurately on a U-100 syringe is unrealistic.",
      "Blends with TB-500 change the math entirely — calculate each peptide's mg separately, not the combined label weight.",
    ],
    faqs: [
      {
        q: "How much BAC water for a 5 mg BPC-157 vial?",
        a: "2 mL is standard, giving 2.5 mg/mL where 250 mcg = 10 units and 500 mcg = 20 units on a U-100 syringe. Use 5 mL if you want 1 mg/mL and very readable 25-unit draws for a 250 mcg dose.",
      },
      {
        q: "How many units is 250 mcg of BPC-157?",
        a: "At the standard 5 mg + 2 mL (2.5 mg/mL), 250 mcg is 0.1 mL = 10 units on a U-100 syringe. At 5 mg + 5 mL (1 mg/mL) the same dose is 25 units.",
      },
      {
        q: "How many doses are in a 5 mg BPC-157 vial?",
        a: "At 250 mcg per dose, a 5 mg vial holds 20 doses. At 500 mcg, 10 doses. Reconstitution volume does not change this — only the dose size does.",
      },
      {
        q: "Does BPC-157 need to be refrigerated after mixing?",
        a: "Yes. Reconstituted BPC-157 should be kept at 2–8 °C and protected from light. Unreconstituted lyophilized powder is far more stable and can sit at room temperature for shorter periods.",
      },
    ],
    libraryPath: "/library/bpc-157",
    relatedPaths: [{ path: "/library/compare/bpc-157-vs-tb-500", label: "BPC-157 vs TB-500" }],
  },
  {
    slug: "tirzepatide-reconstitution-calculator",
    name: "Tirzepatide",
    h1: "Tirzepatide Reconstitution Calculator",
    title: "Tirzepatide Reconstitution Calculator — Units per Dose | DoseRoutine",
    description:
      "Free tirzepatide reconstitution calculator. Turn vial mg and bacteriostatic water into mg/mL, exact U-100 syringe units and doses per vial.",
    intro:
      "Compounded tirzepatide comes as powder in a wide range of vial sizes, and the same 5 mg dose can be anywhere from 10 to 100 units depending on how you mixed it. Enter your vial and BAC water volume for the exact draw.",
    vialSizes: [10, 15, 20, 30, 40, 60],
    defaults: { vialMg: 30, bacMl: 3, doseValue: 2.5, doseUnit: "mg" },
    presets: [
      { label: "30 mg / 3 mL → 2.5 mg", vialMg: 30, bacMl: 3, doseValue: 2.5, doseUnit: "mg" },
      { label: "30 mg / 3 mL → 5 mg", vialMg: 30, bacMl: 3, doseValue: 5, doseUnit: "mg" },
      { label: "10 mg / 2 mL → 2.5 mg", vialMg: 10, bacMl: 2, doseValue: 2.5, doseUnit: "mg" },
      { label: "60 mg / 6 mL → 10 mg", vialMg: 60, bacMl: 6, doseValue: 10, doseUnit: "mg" },
    ],
    doseRows: [
      {
        phase: "Weeks 1–4",
        dose: "2.5 mg",
        frequency: "Once weekly",
        note: "Starting dose — not intended for weight loss on its own.",
      },
      {
        phase: "Weeks 5–8",
        dose: "5 mg",
        frequency: "Once weekly",
        note: "First maintenance dose.",
      },
      {
        phase: "Weeks 9+",
        dose: "7.5–15 mg",
        frequency: "Once weekly",
        note: "Escalate in 2.5 mg steps, minimum 4 weeks apart.",
      },
      {
        phase: "Maximum",
        dose: "15 mg",
        frequency: "Once weekly",
        note: "Highest labeled dose for Mounjaro and Zepbound.",
      },
    ],
    notes: [
      "Mixing 1 mL of BAC water per 10 mg of tirzepatide gives a tidy 10 mg/mL: 2.5 mg = 25 units, 5 mg = 50 units.",
      "Branded pens (Mounjaro, Zepbound) come pre-filled — this calculator is for compounded or research powder vials only.",
      "Never escalate faster than every 4 weeks. Most severe GI side effects come from rushing titration.",
      "Tirzepatide is a GLP-1/GIP dual agonist and slows gastric emptying, which can change how quickly oral medications are absorbed.",
    ],
    faqs: [
      {
        q: "How much BAC water do I add to a 30 mg tirzepatide vial?",
        a: "3 mL is the most common choice, giving 10 mg/mL. On that concentration a 2.5 mg dose is 25 units, 5 mg is 50 units, 7.5 mg is 75 units and 10 mg is 100 units — a full U-100 syringe.",
      },
      {
        q: "How many units is 5 mg of tirzepatide?",
        a: "At 10 mg/mL it is 0.5 mL = 50 units on a U-100 syringe. At 20 mg/mL (30 mg + 1.5 mL) the same dose is 25 units. Concentration is the only thing that decides this.",
      },
      {
        q: "How long does reconstituted tirzepatide last?",
        a: "Refrigerated and mixed with bacteriostatic water, it is generally treated as usable for around 28–30 days. Keep it cold, keep it out of light, and swab the stopper before every draw.",
      },
      {
        q: "What's the difference between tirzepatide and semaglutide dosing?",
        a: "They are not interchangeable. Tirzepatide runs 2.5–15 mg weekly; semaglutide runs 0.25–2.4 mg weekly. Do not convert one to the other by ratio — switch under clinical supervision.",
      },
    ],
    libraryPath: "/library/tirzepatide",
    relatedPaths: [
      { path: "/library/compare/semaglutide-vs-tirzepatide", label: "Semaglutide vs tirzepatide" },
    ],
  },
  {
    slug: "semaglutide-reconstitution-calculator",
    name: "Semaglutide",
    h1: "Semaglutide Reconstitution Calculator",
    title: "Semaglutide Reconstitution Calculator — mg to Units | DoseRoutine",
    description:
      "Free semaglutide reconstitution calculator. Convert vial mg and BAC water into mg/mL concentration, U-100 syringe units per dose and doses per vial.",
    intro:
      "Semaglutide doses are small — 0.25 mg to 2.4 mg weekly — which means concentration errors are easy to make and expensive to fix. Enter your vial size and BAC water volume to get the exact unit draw.",
    vialSizes: [2, 5, 10, 15],
    defaults: { vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
    presets: [
      { label: "5 mg / 2 mL → 0.25 mg", vialMg: 5, bacMl: 2, doseValue: 250, doseUnit: "mcg" },
      { label: "5 mg / 2 mL → 0.5 mg", vialMg: 5, bacMl: 2, doseValue: 500, doseUnit: "mcg" },
      { label: "10 mg / 2 mL → 1 mg", vialMg: 10, bacMl: 2, doseValue: 1, doseUnit: "mg" },
      { label: "15 mg / 3 mL → 2.4 mg", vialMg: 15, bacMl: 3, doseValue: 2.4, doseUnit: "mg" },
    ],
    doseRows: [
      {
        phase: "Weeks 1–4",
        dose: "0.25 mg",
        frequency: "Once weekly",
        note: "Tolerance-building dose only.",
      },
      {
        phase: "Weeks 5–8",
        dose: "0.5 mg",
        frequency: "Once weekly",
        note: "First therapeutic step.",
      },
      {
        phase: "Weeks 9–16",
        dose: "1.0–1.7 mg",
        frequency: "Once weekly",
        note: "Escalate every 4 weeks as tolerated.",
      },
      {
        phase: "Week 17+",
        dose: "2.4 mg",
        frequency: "Once weekly",
        note: "Maximum weight-management dose (Wegovy).",
      },
    ],
    notes: [
      "5 mg + 2 mL gives 2.5 mg/mL, so 0.25 mg = 10 units and 0.5 mg = 20 units on a U-100 syringe.",
      "Semaglutide is light-sensitive. Keep reconstituted vials in the fridge and in the box.",
      "Doses under 10 units are hard to measure accurately — add more BAC water rather than squinting at the barrel.",
      "Semaglutide slows gastric emptying, which can delay absorption of oral medicines taken at the same time.",
    ],
    faqs: [
      {
        q: "How much BAC water for a 5 mg semaglutide vial?",
        a: "2 mL is the usual choice: 2.5 mg/mL means a 0.25 mg starting dose is 10 units and 0.5 mg is 20 units. Use 1 mL only if you are already on higher doses and want smaller volumes.",
      },
      {
        q: "How many units is 0.5 mg of semaglutide?",
        a: "At 2.5 mg/mL (5 mg + 2 mL), 0.5 mg is 0.2 mL = 20 units on a U-100 syringe. At 5 mg/mL it would be 10 units.",
      },
      {
        q: "Is compounded semaglutide dosed the same as Ozempic?",
        a: "The milligram amounts follow the same titration ladder, but pens deliver a fixed metered dose while a compounded vial relies entirely on your own measurement. That is exactly why the concentration math matters.",
      },
      {
        q: "How many doses in a 5 mg semaglutide vial?",
        a: "Twenty 0.25 mg doses, ten 0.5 mg doses, or five 1 mg doses. Total mg divided by dose mg — BAC water volume does not change it.",
      },
    ],
    libraryPath: "/library/semaglutide",
    relatedPaths: [
      { path: "/library/compare/semaglutide-vs-tirzepatide", label: "Semaglutide vs tirzepatide" },
    ],
  },
  {
    slug: "cjc-1295-ipamorelin-dosage-calculator",
    name: "CJC-1295 + Ipamorelin",
    h1: "CJC-1295 / Ipamorelin Dosage Calculator",
    title: "CJC-1295 Ipamorelin Dosage Calculator — Units & BAC | DoseRoutine",
    description:
      "Free CJC-1295 and ipamorelin dosage calculator. Get mg/mL, exact insulin-syringe units and doses per vial for single or blended peptide vials.",
    intro:
      "CJC-1295 and ipamorelin are usually dosed around 100 mcg and 200–300 mcg respectively — small enough that under-diluting makes accurate measurement impossible. Calculate each peptide separately below.",
    vialSizes: [2, 5, 10],
    defaults: { vialMg: 5, bacMl: 2.5, doseValue: 200, doseUnit: "mcg" },
    presets: [
      {
        label: "Ipamorelin 5 mg / 2.5 mL → 200 mcg",
        vialMg: 5,
        bacMl: 2.5,
        doseValue: 200,
        doseUnit: "mcg",
      },
      {
        label: "Ipamorelin 5 mg / 2.5 mL → 300 mcg",
        vialMg: 5,
        bacMl: 2.5,
        doseValue: 300,
        doseUnit: "mcg",
      },
      {
        label: "CJC-1295 2 mg / 2 mL → 100 mcg",
        vialMg: 2,
        bacMl: 2,
        doseValue: 100,
        doseUnit: "mcg",
      },
      {
        label: "CJC-1295 5 mg / 5 mL → 100 mcg",
        vialMg: 5,
        bacMl: 5,
        doseValue: 100,
        doseUnit: "mcg",
      },
    ],
    doseRows: [
      {
        phase: "CJC-1295 (no DAC)",
        dose: "~100 mcg",
        frequency: "1–3× daily",
        note: "Saturation dose is roughly 1 mcg/kg; more does not add much.",
      },
      {
        phase: "Ipamorelin",
        dose: "200–300 mcg",
        frequency: "1–3× daily",
        note: "Paired 1:2 or 1:3 with CJC-1295 in most protocols.",
      },
      {
        phase: "CJC-1295 with DAC",
        dose: "1–2 mg",
        frequency: "Once or twice weekly",
        note: "Long half-life — a different protocol entirely.",
      },
      {
        phase: "Timing",
        dose: "—",
        frequency: "Fasted, before bed",
        note: "Insulin blunts the GH pulse; leave ~2 h either side of food.",
      },
    ],
    notes: [
      "A blended vial labeled '10 mg' is usually 5 mg of each peptide — calculate per-peptide, never on the combined weight.",
      "5 mg + 2.5 mL = 2 mg/mL, so 200 mcg = 10 units. Diluting to 5 mL makes the same dose 20 units and much easier to read.",
      "Dosing past the saturation point does not raise the GH pulse — it just burns through the vial faster.",
      "Ipamorelin is selective; GHRP-2 and GHRP-6 raise cortisol and prolactin more, which is why this pair is the common choice.",
    ],
    faqs: [
      {
        q: "How much BAC water for CJC-1295 and ipamorelin?",
        a: "For a 5 mg ipamorelin vial, 2.5 mL gives 2 mg/mL where 200 mcg = 10 units. For a 2 mg CJC-1295 vial, 2 mL gives 1 mg/mL where 100 mcg = 10 units. Add more water on either if you want larger, easier-to-read draws.",
      },
      {
        q: "How many units is 100 mcg of CJC-1295?",
        a: "At 1 mg/mL (2 mg vial + 2 mL) it is 0.1 mL = 10 units on a U-100 syringe. At 2 mg/mL it is 5 units — too small to measure reliably, which is why the lower concentration is preferred.",
      },
      {
        q: "Do I need two syringes for a CJC-1295 and ipamorelin stack?",
        a: "If they are in separate vials, yes — or draw one into the syringe and then the other, keeping the total volume within the barrel. Blended vials only need one draw, but you must know the per-peptide mg.",
      },
      {
        q: "Should I inject on an empty stomach?",
        a: "Yes, this is the one timing rule that consistently matters. Insulin released after a meal suppresses the growth hormone pulse these peptides are meant to trigger, so most protocols leave a two-hour gap either side.",
      },
    ],
    libraryPath: "/library/cjc-1295-ipamorelin",
    relatedPaths: [
      { path: "/library/cjc-1295-ipamorelin", label: "Full CJC-1295 + ipamorelin guide" },
    ],
  },
  {
    slug: "tesamorelin-dosage-calculator",
    name: "Tesamorelin",
    h1: "Tesamorelin Dosage Calculator",
    title: "Tesamorelin Dosage Calculator — Units & mg/mL | DoseRoutine",
    description:
      "Free tesamorelin dosage calculator. Convert vial mg and BAC water into mg/mL, U-100 syringe units per dose and doses per vial for the standard 2 mg dose.",
    intro:
      "Tesamorelin's licensed dose is 2 mg daily, but research vials come in several sizes. Enter yours below to get the exact insulin-syringe draw.",
    vialSizes: [2, 5, 10],
    defaults: { vialMg: 10, bacMl: 2, doseValue: 2, doseUnit: "mg" },
    presets: [
      { label: "10 mg / 2 mL → 2 mg", vialMg: 10, bacMl: 2, doseValue: 2, doseUnit: "mg" },
      { label: "5 mg / 1 mL → 1 mg", vialMg: 5, bacMl: 1, doseValue: 1, doseUnit: "mg" },
      { label: "2 mg / 2 mL → 2 mg", vialMg: 2, bacMl: 2, doseValue: 2, doseUnit: "mg" },
      { label: "10 mg / 5 mL → 2 mg", vialMg: 10, bacMl: 5, doseValue: 2, doseUnit: "mg" },
    ],
    doseRows: [
      {
        phase: "Licensed dose",
        dose: "2 mg",
        frequency: "Once daily",
        note: "Egrifta, for HIV-associated lipodystrophy.",
      },
      {
        phase: "Timing",
        dose: "—",
        frequency: "Before bed, fasted",
        note: "Aligns with the natural nocturnal GH pulse.",
      },
      {
        phase: "Site",
        dose: "—",
        frequency: "Subcutaneous abdomen",
        note: "Rotate sites; injection-site reactions are the most common complaint.",
      },
      {
        phase: "Assessment",
        dose: "—",
        frequency: "At ~6 months",
        note: "Visceral fat response is evaluated before continuing.",
      },
    ],
    notes: [
      "10 mg + 2 mL = 5 mg/mL, so the standard 2 mg dose is 40 units on a U-100 syringe.",
      "Tesamorelin is a GHRH analogue — it amplifies your own pulses rather than replacing GH, so effects build over months.",
      "It can raise IGF-1 and worsen glucose control. Monitoring both is standard practice.",
      "Contraindicated in pregnancy and in active malignancy.",
    ],
    faqs: [
      {
        q: "How many units is 2 mg of tesamorelin?",
        a: "At 5 mg/mL (10 mg vial + 2 mL BAC water) it is 0.4 mL = 40 units on a U-100 syringe. At 2 mg/mL (10 mg + 5 mL) the same dose is 100 units — a full syringe.",
      },
      {
        q: "How much BAC water for a 10 mg tesamorelin vial?",
        a: "2 mL is the most common, giving 5 mg/mL and a clean 40-unit draw for the standard 2 mg daily dose. 1 mL halves the volume to 20 units if you prefer smaller injections.",
      },
      {
        q: "Is tesamorelin dosed daily or weekly?",
        a: "Daily. Unlike CJC-1295 with DAC, tesamorelin has a short half-life and the licensed protocol is 2 mg subcutaneously once every day, usually at night.",
      },
      {
        q: "How long until tesamorelin works?",
        a: "Visceral fat changes in the pivotal trials were measured at 26 weeks. This is a months-long compound, not a weeks-long one.",
      },
    ],
    libraryPath: "/library/tesamorelin",
  },
  {
    slug: "tb-500-dosage-calculator",
    name: "TB-500",
    h1: "TB-500 Dosage Calculator",
    title: "TB-500 Dosage Calculator — Reconstitution & Units | DoseRoutine",
    description:
      "Free TB-500 dosage calculator. Enter vial mg and bacteriostatic water for mg/mL concentration, exact insulin-syringe units and doses per vial.",
    intro:
      "TB-500 is dosed in milligrams rather than micrograms, so draws are larger than most peptides — but the reconstitution math is identical. Enter your vial and target dose below.",
    vialSizes: [2, 5, 10],
    defaults: { vialMg: 5, bacMl: 2, doseValue: 2, doseUnit: "mg" },
    presets: [
      { label: "5 mg / 2 mL → 2 mg", vialMg: 5, bacMl: 2, doseValue: 2, doseUnit: "mg" },
      { label: "5 mg / 2.5 mL → 2.5 mg", vialMg: 5, bacMl: 2.5, doseValue: 2.5, doseUnit: "mg" },
      { label: "10 mg / 5 mL → 5 mg", vialMg: 10, bacMl: 5, doseValue: 5, doseUnit: "mg" },
      { label: "5 mg / 2 mL → 1 mg", vialMg: 5, bacMl: 2, doseValue: 1, doseUnit: "mg" },
    ],
    doseRows: [
      {
        phase: "Loading",
        dose: "2–5 mg",
        frequency: "Twice weekly",
        note: "Typically run for 4–6 weeks in anecdotal protocols.",
      },
      {
        phase: "Maintenance",
        dose: "2–5 mg",
        frequency: "Every 1–2 weeks",
        note: "Lower frequency after the loading period.",
      },
      {
        phase: "Common pairing",
        dose: "—",
        frequency: "With BPC-157",
        note: "Frequently stacked; calculate each peptide separately.",
      },
      {
        phase: "Cycle length",
        dose: "—",
        frequency: "6–12 weeks",
        note: "No human trial data supports any specific duration.",
      },
    ],
    notes: [
      "5 mg + 2 mL = 2.5 mg/mL, so a 2 mg dose is 80 units — most of a U-100 syringe.",
      "If the draw exceeds 100 units you cannot fit it in one U-100 syringe. Use less BAC water or split the injection.",
      "TB-500 has a long half-life, which is why protocols dose twice weekly rather than daily.",
      "Blended BPC-157/TB-500 vials must be calculated per peptide — the label weight is the sum of both.",
    ],
    faqs: [
      {
        q: "How much BAC water for a 5 mg TB-500 vial?",
        a: "2 mL is standard, giving 2.5 mg/mL. On that a 2 mg dose is 80 units and a 2.5 mg dose is a full 100-unit syringe. Use 1 mL if you want half the volume per injection.",
      },
      {
        q: "How many units is 2 mg of TB-500?",
        a: "At 2.5 mg/mL it is 0.8 mL = 80 units on a U-100 syringe. At 5 mg/mL (5 mg + 1 mL) the same dose is 40 units.",
      },
      {
        q: "How often should TB-500 be injected?",
        a: "Most protocols use twice weekly during a loading phase, then weekly or fortnightly for maintenance, because the peptide has a notably long half-life compared with BPC-157.",
      },
      {
        q: "Can TB-500 and BPC-157 go in the same syringe?",
        a: "People commonly draw both into one syringe, but you must calculate the units for each peptide separately and add them — never treat a blended label weight as a single peptide.",
      },
    ],
    libraryPath: "/library/tb-500",
    relatedPaths: [{ path: "/library/compare/bpc-157-vs-tb-500", label: "BPC-157 vs TB-500" }],
  },
  {
    slug: "ipamorelin-dosage-calculator",
    name: "Ipamorelin",
    h1: "Ipamorelin Dosage Calculator",
    title: "Ipamorelin Dosage Calculator — mcg to Syringe Units | DoseRoutine",
    description:
      "Free ipamorelin dosage calculator. Convert vial mg and BAC water into mg/mL, exact U-100 insulin-syringe units and total doses per vial.",
    intro:
      "Ipamorelin doses sit around 200–300 mcg, so how much bacteriostatic water you add decides whether your draw is a readable 10–30 units or an unmeasurable 4. Work it out below.",
    vialSizes: [2, 5, 10],
    defaults: { vialMg: 5, bacMl: 2.5, doseValue: 200, doseUnit: "mcg" },
    presets: [
      { label: "5 mg / 2.5 mL → 200 mcg", vialMg: 5, bacMl: 2.5, doseValue: 200, doseUnit: "mcg" },
      { label: "5 mg / 5 mL → 200 mcg", vialMg: 5, bacMl: 5, doseValue: 200, doseUnit: "mcg" },
      { label: "5 mg / 2.5 mL → 300 mcg", vialMg: 5, bacMl: 2.5, doseValue: 300, doseUnit: "mcg" },
      { label: "10 mg / 5 mL → 300 mcg", vialMg: 10, bacMl: 5, doseValue: 300, doseUnit: "mcg" },
    ],
    doseRows: [
      {
        phase: "Common dose",
        dose: "200–300 mcg",
        frequency: "1–3× daily",
        note: "Roughly the saturation point for a GH pulse.",
      },
      {
        phase: "Timing",
        dose: "—",
        frequency: "Fasted / before bed",
        note: "Food and insulin blunt the pulse.",
      },
      {
        phase: "Paired with",
        dose: "100 mcg CJC-1295",
        frequency: "Same injection",
        note: "GHRH + GHRP synergy is the usual reason to stack.",
      },
      {
        phase: "Cycle",
        dose: "—",
        frequency: "8–12 weeks",
        note: "Then a break; long-term data is absent.",
      },
    ],
    notes: [
      "5 mg + 5 mL = 1 mg/mL, so 200 mcg = 20 units — much easier to read than the 10 units you get at 2 mg/mL.",
      "Ipamorelin is the selective GHRP: less cortisol and prolactin impact than GHRP-2 or GHRP-6, and far less hunger than hexarelin.",
      "Going above the saturation dose does not increase the GH pulse — it just costs more.",
      "It is on the WADA prohibited list at all times for tested athletes.",
    ],
    faqs: [
      {
        q: "How many units is 200 mcg of ipamorelin?",
        a: "At 2 mg/mL (5 mg + 2.5 mL) it is 10 units on a U-100 syringe. At 1 mg/mL (5 mg + 5 mL) it is 20 units — the more accurate option for a dose this small.",
      },
      {
        q: "How much BAC water should I use for 5 mg of ipamorelin?",
        a: "2.5 mL to 5 mL. More water means larger, more readable draws with no change to the drug itself. 5 mL is the better choice if you are dosing 200 mcg.",
      },
      {
        q: "How many doses in a 5 mg ipamorelin vial?",
        a: "Twenty-five doses at 200 mcg, or about sixteen at 300 mcg. Reconstitution volume does not change the count.",
      },
      {
        q: "Is ipamorelin better alone or with CJC-1295?",
        a: "The pair is standard because they act on different receptors — CJC-1295 raises the amplitude of your own GHRH signal while ipamorelin triggers the pulse. Alone, ipamorelin still works, just with a smaller effect.",
      },
    ],
    libraryPath: "/library/ipamorelin",
    relatedPaths: [{ path: "/library/cjc-1295-ipamorelin", label: "CJC-1295 + ipamorelin guide" }],
  },
  {
    slug: "sermorelin-dosage-calculator",
    name: "Sermorelin",
    h1: "Sermorelin Dosage Calculator",
    title: "Sermorelin Dosage Calculator — Units & mg/mL | DoseRoutine",
    description:
      "Free sermorelin dosage calculator. Enter vial mg and BAC water to get mg/mL, exact insulin-syringe units per dose and total doses per vial.",
    intro:
      "Sermorelin is typically dosed 200–500 mcg nightly. Enter your vial size and bacteriostatic water volume to convert that into syringe units.",
    vialSizes: [2, 5, 9, 15],
    defaults: { vialMg: 5, bacMl: 2.5, doseValue: 300, doseUnit: "mcg" },
    presets: [
      { label: "5 mg / 2.5 mL → 300 mcg", vialMg: 5, bacMl: 2.5, doseValue: 300, doseUnit: "mcg" },
      { label: "5 mg / 5 mL → 200 mcg", vialMg: 5, bacMl: 5, doseValue: 200, doseUnit: "mcg" },
      { label: "9 mg / 3 mL → 500 mcg", vialMg: 9, bacMl: 3, doseValue: 500, doseUnit: "mcg" },
      { label: "15 mg / 5 mL → 500 mcg", vialMg: 15, bacMl: 5, doseValue: 500, doseUnit: "mcg" },
    ],
    doseRows: [
      {
        phase: "Common low",
        dose: "100–200 mcg",
        frequency: "Nightly",
        note: "Conservative starting range.",
      },
      {
        phase: "Common standard",
        dose: "200–500 mcg",
        frequency: "Nightly",
        note: "Most compounding-pharmacy protocols sit here.",
      },
      {
        phase: "Timing",
        dose: "—",
        frequency: "Bedtime, fasted",
        note: "Matches the natural overnight GH pulse.",
      },
      {
        phase: "Review",
        dose: "—",
        frequency: "At 3–6 months",
        note: "IGF-1 is the usual monitoring marker.",
      },
    ],
    notes: [
      "5 mg + 2.5 mL = 2 mg/mL, so 300 mcg = 15 units on a U-100 syringe.",
      "Sermorelin has a very short half-life (around 10–20 minutes), which is why it is dosed nightly rather than weekly.",
      "It is a GHRH analogue, so it depends on a working pituitary — it will not work like exogenous HGH.",
      "Sermorelin is prescription-only in the US when compounded for human use.",
    ],
    faqs: [
      {
        q: "How many units is 300 mcg of sermorelin?",
        a: "At 2 mg/mL (5 mg vial + 2.5 mL BAC water) it is 0.15 mL = 15 units on a U-100 syringe. At 1 mg/mL it would be 30 units.",
      },
      {
        q: "How much BAC water for a 5 mg sermorelin vial?",
        a: "2.5 mL is common and gives 2 mg/mL. Use 5 mL if your dose is 200 mcg or lower and you want a bigger, more readable draw.",
      },
      {
        q: "When should sermorelin be injected?",
        a: "At bedtime on an empty stomach. Its short half-life means it works by amplifying the natural nocturnal growth hormone pulse, and food-driven insulin blunts that pulse.",
      },
      {
        q: "Sermorelin or CJC-1295?",
        a: "Sermorelin is the shorter-acting original GHRH analogue; CJC-1295 is a modified version with a longer half-life. CJC-1295 with DAC lasts days, which changes the protocol from nightly to weekly.",
      },
    ],
    libraryPath: "/library/sermorelin",
  },
  {
    slug: "hcg-dosage-calculator",
    name: "HCG",
    h1: "HCG Dosage Calculator",
    title: "HCG Dosage Calculator — IU per Unit & Reconstitution | DoseRoutine",
    description:
      "Free HCG dosage calculator. Convert vial IU and bacteriostatic water into IU/mL and exact insulin-syringe units for 250 IU, 500 IU and 1000 IU doses.",
    intro:
      "HCG is measured in international units rather than milligrams, but the reconstitution math is identical — treat 1,000 IU as 1 'mg' in the calculator below and the unit conversions hold exactly.",
    vialSizes: [5, 10, 11],
    defaults: { vialMg: 5, bacMl: 5, doseValue: 250, doseUnit: "mcg" },
    presets: [
      { label: "5,000 IU / 5 mL → 250 IU", vialMg: 5, bacMl: 5, doseValue: 250, doseUnit: "mcg" },
      { label: "5,000 IU / 5 mL → 500 IU", vialMg: 5, bacMl: 5, doseValue: 500, doseUnit: "mcg" },
      {
        label: "10,000 IU / 10 mL → 500 IU",
        vialMg: 10,
        bacMl: 10,
        doseValue: 500,
        doseUnit: "mcg",
      },
      { label: "5,000 IU / 2 mL → 500 IU", vialMg: 5, bacMl: 2, doseValue: 500, doseUnit: "mcg" },
    ],
    doseRows: [
      {
        phase: "TRT adjunct",
        dose: "250–500 IU",
        frequency: "2–3× weekly",
        note: "Used to preserve testicular function and fertility.",
      },
      {
        phase: "Fertility protocols",
        dose: "1,000–2,500 IU",
        frequency: "2–3× weekly",
        note: "Prescriber-directed; monitored with bloodwork.",
      },
      {
        phase: "Post-cycle",
        dose: "500–1,000 IU",
        frequency: "Short course",
        note: "Restart protocols vary widely.",
      },
      {
        phase: "Monitoring",
        dose: "—",
        frequency: "Every 8–12 weeks",
        note: "Oestradiol can rise; total testosterone and E2 are tracked.",
      },
    ],
    notes: [
      "In the calculator, enter 1,000 IU as 1 mg — the ratio math is identical, so a '5 mg' vial mixed in 5 mL means 1,000 IU/mL and 250 IU = 25 units.",
      "HCG must be refrigerated after reconstitution and is generally treated as good for around 30 days.",
      "HCG raises oestradiol in some men on TRT — bloodwork matters more here than with most peptides.",
      "HCG is prescription-only. Purity and dose accuracy from unregulated sources are a real risk.",
    ],
    faqs: [
      {
        q: "How many units is 250 IU of HCG?",
        a: "At 1,000 IU/mL (a 5,000 IU vial mixed with 5 mL BAC water) it is 0.25 mL = 25 units on a U-100 syringe. At 2,500 IU/mL (5,000 IU + 2 mL) the same dose is 10 units.",
      },
      {
        q: "How much BAC water for a 5,000 IU HCG vial?",
        a: "5 mL is the cleanest option because it gives 1,000 IU per mL, making the arithmetic trivial: 250 IU = 25 units, 500 IU = 50 units, 1,000 IU = 100 units.",
      },
      {
        q: "Why is HCG used alongside TRT?",
        a: "Exogenous testosterone suppresses LH, which shuts down testicular signaling. HCG mimics LH, so it is used to maintain testicular volume and fertility during therapy.",
      },
      {
        q: "How long does mixed HCG last?",
        a: "Refrigerated at 2–8 °C, reconstituted HCG is typically treated as usable for around 30 days. Never freeze it and never leave it at room temperature.",
      },
    ],
    libraryPath: "/library/hcg",
    relatedPaths: [
      { path: "/trt-supplement-interactions", label: "TRT & supplement interactions" },
    ],
  },
  {
    slug: "testosterone-cypionate-dosage-calculator",
    name: "Testosterone cypionate",
    h1: "Testosterone Cypionate Dosage Calculator",
    title: "Testosterone Cypionate Dosage Calculator — mg to Units | DoseRoutine",
    description:
      "Free testosterone cypionate dosage calculator. Convert weekly mg and vial concentration into exact insulin-syringe units per injection.",
    intro:
      "Testosterone cypionate comes pre-mixed in oil at a stated concentration (usually 200 mg/mL), so you are not reconstituting — you are converting mg to volume. Enter the vial's total mg and total mL and the calculator handles the rest.",
    vialSizes: [200, 400, 2000],
    defaults: { vialMg: 2000, bacMl: 10, doseValue: 100, doseUnit: "mg" },
    presets: [
      { label: "200 mg/mL → 100 mg", vialMg: 2000, bacMl: 10, doseValue: 100, doseUnit: "mg" },
      { label: "200 mg/mL → 50 mg", vialMg: 2000, bacMl: 10, doseValue: 50, doseUnit: "mg" },
      { label: "100 mg/mL → 100 mg", vialMg: 1000, bacMl: 10, doseValue: 100, doseUnit: "mg" },
      { label: "250 mg/mL → 125 mg", vialMg: 2500, bacMl: 10, doseValue: 125, doseUnit: "mg" },
    ],
    doseRows: [
      {
        phase: "Typical TRT total",
        dose: "100–200 mg",
        frequency: "Per week",
        note: "Split into two injections in most modern protocols.",
      },
      {
        phase: "Twice weekly",
        dose: "50–100 mg",
        frequency: "Every 3–4 days",
        note: "Smoother levels than a single weekly shot.",
      },
      {
        phase: "Daily subcutaneous",
        dose: "~14–28 mg",
        frequency: "Daily",
        note: "Flattest curve; smallest volumes.",
      },
      {
        phase: "Bloodwork",
        dose: "—",
        frequency: "At 6–8 weeks",
        note: "Trough total T, free T, oestradiol, haematocrit.",
      },
    ],
    notes: [
      "At the common 200 mg/mL, 100 mg = 0.5 mL = 50 units on a U-100 syringe.",
      "Insulin syringes are marked in units, not mL. 100 units = 1 mL. This is the single most common mix-up.",
      "Cypionate is an oil — subcutaneous injections need a slower push and often a slightly longer needle than water-based peptides.",
      "Haematocrit rises on TRT for many people. It should be checked regularly, not assumed.",
    ],
    faqs: [
      {
        q: "How many units is 100 mg of testosterone cypionate?",
        a: "At 200 mg/mL it is 0.5 mL = 50 units on a U-100 insulin syringe. At 100 mg/mL the same dose is a full 1 mL = 100 units.",
      },
      {
        q: "How many units is 200 mg of testosterone?",
        a: "At 200 mg/mL that is exactly 1 mL, which is 100 units — a full U-100 syringe. Many people split this into two 50-unit injections across the week instead.",
      },
      {
        q: "Is it better to inject testosterone weekly or twice weekly?",
        a: "Twice weekly (or more often) produces smaller peaks and troughs, which many clinicians prefer for stability and for reducing oestradiol swings. The total weekly milligrams stay the same.",
      },
      {
        q: "Can testosterone cypionate be injected subcutaneously?",
        a: "Yes — subcutaneous injection is now widely used and generally as effective as intramuscular, with smaller needles. It can cause more local irritation with thicker oils.",
      },
    ],
    libraryPath: "/library/testosterone-cypionate",
    relatedPaths: [
      { path: "/trt-dosage-calculator", label: "TRT dosage calculator" },
      { path: "/trt-supplement-interactions", label: "TRT & supplement interactions" },
    ],
  },
  {
    slug: "bpc-157-tb-500-blend-dosage-calculator",
    name: "BPC-157 / TB-500 blend",
    h1: "BPC-157 + TB-500 Blend Dosage Calculator",
    title: "BPC-157 TB-500 Blend Dosage Calculator — Units | DoseRoutine",
    description:
      "Free BPC-157 and TB-500 blend dosage calculator. Work out mg/mL and exact insulin-syringe units when both peptides share one vial.",
    intro:
      "Blended vials are where most dosing mistakes happen. A vial labeled '10 mg blend' usually contains 5 mg of each peptide — so calculate against the per-peptide amount, not the label total. Use the calculator with one peptide's mg at a time.",
    vialSizes: [5, 10, 20],
    defaults: { vialMg: 5, bacMl: 3, doseValue: 250, doseUnit: "mcg" },
    presets: [
      {
        label: "BPC half: 5 mg / 3 mL → 250 mcg",
        vialMg: 5,
        bacMl: 3,
        doseValue: 250,
        doseUnit: "mcg",
      },
      { label: "TB half: 5 mg / 3 mL → 2 mg", vialMg: 5, bacMl: 3, doseValue: 2, doseUnit: "mg" },
      {
        label: "BPC half: 10 mg / 5 mL → 500 mcg",
        vialMg: 10,
        bacMl: 5,
        doseValue: 500,
        doseUnit: "mcg",
      },
      {
        label: "TB half: 10 mg / 5 mL → 2.5 mg",
        vialMg: 10,
        bacMl: 5,
        doseValue: 2.5,
        doseUnit: "mg",
      },
    ],
    doseRows: [
      {
        phase: "BPC-157 side",
        dose: "250–500 mcg",
        frequency: "Daily",
        note: "Short half-life; often split across the day.",
      },
      {
        phase: "TB-500 side",
        dose: "2–5 mg",
        frequency: "Twice weekly",
        note: "Long half-life; far less frequent.",
      },
      {
        phase: "The conflict",
        dose: "—",
        frequency: "—",
        note: "Different ideal frequencies is the strongest argument for separate vials.",
      },
      {
        phase: "Blend compromise",
        dose: "—",
        frequency: "Daily or EOD",
        note: "Most blend users split the difference and accept it.",
      },
    ],
    notes: [
      "Read the label carefully: '10 mg blend' almost always means 5 mg + 5 mg, not 10 mg of each.",
      "One draw delivers both peptides in a fixed ratio — you cannot dose them independently from a blended vial.",
      "Because the two have very different half-lives, separate vials give better control if you care about protocol precision.",
      "Neither peptide has completed human efficacy trials. All frequency conventions come from user practice.",
    ],
    faqs: [
      {
        q: "How do I calculate a BPC-157 / TB-500 blend dose?",
        a: "Split the vial into its two peptide amounts first. For a 10 mg blend that is 5 mg BPC-157 and 5 mg TB-500. Then run the reconstitution math on one peptide's mg — the syringe units are the same for both because they share the same liquid volume.",
      },
      {
        q: "Is a blend better than separate vials?",
        a: "Convenience yes, control no. BPC-157 suits daily dosing and TB-500 suits twice-weekly dosing, and a blend forces one schedule on both. Separate vials cost more effort and give a cleaner protocol.",
      },
      {
        q: "How much BAC water for a 10 mg BPC-157 / TB-500 blend?",
        a: "3–5 mL. More water gives larger, easier-to-read draws. At 10 mg total in 5 mL you have 1 mg/mL of each peptide, so 25 units delivers 250 mcg BPC-157 alongside 250 mcg TB-500.",
      },
      {
        q: "Can I inject a blend every day?",
        a: "People do, but it means the TB-500 side is dosed far more often than its long half-life requires. If you plan to dose daily, separate vials let you keep TB-500 on a twice-weekly schedule.",
      },
    ],
    libraryPath: "/library/bpc-157",
    relatedPaths: [
      { path: "/library/compare/bpc-157-vs-tb-500", label: "BPC-157 vs TB-500 compared" },
    ],
  },
];

export const CALCULATOR_SLUGS = CALCULATOR_PAGES.map((p) => p.slug);

export function getCalculatorPage(slug: string): CalculatorPage | undefined {
  return CALCULATOR_PAGES.find((p) => p.slug === slug);
}
