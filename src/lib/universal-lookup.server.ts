/**
 * Universal barcode routing: one code in, one normalized product out.
 *
 * Every source is queried in parallel and the best answer wins (see
 * SOURCE_PRIORITY). Each adapter is individually timed out and never throws,
 * so a slow federal API can't hold up a scan. Results are written to the
 * shared barcode_cache so the second person to scan a product gets it
 * instantly.
 *
 * Server-only.
 */

import { canonicalGtin, gtinVariants } from "@/lib/gtin";
import { ndc11Candidates, ndcFromBarcode, productNdcCandidates } from "@/lib/ndc";
import {
  EMPTY_NUTRITION,
  categoryFromOffTags,
  mergeProducts,
  pickBestProduct,
  type LookupResult,
  type ProductCategory,
  type ProductIngredient,
  type UniversalProduct,
} from "@/lib/universal-product";

const SOURCE_TIMEOUT_MS = 6000;

type Gs1Extras = { lot: string | null; expiry: string | null; serial: string | null } | null;

const num = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
};

const text = (value: unknown): string | null => {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : null;
};

/** Fetch JSON with a hard timeout; resolves to null on any failure. */
async function getJson<T>(url: string, label: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "DoseRoutine/1.0 (barcode lookup)" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      console.error(`[barcode] ${label} lookup failed`, err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function baseProduct(code: string, category: ProductCategory): UniversalProduct {
  return {
    code,
    code_type: code.length === 8 ? "EAN-8" : code.length === 12 ? "UPC-A" : "EAN-13",
    category,
    name: "",
    brand: null,
    image_url: null,
    source: "cache",
    confidence: 0.6,
    serving: { size: null, grams: null, servings_per_container: null },
    nutrition_per_serving: { ...EMPTY_NUTRITION },
    ingredients: [],
    medication: null,
    gs1: null,
  };
}

/* ------------------------------- adapters -------------------------------- */

type OffResponse = {
  status?: number;
  product?: Record<string, unknown>;
};

async function fromOpenFoodFacts(code: string): Promise<UniversalProduct | null> {
  const json = await getJson<OffResponse>(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    "openfoodfacts",
  );
  const p = json?.product;
  if (!p || json?.status === 0) return null;

  const nutriments = (p["nutriments"] ?? {}) as Record<string, unknown>;
  const name =
    text(p["product_name_en"]) ?? text(p["product_name"]) ?? text(p["generic_name"]) ?? null;
  if (!name) return null;

  const per100 = {
    calories: num(nutriments["energy-kcal_100g"]),
    protein_g: num(nutriments["proteins_100g"]),
    carbs_g: num(nutriments["carbohydrates_100g"]),
    fat_g: num(nutriments["fat_100g"]),
    fiber_g: num(nutriments["fiber_100g"]),
  };
  const servingSize = text(p["serving_size"]);
  const servingGrams = num(p["serving_quantity"]);
  // Prefer the label's own per-serving column when Open Food Facts has it.
  const perServing = {
    calories: num(nutriments["energy-kcal_serving"]) ?? per100.calories,
    protein_g: num(nutriments["proteins_serving"]) ?? per100.protein_g,
    carbs_g: num(nutriments["carbohydrates_serving"]) ?? per100.carbs_g,
    fat_g: num(nutriments["fat_serving"]) ?? per100.fat_g,
    fiber_g: num(nutriments["fiber_serving"]) ?? per100.fiber_g,
  };

  const hasNutriments = Object.values(per100).some((v) => v != null);
  const product = baseProduct(code, categoryFromOffTags(p["categories_tags"], hasNutriments));
  return {
    ...product,
    name,
    brand: text(p["brands"]),
    image_url: text(p["image_front_url"]) ?? text(p["image_url"]),
    source: "openfoodfacts",
    confidence: hasNutriments ? 0.85 : 0.5,
    serving: {
      size: servingSize ?? (hasNutriments ? "100 g" : null),
      grams: servingGrams ?? (servingSize ? null : 100),
      servings_per_container: null,
    },
    nutrition_per_serving: servingSize || servingGrams ? perServing : per100,
  };
}

type DsldResponse = {
  hits?: { _source?: Record<string, unknown> }[];
};

function dsldIngredients(rows: unknown): ProductIngredient[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const quantity = Array.isArray(r["quantity"])
        ? ((r["quantity"] as Record<string, unknown>[])[0] ?? {})
        : {};
      const name = text(r["name"]) ?? text(r["ingredientName"]);
      if (!name) return null;
      const nested = Array.isArray(r["nestedRows"])
        ? (r["nestedRows"] as Record<string, unknown>[])
            .map((n) => text(n["name"]))
            .filter((n): n is string => Boolean(n))
        : [];
      const ing: ProductIngredient = {
        name,
        amount: num(quantity["quantity"]),
        unit: text(quantity["unit"]),
        percent_dv: num(quantity["dailyValueTargetGroup"]) ?? num(r["percentDV"]),
        form: text(r["forms"]) ?? text(r["form"]),
      };
      if (nested.length > 0) ing.blend = nested;
      return ing;
    })
    .filter((i): i is ProductIngredient => i != null);
}

