import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminFoodRow = {
  id: string;
  name: string;
  brand: string | null;
  source: string;
  externalId: string | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  defaultPortionG: number;
  qualityScore: number;
  verified: boolean;
  timesLogged: number;
  updatedAt: string;
};

export type AdminPortionRow = {
  id: string;
  label: string;
  grams: number;
  isDefault: boolean;
  referenceHint: string | null;
  sortOrder: number;
};

export type AdminAliasRow = { id: string; alias: string };

export type AdminAuditEntry = {
  id: string;
  action: string;
  targetTable: string;
  label: string | null;
  actorEmail: string | null;
  createdAt: string;
  revertedAt: string | null;
};

export type AdminUsdaResult = {
  fdcId: string;
  name: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  defaultPortionG: number;
  dataType: string;
  alreadyImported: boolean;
  duplicateOf?: { id: string; name: string; verdict: "exact" | "strong" | "probable" } | null;
};

export type AdminDuplicateCandidate = {
  id: string;
  name: string;
  brand: string | null;
  source: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  timesLogged: number;
  verified: boolean;
  verdict: "exact" | "strong" | "probable";
  reason: string;
  score: number;
};

export type AdminIncomingFood = {
  fdcId: string;
  name: string;
  brand: string | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
};

export type AdminDuplicateCheck = {
  incoming: AdminIncomingFood;
  candidates: AdminDuplicateCandidate[];
};

export type AdminImportResult =
  | { status: "imported"; id: string; name: string; updated: boolean }
  | { status: "duplicate"; incoming: AdminIncomingFood; candidates: AdminDuplicateCandidate[] };

export type AdminDuplicateSide = {
  id: string;
  name: string;
  brand: string | null;
  source: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  timesLogged: number;
  verified: boolean;
};

export type AdminDuplicatePair = {
  keep: AdminDuplicateSide;
  duplicate: AdminDuplicateSide;
  verdict: "exact" | "strong" | "probable";
  reason: string;
};

const text = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);
const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

type AdminContext = { supabase: { rpc: (fn: "is_admin") => PromiseLike<{ data: unknown }> } };

async function assertAdmin(context: unknown) {
  const { data } = await (context as AdminContext).supabase.rpc("is_admin");
  if (!data) throw new Error("Forbidden");
}

function actorEmail(claims: unknown): string | null {
  const email = (claims as { email?: string } | null)?.email;
  return email ? String(email) : null;
}

/* ------------------------------- catalog -------------------------------- */

export const adminListFoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string; source?: string; verified?: string }) => ({
    query: text(input?.query, 80),
    source: text(input?.source, 20),
    verified: text(input?.verified, 10),
  }))
  .handler(async ({ data, context }): Promise<AdminFoodRow[]> => {
    await assertAdmin(context);
    const { adminClient, normalize } = await import("@/lib/food-admin.server");
    const admin = await adminClient();

    let query = admin
      .from("foods")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (data.query) query = query.ilike("name_norm", `%${normalize(data.query)}%`);
    if (data.source) query = query.eq("source", data.source);
    if (data.verified === "yes") query = query.eq("verified", true);
    if (data.verified === "no") query = query.eq("verified", false);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      source: row.source,
      externalId: row.external_id,
      kcal100: Number(row.kcal_100g) || 0,
      protein100: Number(row.protein_100g) || 0,
      carbs100: Number(row.carbs_100g) || 0,
      fat100: Number(row.fat_100g) || 0,
      defaultPortionG: Number(row.default_portion_g) || 100,
      qualityScore: Number(row.quality_score) || 0,
      verified: Boolean(row.verified),
      timesLogged: Number(row.times_logged) || 0,
      updatedAt: row.updated_at,
    }));
  });

