/**
 * Half-life labeling.
 *
 * `compounds.half_life_hours` stores a single number with no recorded type, so
 * rendering it as a bare "Half-life" implies a plasma (elimination) half-life
 * even where the published figure is a whole-body biological turnover value —
 * which is what nutrient literature reports for minerals and most vitamins.
 *
 * This maps the compound's category to the half-life type that its published
 * figures actually describe, so the page never implies plasma kinetics for a
 * nutrient turnover number. No value is changed, only labelled.
 */

const BIOLOGICAL_TURNOVER = new Set(["mineral", "vitamin", "electrolyte", "amino_acid"]);

export function halfLifeLabel(category: string | null | undefined): string {
  const cat = (category ?? "").toLowerCase().replace(/\s+/g, "_");
  if (BIOLOGICAL_TURNOVER.has(cat)) return "Whole-body biological half-life";
  return "Plasma half-life";
}

/** Longer explanation used as a tooltip/description next to the value. */
export function halfLifeHint(category: string | null | undefined): string {
  const cat = (category ?? "").toLowerCase().replace(/\s+/g, "_");
  return BIOLOGICAL_TURNOVER.has(cat)
    ? "Approximate whole-body turnover reported for this nutrient — not a plasma elimination half-life."
    : "Approximate plasma (elimination) half-life. Actual values vary by route, dose and individual.";
}