async function fromDsld(code: string): Promise<UniversalProduct | null> {
  const json = await getJson<DsldResponse>(
    `https://api.ods.od.nih.gov/dsld/v9/search-filter?q=${encodeURIComponent(code)}&size=1`,
    "dsld",
  );
  const src = json?.hits?.[0]?._source;
  if (!src) return null;
  const name = text(src["fullName"]) ?? text(src["productName"]);
  if (!name) return null;

  const servingText = Array.isArray(src["servingSizes"])
    ? text(((src["servingSizes"] as Record<string, unknown>[])[0] ?? {})["unit"] as unknown)
    : null;
  const servingQty = Array.isArray(src["servingSizes"])
    ? num(((src["servingSizes"] as Record<string, unknown>[])[0] ?? {})["minQuantity"])
    : null;

  return {
    ...baseProduct(code, "supplement"),
    name,
    brand: text(src["brandName"]),
    image_url: (text(src["thumbnail"]) ?? text(src["pdf"]) === null) ? null : null,
    source: "dsld",
    confidence: 0.9,
    serving: {
      size:
        servingQty && servingText
          ? `${servingQty} ${servingText}`
          : (servingText ?? (servingQty ? String(servingQty) : null)),
      grams: null,
      servings_per_container: num(src["servingsPerContainer"]),
    },
    ingredients: dsldIngredients(src["ingredientRows"]),
  };
}

type OpenFdaResponse = {
  results?: Record<string, unknown>[];
};

async function fromOpenFda(code: string): Promise<UniversalProduct | null> {
  const ndc10 = ndcFromBarcode(code);
  if (!ndc10) return null;
  const codes = [...ndc11Candidates(ndc10), ...productNdcCandidates(ndc10)];
  if (codes.length === 0) return null;

  const packageQuery = ndc11Candidates(ndc10)
    .map((c) => `package_ndc:"${c}"`)
    .join("+OR+");
  const productQuery = productNdcCandidates(ndc10)
    .map((c) => `product_ndc:"${c}"`)
    .join("+OR+");
  const json = await getJson<OpenFdaResponse>(
    `https://api.fda.gov/drug/ndc.json?search=(${packageQuery})+OR+(${productQuery})&limit=1`,
    "openfda",
  );
  const r = json?.results?.[0];
  if (!r) return null;

  const actives = Array.isArray(r["active_ingredients"])
    ? (r["active_ingredients"] as Record<string, unknown>[]).map((a) => ({
        name: text(a["name"]) ?? "Active ingredient",
        strength: text(a["strength"]),
      }))
    : [];
  const brand = text(r["brand_name"]);
  const generic = text(r["generic_name"]);
  const name = brand ?? generic;
  if (!name) return null;

  return {
    ...baseProduct(code, "medication"),
    name,
    brand: text(r["labeler_name"]),
    source: "openfda",
    confidence: 0.95,
    medication: {
      ndc: text(r["product_ndc"]),
      generic_name: generic,
      brand_name: brand,
      active_ingredients: actives,
      dosage_form: text(r["dosage_form"]),
      route: Array.isArray(r["route"]) ? text((r["route"] as unknown[])[0]) : text(r["route"]),
      rx_or_otc: Array.isArray(r["product_type"])
        ? text((r["product_type"] as unknown[])[0])
        : text(r["product_type"]),
      labeler: text(r["labeler_name"]),
      directions: null,
    },
    ingredients: actives.map((a) => ({
      name: a.name,
      amount: null,
      unit: null,
      percent_dv: null,
      form: a.strength,
    })),
  };
}