export const adminFoodDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { foodId: string }) => ({ foodId: text(input?.foodId, 40) }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ portions: AdminPortionRow[]; aliases: AdminAliasRow[] }> => {
      await assertAdmin(context);
      const { adminClient } = await import("@/lib/food-admin.server");
      const admin = await adminClient();
      const [portions, aliases] = await Promise.all([
        admin
          .from("food_portions")
          .select("*")
          .eq("food_id", data.foodId)
          .order("sort_order", { ascending: true }),
        admin.from("food_aliases").select("id, alias").eq("food_id", data.foodId),
      ]);
      return {
        portions: (portions.data ?? []).map((row) => ({
          id: row.id,
          label: row.label,
          grams: Number(row.grams) || 0,
          isDefault: Boolean(row.is_default),
          referenceHint: row.reference_hint,
          sortOrder: Number(row.sort_order) || 0,
        })),
        aliases: (aliases.data ?? []).map((row) => ({ id: row.id, alias: row.alias })),
      };
    },
  );

export const adminSaveFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      brand?: string | null;
      source?: string;
      kcal100: number;
      protein100: number;
      carbs100: number;
      fat100: number;
      defaultPortionG: number;
      qualityScore: number;
      verified: boolean;
    }) => ({
      id: input?.id ? text(input.id, 40) : null,
      name: text(input?.name, 120),
      brand: input?.brand ? text(input.brand, 80) : null,
      source: text(input?.source, 20) || "curated",
      kcal100: num(input?.kcal100),
      protein100: num(input?.protein100),
      carbs100: num(input?.carbs100),
      fat100: num(input?.fat100),
      defaultPortionG: num(input?.defaultPortionG, 100) || 100,
      qualityScore: Math.min(100, Math.round(num(input?.qualityScore, 50))),
      verified: Boolean(input?.verified),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.name) throw new Error("A food needs a name.");
    const { adminClient, writeAudit, normalize } = await import("@/lib/food-admin.server");
    const admin = await adminClient();

    const payload = {
      name: data.name,
      name_norm: normalize(data.name),
      brand: data.brand,
      source: data.source,
      kcal_100g: data.kcal100,
      protein_100g: data.protein100,
      carbs_100g: data.carbs100,
      fat_100g: data.fat100,
      default_portion_g: data.defaultPortionG,
      quality_score: data.qualityScore,
      verified: data.verified,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: before } = await admin
        .from("foods")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      const { data: after, error } = await admin
        .from("foods")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      await writeAudit(admin, {
        actorId: context.userId,
        actorEmail: actorEmail(context.claims),
        action: "food.update",
        targetTable: "foods",
        targetId: data.id,
        foodId: data.id,
        label: data.name,
        before,
        after,
      });
      return { id: data.id };
    }

    const { data: created, error } = await admin
      .from("foods")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: "food.create",
      targetTable: "foods",
      targetId: created?.id ?? null,
      foodId: created?.id ?? null,
      label: data.name,
      before: null,
      after: created,
    });
    return { id: created?.id ?? null };
  });

export const adminDeleteFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { foodId: string }) => ({ foodId: text(input?.foodId, 40) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { adminClient, writeAudit, foodSnapshot } = await import("@/lib/food-admin.server");
    const admin = await adminClient();
    const snapshot = await foodSnapshot(admin, data.foodId);
    if (!snapshot) throw new Error("That food no longer exists.");

    await admin.from("food_portions").delete().eq("food_id", data.foodId);
    await admin.from("food_aliases").delete().eq("food_id", data.foodId);
    const { error } = await admin.from("foods").delete().eq("id", data.foodId);
    if (error) throw new Error(error.message);

    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: "food.delete",
      targetTable: "foods",
      targetId: data.foodId,
      foodId: data.foodId,
      label: snapshot.food.name,
      before: snapshot,
      after: null,
    });
    return { ok: true };
  });

/* ------------------------------- portions -------------------------------- */

