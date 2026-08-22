import type { MealItem } from "@/lib/meal-nutrition";

/**
 * One line on the shopping list: a food, how many planned meals include it,
 * and the total weight when every occurrence published grams.
 */
export type GroceryLine = {
  name: string;
  /** Number of planned portions across the week. */
  portions: number;
  /** Summed grams, or null when at least one portion had no weight. */
  grams: number | null;
  /** Distinct portion descriptions, for the "2 cups, 1 scoop" hint. */
  notes: string[];
};

function normalize(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCase(name: string) {
  return name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Roll planned meal items into a de-duplicated shopping list.
 *
 * Grams stay null unless every occurrence of that food carried a weight —
 * a partial sum would understate what you need to buy.
 */
export function buildGroceryList(
  itemGroups: ReadonlyArray<ReadonlyArray<MealItem>>,
): GroceryLine[] {
  const lines = new Map<string, GroceryLine & { missingGrams: boolean }>();

  for (const group of itemGroups) {
    for (const item of group) {
      const raw = typeof item?.name === "string" ? item.name : "";
      if (!raw.trim()) continue;
      const key = normalize(raw);
      const existing = lines.get(key) ?? {
        name: titleCase(key),
        portions: 0,
        grams: 0,
        notes: [] as string[],
        missingGrams: false,
      };
      existing.portions += 1;
      const grams = Number(item.grams);
      if (item.grams == null || !Number.isFinite(grams) || grams <= 0) {
        existing.missingGrams = true;
      } else {
        existing.grams = (existing.grams ?? 0) + grams;
      }
      const portion = typeof item.portion === "string" ? item.portion.trim() : "";
      if (portion && !existing.notes.includes(portion) && existing.notes.length < 3) {
        existing.notes.push(portion);
      }
      lines.set(key, existing);
    }
  }

  return [...lines.values()]
    .map(({ missingGrams, ...line }) => ({
      ...line,
      grams: missingGrams || !line.grams ? null : Math.round(line.grams),
    }))
    .sort((a, b) => b.portions - a.portions || a.name.localeCompare(b.name));
}

/** Plain-text export so the list can be pasted into notes or a messaging app. */
export function groceryListToText(lines: ReadonlyArray<GroceryLine>): string {
  return lines
    .map((line) => {
      const qty = line.grams != null ? ` — ${line.grams}g` : "";
      const count = line.portions > 1 ? ` (x${line.portions})` : "";
      return `- ${line.name}${count}${qty}`;
    })
    .join("\n");
}