type UpcItemDbResponse = {
  items?: Record<string, unknown>[];
};

async function fromUpcCatalog(code: string): Promise<UniversalProduct | null> {
  const json = await getJson<UpcItemDbResponse>(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
    "upcitemdb",
  );
  const item = json?.items?.[0];
  const name = item ? text(item["title"]) : null;
  if (!name) return null;
  const images = Array.isArray(item?.["images"]) ? (item?.["images"] as unknown[]) : [];
  return {
    ...baseProduct(code, "other"),
    name,
    brand: text(item?.["brand"]),
    image_url: text(images[0]),
    source: "upcitemdb",
    // A title with no facts panel: enough to name the product, not to log it.
    confidence: 0.4,
  };
}

/* --------------------------------- cache ---------------------------------- */

async function readCache(codes: string[]): Promise<UniversalProduct | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("barcode_cache")
      .select("code, payload")
      .in("code", codes)
      .limit(1);
    const payload = data?.[0]?.payload as UniversalProduct | undefined;
    if (payload && typeof payload === "object" && payload.name) {
      return { ...payload, source: payload.source ?? "cache" };
    }
  } catch (err) {
    console.error("[barcode] cache read failed", err);
  }
  return null;
}

async function writeCache(product: UniversalProduct): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("barcode_cache").upsert(
      {
        code: product.code,
        category: product.category,
        source: product.source,
        // gs1 lot/expiry/serial are per-package, never per-product: don't cache them.
        payload: { ...product, gs1: null } as unknown as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "code" },
    );
  } catch (err) {
    console.error("[barcode] cache write failed", err);
  }
}

/** One database's contribution to a single scan, for the admin dashboard. */
export type ApiAttempt = { api: string; ms: number; hit: boolean; error: boolean };

/** Time one adapter and classify the outcome without ever letting it throw. */
async function timedSource(
  api: string,
  run: () => Promise<UniversalProduct | null>,
): Promise<{ product: UniversalProduct | null; attempt: ApiAttempt }> {
  const started = Date.now();
  try {
    const product = await run();
    return {
      product,
      attempt: { api, ms: Date.now() - started, hit: product != null, error: false },
    };
  } catch {
    return { product: null, attempt: { api, ms: Date.now() - started, hit: false, error: true } };
  }
}

async function recordScan(input: {
  code: string;
  category: string | null;
  source: string | null;
  resolved: boolean;
  latencyMs: number;
  userId: string | null;
  scanSource: string | null;
  symbology: string | null;
  apiResults: ApiAttempt[];
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("barcode_scan_events").insert({
      code: input.code,
      category: input.category,
      source: input.source,
      resolved: input.resolved,
      latency_ms: Math.round(input.latencyMs),
      user_id: input.userId,
      scan_source: input.scanSource,
      symbology: input.symbology,
      api_results: input.apiResults as unknown as never,
    });
  } catch (err) {
    console.error("[barcode] scan telemetry failed", err);
  }
}