export const adminSavePortion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      foodId: string;
      label: string;
      grams: number;
      isDefault?: boolean;
      referenceHint?: string | null;
      sortOrder?: number;
    }) => ({
      id: input?.id ? text(input.id, 40) : null,
      foodId: text(input?.foodId, 40),
      label: text(input?.label, 60),
      grams: num(input?.grams),
      isDefault: Boolean(input?.isDefault),
      referenceHint: input?.referenceHint ? text(input.referenceHint, 80) : null,
      sortOrder: Math.min(999, Math.round(num(input?.sortOrder))),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.foodId || !data.label) throw new Error("A portion needs a food and a label.");
    if (data.grams <= 0) throw new Error("Grams must be greater than zero.");
    const { adminClient, writeAudit } = await import("@/lib/food-admin.server");
    const admin = await adminClient();

    if (data.isDefault) {
      await admin.from("food_portions").update({ is_default: false }).eq("food_id", data.foodId);
    }

    const payload = {
      food_id: data.foodId,
      label: data.label,
      grams: data.grams,
      is_default: data.isDefault,
      reference_hint: data.referenceHint,
      sort_order: data.sortOrder,
    };

    if (data.id) {
      const { data: before } = await admin
        .from("food_portions")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      const { data: after, error } = await admin
        .from("food_portions")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      await writeAudit(admin, {
        actorId: context.userId,
        actorEmail: actorEmail(context.claims),
        action: "portion.update",
        targetTable: "food_portions",
        targetId: data.id,
        foodId: data.foodId,
        label: `${data.label} · ${data.grams} g`,
        before,
        after,
      });
      return { id: data.id };
    }

    const { data: created, error } = await admin
      .from("food_portions")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: "portion.create",
      targetTable: "food_portions",
      targetId: created?.id ?? null,
      foodId: data.foodId,
      label: `${data.label} · ${data.grams} g`,
      before: null,
      after: created,
    });
    return { id: created?.id ?? null };
  });

export const adminDeletePortion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: text(input?.id, 40) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { adminClient, writeAudit } = await import("@/lib/food-admin.server");
    const admin = await adminClient();
    const { data: before } = await admin
      .from("food_portions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("That portion no longer exists.");
    const { error } = await admin.from("food_portions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: "portion.delete",
      targetTable: "food_portions",
      targetId: data.id,
      foodId: before.food_id,
      label: `${before.label} · ${before.grams} g`,
      before,
      after: null,
    });
    return { ok: true };
  });

/* -------------------------------- aliases -------------------------------- */

export const adminSaveAlias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { foodId: string; alias: string }) => ({
    foodId: text(input?.foodId, 40),
    alias: text(input?.alias, 120),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.foodId || !data.alias) throw new Error("An alias needs a food and a name.");
    const { adminClient, writeAudit, normalize } = await import("@/lib/food-admin.server");
    const admin = await adminClient();
    const { data: created, error } = await admin
      .from("food_aliases")
      .insert({ food_id: data.foodId, alias: data.alias, alias_norm: normalize(data.alias) })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: "alias.create",
      targetTable: "food_aliases",
      targetId: created?.id ?? null,
      foodId: data.foodId,
      label: data.alias,
      before: null,
      after: created,
    });
    return { id: created?.id ?? null };
  });

export const adminDeleteAlias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: text(input?.id, 40) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { adminClient, writeAudit } = await import("@/lib/food-admin.server");
    const admin = await adminClient();
    const { data: before } = await admin
      .from("food_aliases")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("That alias no longer exists.");
    const { error } = await admin.from("food_aliases").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: "alias.delete",
      targetTable: "food_aliases",
      targetId: data.id,
      foodId: before.food_id,
      label: before.alias,
      before,
      after: null,
    });
    return { ok: true };
  });

/* ---------------------------------- USDA --------------------------------- */

