/**
 * Barcode → supplement label lookup.
 *
 * Two free public sources, tried in order:
 *
 *  1. NIH Dietary Supplement Label Database (DSLD) — the US government's
 *     archive of real Supplement Facts panels. Gives brand, product name,
 *     amount per capsule, serving size and the manufacturer's own
 *     "Suggested Use" directions. No API key.
 *  2. Open Food Facts — community product database, better coverage outside
 *     the US and for food-style products.
 *
 * Everything is normalised into one `ProductLabel` shape so callers never
 * branch on the source. Runs server-side only.
 */

export type LabelIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
};

export type ProductLabel = {
  barcode: string;
  brand: string | null;
  name: string;
  /** e.g. "1 soft gel" */
  servingSize: string | null;
  servingUnitNoun: string | null;
  servingCount: number | null;
  servingsPerDay: number | null;
  ingredients: LabelIngredient[];
  /** Manufacturer's directions, verbatim. */
  directions: string | null;
  sourceName: string;
  sourceUrl: string | null;
};

const TIMEOUT_MS = 10_000;

async function getJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        // Open Food Facts asks every client to identify itself in this shape.
        "user-agent": "DoseRoutine - Web - Version 1.0 - https://doseroutine.com - scan",
      },
    });
    // 404 still carries a JSON body saying "not found"; treat it as a miss and
    // let the caller move to the next source rather than aborting the chain.
    if (!res.ok) return null;

    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** A barcode is digits only, 8–14 of them (EAN-8 … GTIN-14). */
