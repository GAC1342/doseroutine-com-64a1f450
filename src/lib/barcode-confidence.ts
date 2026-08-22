/**
 * How much to trust a barcode result.
 *
 * A "found" flag isn't enough: an exact GTIN match against a manufacturer
 * panel is very different from a crowdsourced entry with a name and three
 * macros, or a padded-variant match that might be a different pack size. The
 * score drives the badge in the review sheet and decides whether we show
 * alternates before saving.
 *
 * Pure functions only — shared by the server lookup and the UI.
 */
import { sameGtin } from "@/lib/gtin";

export type PanelLike = {
  found: boolean;
  name: string;
  brand: string | null;
  servingSize: string | null;
  basis: "serving" | "100g" | null;
  perServing: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    grams?: number | null;
  } | null;
};

export type MatchSource = "cache" | "catalog" | "openfoodfacts" | "usda" | "offline";

export const MATCH_SOURCE_LABELS: Record<MatchSource, string> = {
  cache: "Saved on this device",
  catalog: "DoseRoutine food database",
  openfoodfacts: "Open Food Facts",
  usda: "USDA FoodData Central",
  offline: "Offline copy",
};

export type ConfidenceLevel = "exact" | "high" | "medium" | "low";

export type MatchConfidence = {
  /** 0–100. */
  score: number;
  level: ConfidenceLevel;
  /** Plain-English reasons, best first, shown under the product name. */
  reasons: string[];
  /** What the user should do next when the score isn't convincing. */
  advice: string | null;
};

const LEVEL_ADVICE: Record<ConfidenceLevel, string | null> = {
  exact: null,
  high: null,
  medium: "Check the serving size against the pack before saving.",
  low: "Pick a closer match below, or type the panel in by hand.",
};

/** Atwater cross-check: do the macros add up to the stated calories? */
export function macroDrift(panel: PanelLike): number | null {
  const item = panel.perServing;
  if (!item) return null;
  const kcal = Number(item.calories) || 0;
  const implied =
    (Number(item.protein_g) || 0) * 4 +
    (Number(item.carbs_g) || 0) * 4 +
    (Number(item.fat_g) || 0) * 9;
  if (kcal <= 0 && implied <= 0) return 0;
  if (kcal <= 0) return 1;
  return Math.abs(kcal - implied) / kcal;
}

export function scoreBarcodeMatch(input: {
  panel: PanelLike;
  source: MatchSource;
  /** The digits the user actually scanned. */
  scanned: string;
  /** The digits that produced the hit (may be a padding variant). */
  matched: string;
  /** True when the panel came from cache and the network is unavailable. */
  offline?: boolean;
}): MatchConfidence {
  const { panel, source, scanned, matched } = input;
  if (!panel.found || !panel.perServing) {
    return {
      score: 0,
      level: "low",
      reasons: ["No published panel matched this code."],
      advice: LEVEL_ADVICE.low,
    };
  }

  const reasons: string[] = [];
  // Things that lower the score are the ones the user needs to see, so they
  // are surfaced ahead of the reassuring ones when the list is trimmed.
  const warnings: string[] = [];
  let score = 40;

  const exactCode = sameGtin(scanned, matched);
  if (exactCode) {
    score += 25;
    reasons.push("Exact barcode match");
  } else {
    score += 10;
    reasons.push("Matched a padding variant of this barcode");
  }

  if (source === "usda" || source === "catalog") {
    score += 20;
    reasons.push(
      source === "usda" ? "USDA Branded verified panel" : "Verified in our food database",
    );
  } else if (source === "openfoodfacts") {
    score += 10;
    reasons.push("Open Food Facts community panel");
  } else if (source === "cache") {
    score += 15;
    reasons.push("Previously confirmed on this device");
  } else if (source === "offline") {
    score -= 5;
    reasons.push("Offline copy — reconnect to refresh");
  }

  if (panel.brand) {
    score += 5;
    reasons.push(`Brand on file: ${panel.brand}`);
  }
  if (panel.basis === "serving" && panel.servingSize) {
    score += 8;
    reasons.push(`Serving size published (${panel.servingSize})`);
  } else if (panel.basis === "100g") {
    score -= 5;
    warnings.push("Per-100 g values only — set your portion");
  }

  const drift = macroDrift(panel);
  if (drift != null) {
    if (drift <= 0.1) {
      score += 8;
      reasons.push("Calories match the macros");
    } else if (drift > 0.35) {
      score -= 18;
      warnings.push("Calories don't line up with the macros");
    }
  }

  const item = panel.perServing;
  const allZero =
    !Number(item.calories) &&
    !Number(item.protein_g) &&
    !Number(item.carbs_g) &&
    !Number(item.fat_g);
  if (allZero) {
    score -= 10;
    warnings.push("Panel lists zero for every macro");
  }
  if (!panel.name || panel.name.length < 3) {
    score -= 10;
    warnings.push("Product name is incomplete");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: ConfidenceLevel =
    score >= 90 ? "exact" : score >= 72 ? "high" : score >= 50 ? "medium" : "low";
  return {
    score,
    level,
    reasons: [...warnings, ...reasons].slice(0, 4),
    advice: LEVEL_ADVICE[level],
  };
}

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  exact: "Exact match",
  high: "Strong match",
  medium: "Likely match",
  low: "Weak match",
};

/** Rank alternates so the most plausible substitute is offered first. */
export function rankAlternates<
  T extends { panel: PanelLike; source: MatchSource; matched: string },
>(scanned: string, candidates: T[]): Array<T & { confidence: MatchConfidence }> {
  return candidates
    .map((candidate) => ({
      ...candidate,
      confidence: scoreBarcodeMatch({
        panel: candidate.panel,
        source: candidate.source,
        scanned,
        matched: candidate.matched,
      }),
    }))
    .sort((a, b) => b.confidence.score - a.confidence.score);
}