/** Apply the crowd's accepted corrections on top of a database answer. */
async function applyCorrections(product: UniversalProduct): Promise<UniversalProduct> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("barcode_corrections")
      .select("field, new_value, created_at")
      .eq("code", product.code)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data || data.length === 0) return product;
    const latest = new Map<string, string>();
    for (const row of data) {
      if (row.field && row.new_value != null && !latest.has(row.field)) {
        latest.set(row.field, row.new_value);
      }
    }
    const next = { ...product };
    const name = latest.get("name");
    if (name) next.name = name;
    const brand = latest.get("brand");
    if (brand) next.brand = brand;
    const category = latest.get("category");
    if (category === "food" || category === "supplement" || category === "medication") {
      next.category = category;
    }
    return next;
  } catch (err) {
    console.error("[barcode] corrections read failed", err);
    return product;
  }
}

/* --------------------------------- entry ---------------------------------- */

export type UniversalLookupInput = {
  raw: string;
  gs1?: Gs1Extras;
  userId?: string | null;
  /** How the code was captured: camera, native camera, photo or typed. */
  scanSource?: string | null;
  symbology?: string | null;
};

/**
 * Route one scanned code through every source at once and return the single
 * best normalized product, or an "unknown" result that asks for a label photo.
 */
export async function lookupUniversalBarcode(input: UniversalLookupInput): Promise<LookupResult> {
  const started = Date.now();
  const canonical = canonicalGtin(input.raw);
  if (!canonical) {
    return {
      status: "unknown",
      code: String(input.raw ?? ""),
      needs_label_photo: true,
      message: "That code didn't scan cleanly. Try again or take a photo of the label.",
    };
  }

  const variants = gtinVariants(canonical);
  const attempts: ApiAttempt[] = [];
  const cacheStarted = Date.now();
  const cached = await readCache(variants);
  attempts.push({
    api: "cache",
    ms: Date.now() - cacheStarted,
    hit: cached != null,
    error: false,
  });
  const finish = async (product: UniversalProduct): Promise<LookupResult> => {
    const withCorrections = await applyCorrections(product);
    const final: UniversalProduct = { ...withCorrections, gs1: input.gs1 ?? null };
    void recordScan({
      code: canonical,
      category: final.category,
      source: final.source,
      resolved: true,
      latencyMs: Date.now() - started,
      userId: input.userId ?? null,
      scanSource: input.scanSource ?? null,
      symbology: input.symbology ?? null,
      apiResults: attempts,
    });
    return { status: "found", product: final };
  };

  if (cached) return finish({ ...cached, code: canonical, source: "cache" });

  const timed = await Promise.all([
    timedSource("openfda", () => fromOpenFda(canonical)),
    timedSource("dsld", () => fromDsld(canonical)),
    timedSource("openfoodfacts", () => fromOpenFoodFacts(canonical)),
    timedSource("upcitemdb", () => fromUpcCatalog(canonical)),
  ]);
  for (const t of timed) attempts.push(t.attempt);
  const [fda, dsld, off, catalog] = timed.map((t) => t.product);

  const best = pickBestProduct([fda, dsld, off, catalog]);
  if (!best) {
    void recordScan({
      code: canonical,
      category: null,
      source: null,
      resolved: false,
      latencyMs: Date.now() - started,
      userId: input.userId ?? null,
      scanSource: input.scanSource ?? null,
      symbology: input.symbology ?? null,
      apiResults: attempts,
    });
    return {
      status: "unknown",
      code: canonical,
      needs_label_photo: true,
      message: "We don't know this product yet — snap the label and we'll read it.",
    };
  }

  // A supplement from DSLD still benefits from Open Food Facts' macros/photo.
  const enriched = [off, catalog, dsld].reduce<UniversalProduct>(
    (acc, extra) => (extra && extra !== acc ? mergeProducts(acc, extra) : acc),
    best,
  );

  await writeCache(enriched);
  return finish(enriched);
}
