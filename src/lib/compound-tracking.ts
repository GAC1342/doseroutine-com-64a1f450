/**
 * "How to track <compound> doses" — derived, per-compound tracking guidance.
 *
 * Everything here is generated from fields already on the compound row
 * (category, unit, timing, food rule, half-life). No new medical claims are
 * introduced: the steps describe how to *record* a protocol, not how to dose
 * one. Keeping it derived means all 475+ library entries get a section that is
 * specific to the compound without hand-writing 475 blocks of copy.
 */

export interface TrackingCompound {
  name: string;
  category: string | null;
  default_unit: string | null;
  typical_timing: string | null;
  food_rule: string | null;
  half_life_hours: number | null;
}

export interface TrackingStep {
  name: string;
  text: string;
}

export interface CompoundTracking {
  /** Section heading, also used as the HowTo schema name. */
  title: string;
  intro: string;
  steps: TrackingStep[];
  /** Short "log these fields" checklist. */
  logFields: string[];
  injectable: boolean;
}

const INJECTABLE = new Set(["peptide", "glp1", "hormone"]);

function unitLabel(c: TrackingCompound): string {
  return c.default_unit ? c.default_unit.toLowerCase() : "mg";
}

function foodText(rule: string | null): string | null {
  if (!rule) return null;
  const r = rule.toLowerCase().replace(/_/g, " ");
  if (r.includes("empty")) return "on an empty stomach";
  if (r.includes("with food") || r === "with meal" || r.includes("meal")) return "with food";
  if (r.includes("either") || r.includes("any")) return "with or without food";
  return r;
}

export function buildCompoundTracking(c: TrackingCompound): CompoundTracking {
  const injectable = INJECTABLE.has((c.category ?? "").toLowerCase());
  const unit = unitLabel(c);
  const timing = c.typical_timing?.trim() || null;
  const food = foodText(c.food_rule);
  const halfLife = c.half_life_hours ?? null;

  const steps: TrackingStep[] = [];

  if (injectable) {
    steps.push({
      name: `Record the vial and concentration`,
      text: `Log the vial strength and the volume of bacteriostatic water you added so ${c.name} is stored as a concentration rather than a guess. DoseRoutine converts that into ${unit} per syringe unit and counts the doses left in the vial as you log.`,
    });
    steps.push({
      name: "Set the schedule, not just a reminder",
      text: `Enter the dose in ${unit} and the frequency${timing ? ` (typical timing: ${timing.toLowerCase()})` : ""}. Cycled protocols get a start and end date so the history stays accurate when ${c.name} comes out of the routine.`,
    });
    steps.push({
      name: "Rotate and log the injection site",
      text: `Pick the site at the moment you log the dose. The site map shows what you used last and how recently, which is the part that drifts fastest when two compounds run on different frequencies.`,
    });
  } else {
    steps.push({
      name: "Add the dose and unit",
      text: `Log ${c.name} with its dose in ${unit} so totals stay comparable over time — including days when you split the dose or skip it.`,
    });
    steps.push({
      name: "Set the time of day and food rule",
      text: `${timing ? `Typical timing is ${timing.toLowerCase()}.` : "Pick the time you actually take it."}${food ? ` Take it ${food}, and record it that way so absorption stays consistent.` : ""} Reminders fire at that time and can export to your calendar.`,
    });
    steps.push({
      name: "Check it against the rest of the stack",
      text: `Run ${c.name} through the interaction checker against everything else in the routine — supplements, peptides, hormones and prescriptions — before it becomes a daily habit.`,
    });
  }

  steps.push({
    name: "Log adherence, not intentions",
    text: `Mark each dose taken, skipped or delayed as it happens. Weeks of honest logs are what make an adherence rate or a trend line meaningful; retrospective guessing is not.`,
  });

  steps.push({
    name: "Review against outcomes",
    text: halfLife
      ? `With a reported half-life around ${halfLife} h, effects and timing shifts show up over days rather than instantly. Review ${c.name} alongside your logged metrics and any relevant blood work every few weeks before changing the dose.`
      : `Review ${c.name} alongside your logged metrics and any relevant blood work every few weeks before changing the dose, so the change is a response to data rather than to a good or bad day.`,
  });

  const logFields = injectable
    ? [
        `Dose in ${unit} and the syringe units it worked out to`,
        "Vial: reconstitution date, concentration, doses remaining",
        "Injection site and time",
        "Any side effects in the 24 h after the dose",
      ]
    : [
        `Dose in ${unit}`,
        `Time of day${food ? ` and whether it was taken ${food}` : ""}`,
        "Taken / skipped / delayed",
        "Any side effects or notable changes",
      ];

  const intro = injectable
    ? `${c.name} is tracked as a protocol rather than a single reminder: a vial with a concentration, a schedule that may be titrated or cycled, and a rotation of injection sites. Here is the record that keeps all three consistent.`
    : `Tracking ${c.name} well takes four fields and a habit. Here is what to record so the log is still useful in three months.`;

  return {
    title: `How to track ${c.name} doses`,
    intro,
    steps,
    logFields,
    injectable,
  };
}

/** schema.org HowTo node for the compound's tracking section. */
export function compoundTrackingHowTo(tracking: CompoundTracking, pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${pageUrl}#how-to-track`,
    name: tracking.title,
    description: tracking.intro,
    totalTime: "PT5M",
    step: tracking.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${pageUrl}#how-to-track`,
    })),
  };
}