export const adminUsdaSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: text(input?.query, 80) }))
  .handler(async ({ data, context }): Promise<AdminUsdaResult[]> => {
    await assertAdmin(context);
    if (data.query.length < 2) return [];
    const { searchUsdaFoods } = await import("@/lib/usda.server");
    const { adminClient, findDuplicateCandidates } = await import("@/lib/food-admin.server");
    const results = await searchUsdaFoods(data.query, 10);
    if (results.length === 0) return [];
    const admin = await adminClient();
    const { data: existing } = await admin
      .from("foods")
      .select("external_id")
      .eq("source", "usda")
      .in(
        "external_id",
        results.map((r) => r.fdcId),
      );
    const imported = new Set((existing ?? []).map((row) => String(row.external_id)));

    const withDupes = await Promise.all(
      results.map(async (r) => {
        if (imported.has(r.fdcId)) {
          return { ...r, alreadyImported: true, duplicateOf: null };
        }
        const [candidate] = await findDuplicateCandidates(admin, {
          name: r.name,
          kcal100: r.kcal100,
          protein100: r.protein100,
          carbs100: r.carbs100,
          fat100: r.fat100,
        }).catch(() => []);
        return {
          ...r,
          alreadyImported: false,
          duplicateOf: candidate
            ? { id: candidate.id, name: candidate.name, verdict: candidate.verdict }
            : null,
        };
      }),
    );
    return withDupes;
  });

/** Duplicate check for a USDA record before it is imported. */
export const adminCheckUsdaDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fdcId: string }) => ({ fdcId: text(input?.fdcId, 20) }))
  .handler(async ({ data, context }): Promise<AdminDuplicateCheck> => {
    await assertAdmin(context);
    const { getUsdaFoodById } = await import("@/lib/usda.server");
    const { adminClient, findDuplicateCandidates } = await import("@/lib/food-admin.server");
    const food = await getUsdaFoodById(data.fdcId);
    if (!food) throw new Error("USDA had no usable macros for that entry.");
    const admin = await adminClient();
    const candidates = await findDuplicateCandidates(admin, {
      name: food.name,
      brand: food.brand,
      gtin: food.gtin,
      kcal100: food.kcal100,
      protein100: food.protein100,
      carbs100: food.carbs100,
      fat100: food.fat100,
    });
    return {
      incoming: {
        fdcId: data.fdcId,
        name: food.name,
        brand: food.brand ?? null,
        kcal100: food.kcal100,
        protein100: food.protein100,
        carbs100: food.carbs100,
        fat100: food.fat100,
      },
      candidates,
    };
  });

export const adminImportUsdaFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fdcId: string; force?: boolean }) => ({
    fdcId: text(input?.fdcId, 20),
    force: Boolean(input?.force),
  }))
  .handler(async ({ data, context }): Promise<AdminImportResult> => {
    await assertAdmin(context);
    const { getUsdaFoodById } = await import("@/lib/usda.server");
    const { adminClient, writeAudit, findDuplicateCandidates } =
      await import("@/lib/food-admin.server");
    const { cacheUsdaFood } = await import("@/lib/food-db.server");

    const admin = await adminClient();
    const { data: before } = await admin
      .from("foods")
      .select("*")
      .eq("source", "usda")
      .eq("external_id", data.fdcId)
      .maybeSingle();

    const food = await getUsdaFoodById(data.fdcId);
    if (!food) throw new Error("USDA had no usable macros for that entry.");

    // Re-importing the exact same USDA record updates in place, so only a
    // genuinely new row can create a redundant food.
    if (!before && !data.force) {
      const candidates = await findDuplicateCandidates(admin, {
        name: food.name,
        brand: food.brand,
        gtin: food.gtin,
        kcal100: food.kcal100,
        protein100: food.protein100,
        carbs100: food.carbs100,
        fat100: food.fat100,
      });
      if (candidates.length > 0) {
        return {
          status: "duplicate",
          incoming: {
            fdcId: data.fdcId,
            name: food.name,
            brand: food.brand ?? null,
            kcal100: food.kcal100,
            protein100: food.protein100,
            carbs100: food.carbs100,
            fat100: food.fat100,
          },
          candidates,
        };
      }
    }

    const record = await cacheUsdaFood(food);
    if (!record) throw new Error("Import failed — the catalog rejected that entry.");

    const { data: after } = await admin.from("foods").select("*").eq("id", record.id).maybeSingle();
    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: before ? "food.update" : "food.import_usda",
      targetTable: "foods",
      targetId: record.id,
      foodId: record.id,
      label: `${record.name} (USDA ${data.fdcId})`,
      before: before ?? null,
      after,
    });
    return {
      status: "imported",
      id: record.id,
      name: record.name,
      updated: Boolean(before),
    };
  });