export function normalizeBarcode(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

/* ---------------- DSLD ---------------- */

const DSLD_BASE = "https://api.ods.od.nih.gov/dsld/v9";

type DsldServingSize = {
  minQuantity?: number;
  minDailyServings?: number;
  maxDailyServings?: number;
  unit?: string;
};
type DsldStatement = { type?: string; notes?: string };
type DsldIngredientRow = {
  name?: string;
  quantity?: { quantity?: number; unit?: string }[];
};
type DsldLabel = {
  id?: number | string;
  fullName?: string;
  brandName?: string;
  servingSizes?: DsldServingSize[];
  statements?: DsldStatement[];
  ingredientRows?: DsldIngredientRow[];
};

const DIRECTION_TYPES = /suggested|recommended|usage|directions/i;

export function normalizeDsld(label: DsldLabel, barcode: string): ProductLabel | null {
  const name = (label.fullName ?? "").trim();
  if (!name) return null;

  const serving = label.servingSizes?.[0];
  const servingCount = serving?.minQuantity ?? null;
  const servingUnitNoun = serving?.unit ? singularise(serving.unit) : null;

  const directions =
    label.statements?.find((s) => DIRECTION_TYPES.test(s.type ?? ""))?.notes?.trim() ?? null;

  const ingredients: LabelIngredient[] = (label.ingredientRows ?? [])
    .map((row) => {
      const q = row.quantity?.[0];
      return {
        name: (row.name ?? "").trim(),
        amount: typeof q?.quantity === "number" ? q.quantity : null,
        unit: q?.unit ? String(q.unit).toLowerCase() : null,
      };
    })
    .filter((i) => i.name !== "");

  const id = label.id != null ? String(label.id) : null;

  return {
    barcode,
    brand: label.brandName?.trim() || null,
    name,
    servingSize:
      servingCount && servingUnitNoun
        ? `${servingCount} ${servingUnitNoun}${servingCount > 1 ? "s" : ""}`
        : null,
    servingUnitNoun,
    servingCount,
    servingsPerDay: serving?.maxDailyServings ?? serving?.minDailyServings ?? null,
    ingredients,
    directions,
    sourceName: "NIH Dietary Supplement Label Database",
    sourceUrl: id ? `https://dsld.od.nih.gov/label/${id}` : null,
  };
}

function singularise(unit: string): string {
  return unit
    .replace(/\(s\)/i, "")
    .replace(/s$/i, "")
    .trim()
    .toLowerCase()
    .replace(/^softgel$/, "soft gel");
}

/**
 * DSLD stores UPCs the way they're printed — "0 74312 76274 1" — so a plain
 * digit search never matches. We query the spaced form, then confirm the
 * candidate's own upcSku digits before trusting it: a fuzzy text hit on the
 * wrong bottle would show someone the wrong Supplement Facts panel.
 */
function spacedUpc(digits: string): string | null {
  if (digits.length !== 12) return null;
  return `${digits[0]} ${digits.slice(1, 6)} ${digits.slice(6, 11)} ${digits[11]}`;
}

async function lookupDsld(barcode: string): Promise<ProductLabel | null> {
  const spaced = spacedUpc(barcode);
  const queries = [barcode, ...(spaced ? [`"${spaced}"`] : [])];
  for (const query of queries) {
    const search = (await getJson(
      `${DSLD_BASE}/search-filter?q=${encodeURIComponent(query)}&size=5`,
    )) as { hits?: { _id?: string }[] } | null;
    for (const hit of search?.hits ?? []) {
      const id = hit?._id;
      if (!id) continue;
      const label = (await getJson(`${DSLD_BASE}/label/${encodeURIComponent(id)}`)) as
        | (DsldLabel & { upcSku?: string })
        | null;
      if (!label || Array.isArray(label)) continue;
      const upc = String(label.upcSku ?? "").replace(/\D/g, "");
      if (!upc || upc.replace(/^0+/, "") !== barcode.replace(/^0+/, "")) continue;
      return normalizeDsld({ ...label, id: label.id ?? id }, barcode);
    }
  }
  return null;
}

/* ---------------- Open Food Facts ---------------- */

type OffProduct = {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  generic_name?: string;
  preparation?: string;
};

export function normalizeOff(product: OffProduct, barcode: string): ProductLabel | null {
  const name = (product.product_name ?? "").trim();
  if (!name) return null;
  return {
    barcode,
    brand: product.brands?.split(",")[0]?.trim() || null,
    name,
    servingSize: product.serving_size?.trim() || null,
    servingUnitNoun: null,
    servingCount: null,
    servingsPerDay: null,
    ingredients: [],
    directions: product.preparation?.trim() || null,
    sourceName: "Open Food Facts",
    sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
  };
}

async function lookupOff(barcode: string): Promise<ProductLabel | null> {
  const json = (await getJson(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
      `?fields=product_name,brands,serving_size,generic_name,preparation`,
  )) as { status?: number; product?: OffProduct } | null;
  if (!json || json.status !== 1 || !json.product) return null;
  return normalizeOff(json.product, barcode);
}

/** USDA Branded is the third source — many US products live only there. */
async function lookupUsda(barcode: string): Promise<ProductLabel | null> {
  try {
    const { lookupUsdaByBarcode } = await import("@/lib/usda.server");
    const food = await lookupUsdaByBarcode(barcode);
    if (!food) return null;
    return {
      barcode,
      brand: food.brand,
      name: food.name,
      servingSize: food.defaultPortionG > 0 ? `${Math.round(food.defaultPortionG)} g` : null,
      servingUnitNoun: null,
      servingCount: null,
      servingsPerDay: null,
      ingredients: [],
      directions: null,
      sourceName: "USDA FoodData Central",
      sourceUrl: "https://fdc.nal.usda.gov/",
    };
  } catch {
    return null;
  }
}

/**
 * Look a barcode up across all three sources, trying every GTIN padding
 * (UPC-E, UPC-A, EAN-13, GTIN-14) because each database stores a different
 * one. Never throws — an unreachable or slow upstream simply means
 * "not found" so the scan flow keeps working.
 */
export async function lookupBarcode(raw: string): Promise<ProductLabel | null> {
  const barcode = normalizeBarcode(raw);
  if (!barcode) return null;
  const { gtinVariants } = await import("@/lib/gtin");
  const variants = gtinVariants(barcode).slice(0, 4);
  const codes = variants.length > 0 ? variants : [barcode];

  for (const code of codes) {
    const dsld = await lookupDsld(code);
    if (dsld) return { ...dsld, barcode };
  }
  for (const code of codes) {
    const off = await lookupOff(code);
    if (off) return { ...off, barcode };
  }
  const usda = await lookupUsda(barcode);
  return usda ? { ...usda, barcode } : null;
}
