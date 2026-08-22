/**
 * Food database access (server-only).
 *
 * Reads go through the publishable key (the catalog is public, read-only).
 * Writes — caching a USDA hit, promoting a user-verified food, bumping the
 * log counter — go through the service role, because nothing outside the
 * server is allowed to change the catalog.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  getUsdaFoodById,
  lookupUsdaByBarcode,
  searchUsdaFoods,
  usdaQualityScore,
  type UsdaFood,
} from "@/lib/usda.server";

export type FoodRecord = {
  id: string;
  name: string;
  brand: string | null;
  source: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  defaultPortionG: number;
  qualityScore: number;
  verified: boolean;
  /** Extended nutrition per 100 g, when the source publishes it. */
  fiber100: number | null;
  sugar100: number | null;
  sodium100mg: number | null;
  satfat100: number | null;
};

function numOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export type FoodPortionRecord = {
  label: string;
  grams: number;
  isDefault: boolean;
  referenceHint: string | null;
};

export function normalizeFoodName(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9%,/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function publicClient(): SupabaseClient<Database> {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

type FoodRow = Database["public"]["Tables"]["foods"]["Row"];

function toRecord(row: FoodRow): FoodRecord {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    source: row.source,
    kcal100: Number(row.kcal_100g) || 0,
    protein100: Number(row.protein_100g) || 0,
    carbs100: Number(row.carbs_100g) || 0,
    fat100: Number(row.fat_100g) || 0,
    defaultPortionG: Number(row.default_portion_g) || 100,
    qualityScore: Number(row.quality_score) || 0,
    verified: Boolean(row.verified),
    fiber100: numOrNull(row.fiber_100g),
    sugar100: numOrNull(row.sugar_100g),
    sodium100mg: numOrNull(row.sodium_100mg),
    satfat100: numOrNull(row.satfat_100g),
  };
}

/** Exact name or alias hit in our own catalog. */
export async function findFoodByName(name: string): Promise<FoodRecord | null> {
  const norm = normalizeFoodName(name);
  if (!norm) return null;
  const db = publicClient();

  const direct = await db
    .from("foods")
    .select("*")
    .eq("name_norm", norm)
    .order("quality_score", { ascending: false })
    .limit(1);
  if (direct.data && direct.data.length > 0) return toRecord(direct.data[0]!);

  const alias = await db.from("food_aliases").select("food_id").eq("alias_norm", norm).limit(1);
  const foodId = alias.data?.[0]?.food_id;
  if (!foodId) return null;
  const byId = await db.from("foods").select("*").eq("id", foodId).limit(1);
  return byId.data?.[0] ? toRecord(byId.data[0]) : null;
}

/** Loose catalog search used for fuzzy matching and the manual food picker. */
export async function searchFoodCatalog(query: string, limit = 8): Promise<FoodRecord[]> {
  const norm = normalizeFoodName(query);
  if (norm.length < 2) return [];
  const db = publicClient();
  const { data } = await db
    .from("foods")
    .select("*")
    .ilike("name_norm", `%${norm}%`)
    .order("quality_score", { ascending: false })
    .order("times_logged", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toRecord);
}

export async function getFoodPortions(foodId: string): Promise<FoodPortionRecord[]> {
  const db = publicClient();
  const { data } = await db
    .from("food_portions")
    .select("label, grams, is_default, reference_hint")
    .eq("food_id", foodId)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((row) => ({
    label: row.label,
    grams: Number(row.grams) || 0,
    isDefault: Boolean(row.is_default),
    referenceHint: row.reference_hint,
  }));
}

/* --------------------------------- writes -------------------------------- */

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Cache a USDA result into our catalog so we own the data from then on. */
export async function cacheUsdaFood(food: UsdaFood): Promise<FoodRecord | null> {
  const admin = await adminClient();
  const payload = {
    name: food.name,
    name_norm: normalizeFoodName(food.name),
    brand: food.brand,
    source: "usda",
    external_id: food.fdcId,
    gtin: food.gtin,
    kcal_100g: food.kcal100,
    protein_100g: food.protein100,
    carbs_100g: food.carbs100,
    fat_100g: food.fat100,
    fiber_100g: food.fiber100,
    sugar_100g: food.sugar100,
    sodium_100mg: food.sodium100mg,
    satfat_100g: food.satfat100,
    default_portion_g: food.defaultPortionG,
    quality_score: usdaQualityScore(food.dataType),
    verified: true,
  };
  const { data, error } = await admin
    .from("foods")
    .upsert(payload, { onConflict: "source,external_id" })
    .select("*")
    .limit(1);
  if (error || !data?.[0]) return null;
  await saveUsdaPortions(data[0].id, food.portions);
  return toRecord(data[0]);
}

/**
 * Store USDA's household measures ("1 cup chopped" = 91 g) as real portion
 * chips. Replacing the whole set keeps a re-import idempotent.
 */
async function saveUsdaPortions(
  foodId: string,
  portions: { label: string; grams: number }[],
): Promise<void> {
  if (portions.length === 0) return;
  const admin = await adminClient();
  const existing = await admin
    .from("food_portions")
    .select("id")
    .eq("food_id", foodId)
    .eq("source", "usda");
  if (existing.data && existing.data.length > 0) {
    await admin.from("food_portions").delete().eq("food_id", foodId).eq("source", "usda");
  }
  await admin.from("food_portions").insert(
    portions.slice(0, 8).map((p, index) => ({
      food_id: foodId,
      label: p.label,
      grams: p.grams,
      is_default: index === 0,
      sort_order: index,
      source: "usda",
    })),
  );
}

/** USDA lookup that transparently caches into our own database. */
export async function lookupUsdaAndCache(name: string): Promise<FoodRecord | null> {
  const [best] = await searchUsdaFoods(name, 1);
  if (!best) return null;
  // Search results omit the portion table; the detail record carries it.
  const detailed = (await getUsdaFoodById(best.fdcId).catch(() => null)) ?? best;
  return cacheUsdaFood(detailed);
}

/** Find a branded food we already cached by its barcode (any GTIN padding). */
export async function findFoodByGtin(barcode: string): Promise<FoodRecord | null> {
  const { gtinVariants } = await import("@/lib/gtin");
  const variants = gtinVariants(barcode);
  if (variants.length === 0) return null;
  const db = publicClient();
  const { data } = await db.from("foods").select("*").in("gtin", variants).limit(1);
  return data?.[0] ? toRecord(data[0]) : null;
}

/** Barcode fallback through USDA's Branded set, cached on the way through. */
export async function lookupUsdaBarcodeAndCache(barcode: string): Promise<FoodRecord | null> {
  const cached = await findFoodByGtin(barcode).catch(() => null);
  if (cached) return cached;
  const food = await lookupUsdaByBarcode(barcode);
  if (!food) return null;
  return cacheUsdaFood(food);
}

/** Full resolution chain against our catalog, then USDA. */
export async function resolveFoodRecord(name: string): Promise<FoodRecord | null> {
  const own = await findFoodByName(name);
  if (own) return own;
  const fuzzy = await searchFoodCatalog(name, 1);
  if (fuzzy[0]) return fuzzy[0];
  return lookupUsdaAndCache(name);
}

export async function bumpTimesLogged(foodIds: string[]): Promise<void> {
  const ids = Array.from(new Set(foodIds.filter(Boolean)));
  if (ids.length === 0) return;
  const admin = await adminClient();
  const { data } = await admin.from("foods").select("id, times_logged").in("id", ids);
  await Promise.all(
    (data ?? []).map((row) =>
      admin
        .from("foods")
        .update({ times_logged: (Number(row.times_logged) || 0) + 1 })
        .eq("id", row.id),
    ),
  );
}

/**
 * Promote a food the user corrected by hand into the catalog, so the next scan
 * of the same thing starts from real numbers instead of a guess.
 */
export async function promoteUserFood(input: {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}): Promise<string | null> {
  const grams = Number(input.grams);
  const norm = normalizeFoodName(input.name);
  if (!norm || !Number.isFinite(grams) || grams <= 0) return null;
  if (input.calories <= 0 && input.protein_g <= 0 && input.carbs_g <= 0 && input.fat_g <= 0) {
    return null;
  }
  const factor = 100 / grams;
  const admin = await adminClient();
  const { data, error } = await admin
    .from("foods")
    .upsert(
      {
        name: input.name.slice(0, 120),
        name_norm: norm,
        source: "user",
        kcal_100g: Math.round(input.calories * factor * 10) / 10,
        protein_100g: Math.round(input.protein_g * factor * 10) / 10,
        carbs_100g: Math.round(input.carbs_g * factor * 10) / 10,
        fat_100g: Math.round(input.fat_g * factor * 10) / 10,
        default_portion_g: Math.round(grams),
        quality_score: 60,
        verified: false,
      },
      { onConflict: "name_norm,source" },
    )
    .select("id")
    .limit(1);
  if (error || !data?.[0]) return null;
  return data[0].id;
}

/**
 * Cache a panel from an external source (currently Open Food Facts) into our
 * own catalog. Community data is never marked verified, and it scores below
 * USDA so a later USDA hit for the same product wins.
 */
export async function cacheExternalFood(input: {
  name: string;
  brand: string | null;
  source: string;
  externalId: string;
  gtin: string | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100?: number | null;
  sugar100?: number | null;
  sodium100mg?: number | null;
  satfat100?: number | null;
  defaultPortionG: number;
}): Promise<FoodRecord | null> {
  const name = String(input.name ?? "").trim();
  if (!name) return null;
  try {
    const admin = await adminClient();
    const { data, error } = await admin
      .from("foods")
      .upsert(
        {
          name: name.slice(0, 200),
          name_norm: normalizeFoodName(name),
          brand: input.brand,
          source: input.source,
          external_id: input.externalId,
          gtin: input.gtin,
          kcal_100g: input.kcal100,
          protein_100g: input.protein100,
          carbs_100g: input.carbs100,
          fat_100g: input.fat100,
          fiber_100g: input.fiber100 ?? null,
          sugar_100g: input.sugar100 ?? null,
          sodium_100mg: input.sodium100mg ?? null,
          satfat_100g: input.satfat100 ?? null,
          default_portion_g: input.defaultPortionG,
          quality_score: 45,
          verified: false,
        },
        { onConflict: "source,external_id" },
      )
      .select("*")
      .limit(1);
    if (error || !data?.[0]) return null;
    return toRecord(data[0]);
  } catch {
    return null;
  }
}