/**
 * Import a USDA record straight into an existing food: the existing row keeps
 * its id (so logged meals and stats survive) and takes USDA's numbers.
 */
export const adminMergeUsdaIntoFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fdcId: string; keepId: string }) => ({
    fdcId: text(input?.fdcId, 20),
    keepId: text(input?.keepId, 40),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getUsdaFoodById } = await import("@/lib/usda.server");
    const { adminClient, writeAudit, mergeFoods } = await import("@/lib/food-admin.server");
    const { cacheUsdaFood } = await import("@/lib/food-db.server");

    const admin = await adminClient();
    const food = await getUsdaFoodById(data.fdcId);
    if (!food) throw new Error("USDA had no usable macros for that entry.");
    const record = await cacheUsdaFood(food);
    if (!record) throw new Error("Import failed — the catalog rejected that entry.");
    if (record.id === data.keepId) {
      return { ok: true as const, id: record.id, name: record.name };
    }

    const merged = await mergeFoods(admin, {
      keepId: data.keepId,
      mergeId: record.id,
      applyNutrition: true,
    });
    if (!merged.ok) throw new Error(merged.reason);

    const { data: after } = await admin
      .from("foods")
      .select("*")
      .eq("id", data.keepId)
      .maybeSingle();
    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: "food.merge",
      targetTable: "foods",
      targetId: data.keepId,
      foodId: data.keepId,
      label: `${merged.keepName} ← USDA ${data.fdcId} (${record.name})`,
      before: merged.snapshot,
      after,
    });
    return { ok: true as const, id: data.keepId, name: merged.keepName };
  });

/** Merge two catalog rows that describe the same food. */
export const adminMergeFoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keepId: string; mergeId: string; applyNutrition?: boolean }) => ({
    keepId: text(input?.keepId, 40),
    mergeId: text(input?.mergeId, 40),
    applyNutrition: Boolean(input?.applyNutrition),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { adminClient, writeAudit, mergeFoods } = await import("@/lib/food-admin.server");
    const admin = await adminClient();
    const merged = await mergeFoods(admin, {
      keepId: data.keepId,
      mergeId: data.mergeId,
      applyNutrition: data.applyNutrition,
    });
    if (!merged.ok) throw new Error(merged.reason);
    const { data: after } = await admin
      .from("foods")
      .select("*")
      .eq("id", data.keepId)
      .maybeSingle();
    await writeAudit(admin, {
      actorId: context.userId,
      actorEmail: actorEmail(context.claims),
      action: "food.merge",
      targetTable: "foods",
      targetId: data.keepId,
      foodId: data.keepId,
      label: `${merged.keepName} ← ${String((merged.snapshot.loser.food as { name?: string }).name ?? "duplicate")}`,
      before: merged.snapshot,
      after,
    });
    return { ok: true as const, keepName: merged.keepName };
  });

/** Duplicate clusters that already exist in the catalog. */
export const adminListDuplicateClusters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDuplicatePair[]> => {
    await assertAdmin(context);
    const { adminClient } = await import("@/lib/food-admin.server");
    const { findDuplicatePairs } = await import("@/lib/food-dedupe");
    const admin = await adminClient();
    const { data: rows } = await admin
      .from("foods")
      .select(
        "id, name, name_norm, brand, gtin, source, kcal_100g, protein_100g, carbs_100g, fat_100g, times_logged, verified",
      )
      .order("name_norm", { ascending: true })
      .limit(600);

    const foods = (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      nameNorm: row.name_norm,
      brand: row.brand,
      gtin: row.gtin,
      source: row.source,
      kcal100: Number(row.kcal_100g) || 0,
      protein100: Number(row.protein_100g) || 0,
      carbs100: Number(row.carbs_100g) || 0,
      fat100: Number(row.fat_100g) || 0,
      timesLogged: Number(row.times_logged) || 0,
      verified: Boolean(row.verified),
    }));

    return findDuplicatePairs(foods)
      .slice(0, 40)
      .map(({ a, b, match }) => {
        // Keep the more-used, then more-verified row by default.
        const [keep, dupe] =
          b.timesLogged > a.timesLogged || (b.verified && !a.verified) ? [b, a] : [a, b];
        return {
          keep: {
            id: keep.id,
            name: keep.name,
            brand: keep.brand,
            source: keep.source,
            kcal100: keep.kcal100,
            protein100: keep.protein100,
            carbs100: keep.carbs100,
            fat100: keep.fat100,
            timesLogged: keep.timesLogged,
            verified: keep.verified,
          },
          duplicate: {
            id: dupe.id,
            name: dupe.name,
            brand: dupe.brand,
            source: dupe.source,
            kcal100: dupe.kcal100,
            protein100: dupe.protein100,
            carbs100: dupe.carbs100,
            fat100: dupe.fat100,
            timesLogged: dupe.timesLogged,
            verified: dupe.verified,
          },
          verdict: match.verdict as "exact" | "strong" | "probable",
          reason: match.reason,
        };
      });
  });

