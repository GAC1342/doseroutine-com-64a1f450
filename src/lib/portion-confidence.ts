/**
 * Confidence gating for photo-based portion estimates.
 *
 * A camera estimate is only as good as the scale the model had to judge
 * against. When there was nothing of known size in frame, when the model's own
 * gram range is very wide, or when the calories and macros disagree, the
 * numbers are a guess dressed up as data. Rather than silently logging a bad
 * meal, we score the estimate and — below the bar — tell the user plainly that
 * it needs a retake, with the specific things to change about the next photo.
 */
import type { MealConfidence, MealEstimate, MealItem, MealReadSource } from "@/lib/meal-nutrition";

export type PortionVerdict = "trusted" | "check" | "retake";

export type PortionAssessment = {
  verdict: PortionVerdict;
  /** 0-100. Higher is a more defensible portion estimate. */
  score: number;
  /** Short headline for the banner. */
  title: string;
  /** One sentence explaining the verdict in plain language. */
  summary: string;
  /** Why the score landed where it did, most important first. */
  reasons: string[];
  /** Concrete things to do about it, most useful first. */
  steps: string[];
  /** Widest item spread we saw, as a percentage of the estimate. */
  widestSpreadPct: number;
  /** True when the model had nothing of known size to scale against. */
  missingScaleReference: boolean;
};

/** Below this score we ask for a retake; below "trusted" we ask for a check. */
export const RETAKE_THRESHOLD = 45;
export const TRUSTED_THRESHOLD = 78;

const CONFIDENCE_POINTS: Record<MealConfidence, number> = { high: 0, medium: -12, low: -30 };

/** How wide the model's own low/high range is, relative to its best guess. */
export function portionSpreadPct(item: MealItem): number {
  const best = Number(item.grams ?? 0);
  const low = Number(item.gramsLow ?? 0);
  const high = Number(item.gramsHigh ?? 0);
  if (!(best > 0) || !(low > 0) || !(high > 0) || high < low) return 0;
  return Math.round(((high - low) / best) * 100);
}

/**
 * Score a finished estimate. Barcode and label reads are measurements rather
 * than guesses, so they never fall into the retake path.
 */
export function assessPortionConfidence(
  estimate: Pick<MealEstimate, "items" | "confidence" | "note"> & {
    readFrom?: MealReadSource | null;
    scaleBasis?: string | null;
    reconciliation?: MealEstimate["reconciliation"];
  },
): PortionAssessment {
  const readFrom: MealReadSource = estimate.readFrom ?? "visual";
  const items = estimate.items.filter((item) => (item.calories ?? 0) > 0 || (item.grams ?? 0) > 0);
  const reasons: string[] = [];
  const steps: string[] = [];

  if (readFrom !== "visual") {
    return {
      verdict: "trusted",
      score: 100,
      title: readFrom === "barcode" ? "Read from the product panel" : "Read from the label",
      summary:
        readFrom === "barcode"
          ? "These numbers come from the manufacturer's published panel, not a portion guess."
          : "These numbers were transcribed from a printed nutrition label.",
      reasons: [],
      steps: [],
      widestSpreadPct: 0,
      missingScaleReference: false,
    };
  }

  let score = 100;

  score += CONFIDENCE_POINTS[estimate.confidence];
  if (estimate.confidence === "low") {
    reasons.push("The model rated its own read of this photo as low confidence.");
  } else if (estimate.confidence === "medium") {
    reasons.push("The model was only moderately sure about what it was looking at.");
  }

  const scaleBasis = (estimate.scaleBasis ?? "").trim();
  const missingScaleReference = scaleBasis.length === 0;
  if (missingScaleReference) {
    score -= 22;
    reasons.push(
      "Nothing of known size was in frame, so portion weights had no scale to work from.",
    );
    steps.push(
      "Retake the photo with a fork, a credit card or your thumb beside the food — that alone fixes most portion errors.",
    );
  }

  const spreads = items.map(portionSpreadPct).filter((pct) => pct > 0);
  const widestSpreadPct = spreads.length > 0 ? Math.max(...spreads) : 0;
  if (widestSpreadPct >= 100) {
    score -= 25;
    reasons.push(`One portion could be anywhere across a ${widestSpreadPct}% range.`);
  } else if (widestSpreadPct >= 60) {
    score -= 14;
    reasons.push(
      `Portion weights vary by up to ${widestSpreadPct}% between the low and high guess.`,
    );
  }

  const lowItems = items.filter((item) => item.itemConfidence === "low");
  if (lowItems.length > 0) {
    score -= Math.min(20, lowItems.length * 10);
    const names = lowItems
      .slice(0, 2)
      .map((item) => item.name)
      .join(" and ");
    reasons.push(
      `Hard to size: ${names}${lowItems.length > 2 ? ` and ${lowItems.length - 2} more` : ""}.`,
    );
    steps.push("Shoot straight down from about 30 cm so depth and spread are both visible.");
  }

  if (estimate.reconciliation?.status === "mismatch") {
    score -= 18;
    reasons.push(
      `Calories (${estimate.reconciliation.stated}) and macros (~${estimate.reconciliation.implied} kcal) don't line up.`,
    );
  }

  if (items.length >= 6) {
    score -= 8;
    reasons.push("Lots of separate components — mixed dishes are the hardest to weigh by eye.");
  }
  if (items.length === 0) {
    score -= 40;
    reasons.push("No food was clearly identified in the photo.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const verdict: PortionVerdict =
    score >= TRUSTED_THRESHOLD ? "trusted" : score < RETAKE_THRESHOLD ? "retake" : "check";

  if (verdict !== "trusted") {
    steps.push("Fill the frame with the food and avoid shadows or harsh angles.");
    steps.push(
      "Or skip the photo: search the food by name, or scan its barcode for exact numbers.",
    );
    if (verdict === "check") {
      steps.push("Happy with the numbers? Edit any portion below and save as normal.");
    }
  }

  const title =
    verdict === "trusted"
      ? "Portion estimate looks solid"
      : verdict === "check"
        ? "Double-check these portions"
        : "Low accuracy — retake the photo";

  const summary =
    verdict === "trusted"
      ? scaleBasis
        ? `Sized against ${scaleBasis}.`
        : "The portions in this photo were straightforward to judge."
      : verdict === "check"
        ? "These numbers are usable, but the portion sizes are the shaky part. Give them a quick look before saving."
        : "We're not confident enough in these portions to log them as they are.";

  return {
    verdict,
    score,
    title,
    summary,
    reasons: dedupe(reasons),
    steps: dedupe(steps),
    widestSpreadPct,
    missingScaleReference,
  };
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list.filter((entry) => entry.trim().length > 0)));
}