/**
 * Pre-seed the catalog with everyday foods so common scans never depend on the
 * USDA API being up. Runs in batches so a click can't hit the request timeout.
 */
export const adminSeedCommonFoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { offset?: number; batch?: number }) => ({
    offset: Math.max(0, Math.floor(Number(input?.offset) || 0)),
    batch: Math.min(Math.max(Math.floor(Number(input?.batch) || 20), 1), 40),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { COMMON_FOOD_SEEDS } = await import("@/lib/food-seed-list");
    const { findFoodByName, lookupUsdaAndCache, searchFoodCatalog } =
      await import("@/lib/food-db.server");
    const { bestDuplicate } = await import("@/lib/food-dedupe");

    const slice = COMMON_FOOD_SEEDS.slice(data.offset, data.offset + data.batch);
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    let missed = 0;
    for (const name of slice) {
      const existing = await findFoodByName(name).catch(() => null);
      if (existing) {
        skipped += 1;
        continue;
      }
      // Near-match already in the catalog under a different name: don't add a
      // second row for it.
      const nearby = await searchFoodCatalog(name, 5).catch(() => []);
      const dupe = bestDuplicate(
        { name, kcal100: 0, protein100: 0, carbs100: 0, fat100: 0 },
        nearby.map((f) => ({
          id: f.id,
          name: f.name,
          brand: f.brand,
          kcal100: f.kcal100,
          protein100: f.protein100,
          carbs100: f.carbs100,
          fat100: f.fat100,
        })),
      );
      if (dupe && (dupe.match.verdict === "exact" || dupe.match.verdict === "strong")) {
        duplicates += 1;
        continue;
      }
      const record = await lookupUsdaAndCache(name).catch(() => null);
      if (record) imported += 1;
      else missed += 1;
    }
    const nextOffset = data.offset + slice.length;
    return {
      imported,
      skipped,
      duplicates,
      missed,
      nextOffset,
      total: COMMON_FOOD_SEEDS.length,
      done: nextOffset >= COMMON_FOOD_SEEDS.length,
    };
  });

/* -------------------------------- history -------------------------------- */

export const adminFoodAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAuditEntry[]> => {
    await assertAdmin(context);
    const { adminClient } = await import("@/lib/food-admin.server");
    const admin = await adminClient();
    const { data, error } = await admin
      .from("food_admin_audit")
      .select("id, action, target_table, label, actor_email, created_at, reverted_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      targetTable: row.target_table,
      label: row.label,
      actorEmail: row.actor_email,
      createdAt: row.created_at,
      revertedAt: row.reverted_at,
    }));
  });

export const adminRevertFoodChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { auditId: string }) => ({ auditId: text(input?.auditId, 40) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { adminClient, revertAudit } = await import("@/lib/food-admin.server");
    const admin = await adminClient();
    const result = await revertAudit(admin, data.auditId, context.userId);
    if (!result.ok) throw new Error(result.reason);
    return { ok: true };
  });
