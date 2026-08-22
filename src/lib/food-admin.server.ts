/**
 * Food catalog administration (server-only).
 *
 * Every write goes through `writeAudit`, which stores the full row before and
 * after the change. `revertAudit` replays that snapshot backwards, so a
 * mistaken edit, delete or USDA import can be undone in one click.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeFoodName } from "@/lib/food-db.server";

type Admin = SupabaseClient<Database>;

export type AuditAction =
  | "food.create"
  | "food.update"
  | "food.delete"
  | "food.import_usda"
  | "food.merge"
  | "portion.create"
  | "portion.update"
  | "portion.delete"
  | "alias.create"
  | "alias.delete";

export type AuditRow = {
  id: string;
  action: AuditAction;
  targetTable: string;
  targetId: string | null;
  foodId: string | null;
  label: string | null;
  actorEmail: string | null;
  createdAt: string;
  revertedAt: string | null;
  canRevert: boolean;
};

export async function adminClient(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

export async function writeAudit(
  admin: Admin,
  entry: {
    actorId: string;
    actorEmail: string | null;
    action: AuditAction;
    targetTable: "foods" | "food_portions" | "food_aliases";
    targetId: string | null;
    foodId: string | null;
    label: string | null;
    before: unknown;
    after: unknown;
  },
): Promise<void> {
  await admin.from("food_admin_audit").insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    target_table: entry.targetTable,
    target_id: entry.targetId,
    food_id: entry.foodId,
    label: entry.label,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
  });
}

/** Full snapshot of a food plus its portions and aliases, used for delete/undo. */
export async function foodSnapshot(admin: Admin, foodId: string) {
  const [food, portions, aliases] = await Promise.all([
    admin.from("foods").select("*").eq("id", foodId).maybeSingle(),
    admin.from("food_portions").select("*").eq("food_id", foodId),
    admin.from("food_aliases").select("*").eq("food_id", foodId),
  ]);
  if (!food.data) return null;
  return {
    food: food.data,
    portions: portions.data ?? [],
    aliases: aliases.data ?? [],
  };
}

export function normalize(name: string): string {
  return normalizeFoodName(name);
}

/* ----------------------------- duplicates -------------------------------- */

type FoodRowLoose = Record<string, unknown> & { id: string; name: string };

function toDedupe(row: FoodRowLoose, aliases: string[] = []) {
  return {
    id: row.id,
    name: String(row.name ?? ""),
    nameNorm: (row["name_norm"] as string | null) ?? null,
    brand: (row["brand"] as string | null) ?? null,
    gtin: (row["gtin"] as string | null) ?? null,
    kcal100: Number(row["kcal_100g"]) || 0,
    protein100: Number(row["protein_100g"]) || 0,
    carbs100: Number(row["carbs_100g"]) || 0,
    fat100: Number(row["fat_100g"]) || 0,
    aliases,
  };
}

export type DuplicateCandidate = {
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

/**
 * Look for catalog rows that already describe the same food as `incoming`.
 * Narrows the search in SQL (name, leading token, barcode, alias) and then
 * scores the shortlist with the pure rules in `food-dedupe`.
 */
export async function findDuplicateCandidates(
  admin: Admin,
  incoming: {
    id?: string | null;
    name: string;
    brand?: string | null;
    gtin?: string | null;
    kcal100: number;
    protein100: number;
    carbs100: number;
    fat100: number;
  },
): Promise<DuplicateCandidate[]> {
  const { classifyDuplicate, normalizeTokens } = await import("@/lib/food-dedupe");
  const norm = normalize(incoming.name);
  if (!norm) return [];
  const tokens = normalizeTokens(incoming.name).slice(0, 2);

  const queries: PromiseLike<{ data: FoodRowLoose[] | null }>[] = [
    admin.from("foods").select("*").eq("name_norm", norm).limit(5) as never,
  ];
  for (const token of tokens) {
    queries.push(
      admin.from("foods").select("*").ilike("name_norm", `%${token}%`).limit(25) as never,
    );
  }
  const gtin = String(incoming.gtin ?? "").replace(/\D/g, "");
  if (gtin.length >= 8) {
    queries.push(admin.from("foods").select("*").eq("gtin", gtin).limit(5) as never);
  }

  const results = await Promise.all(queries);
  const byId = new Map<string, FoodRowLoose>();
  for (const result of results) {
    for (const row of result.data ?? []) {
      if (incoming.id && row.id === incoming.id) continue;
      byId.set(row.id, row);
    }
  }
  if (byId.size === 0) return [];

  const ids = Array.from(byId.keys());
  const { data: aliasRows } = await admin
    .from("food_aliases")
    .select("food_id, alias")
    .in("food_id", ids);
  const aliasMap = new Map<string, string[]>();
  for (const row of aliasRows ?? []) {
    const list = aliasMap.get(row.food_id) ?? [];
    list.push(row.alias);
    aliasMap.set(row.food_id, list);
  }

  const candidates: DuplicateCandidate[] = [];
  for (const row of byId.values()) {
    const match = classifyDuplicate(
      {
        name: incoming.name,
        brand: incoming.brand ?? null,
        gtin: incoming.gtin ?? null,
        kcal100: incoming.kcal100,
        protein100: incoming.protein100,
        carbs100: incoming.carbs100,
        fat100: incoming.fat100,
      },
      toDedupe(row, aliasMap.get(row.id) ?? []),
    );
    if (match.verdict === "none") continue;
    candidates.push({
      id: row.id,
      name: String(row.name ?? ""),
      brand: (row["brand"] as string | null) ?? null,
      source: String(row["source"] ?? ""),
      kcal100: Number(row["kcal_100g"]) || 0,
      protein100: Number(row["protein_100g"]) || 0,
      carbs100: Number(row["carbs_100g"]) || 0,
      fat100: Number(row["fat_100g"]) || 0,
      timesLogged: Number(row["times_logged"]) || 0,
      verified: Boolean(row["verified"]),
      verdict: match.verdict,
      reason: match.reason,
      score: match.score,
    });
  }
  const rank = { exact: 3, strong: 2, probable: 1 } as const;
  return candidates
    .sort((a, b) => rank[b.verdict] - rank[a.verdict] || b.score - a.score)
    .slice(0, 5);
}

export type MergeSnapshot = {
  keepBefore: Record<string, unknown> | null;
  loser: {
    food: Record<string, unknown>;
    portions: Record<string, unknown>[];
    aliases: Record<string, unknown>[];
  };
  movedPortionIds: string[];
  movedAliasIds: string[];
  deletedPortionIds: string[];
  deletedAliasIds: string[];
  addedAliasIds: string[];
};

/**
 * Fold `mergeId` into `keepId`: portions and aliases move over (skipping ones
 * the winner already has), the losing name becomes an alias, and the losing
 * row is deleted. The full snapshot goes into the audit log so the merge can
 * be undone in one click.
 */
export async function mergeFoods(
  admin: Admin,
  input: { keepId: string; mergeId: string; applyNutrition: boolean },
): Promise<
  { ok: true; snapshot: MergeSnapshot; keepName: string } | { ok: false; reason: string }
> {
  if (input.keepId === input.mergeId) return { ok: false, reason: "Pick two different foods." };

  const keepSnap = await foodSnapshot(admin, input.keepId);
  const loserSnap = await foodSnapshot(admin, input.mergeId);
  if (!keepSnap) return { ok: false, reason: "The food to keep no longer exists." };
  if (!loserSnap) return { ok: false, reason: "The duplicate no longer exists." };

  const keepRow = keepSnap.food as Record<string, unknown>;
  const loserRow = loserSnap.food as Record<string, unknown>;

  const snapshot: MergeSnapshot = {
    keepBefore: keepRow,
    loser: {
      food: loserRow,
      portions: loserSnap.portions as Record<string, unknown>[],
      aliases: loserSnap.aliases as Record<string, unknown>[],
    },
    movedPortionIds: [],
    movedAliasIds: [],
    deletedPortionIds: [],
    deletedAliasIds: [],
    addedAliasIds: [],
  };

  // Portions: keep one row per label.
  const keepLabels = new Set(
    (keepSnap.portions as Record<string, unknown>[]).map((p) =>
      String(p["label"] ?? "").toLowerCase(),
    ),
  );
  for (const portion of snapshot.loser.portions) {
    const id = String(portion["id"]);
    const label = String(portion["label"] ?? "").toLowerCase();
    if (keepLabels.has(label)) {
      await admin.from("food_portions").delete().eq("id", id);
      snapshot.deletedPortionIds.push(id);
    } else {
      keepLabels.add(label);
      await admin
        .from("food_portions")
        .update({ food_id: input.keepId, is_default: false } as never)
        .eq("id", id);
      snapshot.movedPortionIds.push(id);
    }
  }

  // Aliases: move the ones the winner doesn't have yet.
  const keepAliases = new Set(
    (keepSnap.aliases as Record<string, unknown>[]).map((a) => normalize(String(a["alias"] ?? ""))),
  );
  for (const alias of snapshot.loser.aliases) {
    const id = String(alias["id"]);
    const aliasNorm = normalize(String(alias["alias"] ?? ""));
    if (!aliasNorm || keepAliases.has(aliasNorm)) {
      await admin.from("food_aliases").delete().eq("id", id);
      snapshot.deletedAliasIds.push(id);
    } else {
      keepAliases.add(aliasNorm);
      await admin
        .from("food_aliases")
        .update({ food_id: input.keepId } as never)
        .eq("id", id);
      snapshot.movedAliasIds.push(id);
    }
  }

  // The losing name itself becomes a searchable alias of the winner.
  const loserName = String(loserRow["name"] ?? "");
  const loserNorm = normalize(loserName);
  if (
    loserNorm &&
    loserNorm !== normalize(String(keepRow["name"] ?? "")) &&
    !keepAliases.has(loserNorm)
  ) {
    const { data: inserted } = await admin
      .from("food_aliases")
      .insert({ food_id: input.keepId, alias: loserName, alias_norm: loserNorm } as never)
      .select("id");
    for (const row of inserted ?? []) snapshot.addedAliasIds.push(String(row.id));
  }

  await admin.from("foods").delete().eq("id", input.mergeId);

  const patch: Record<string, unknown> = {
    times_logged: (Number(keepRow["times_logged"]) || 0) + (Number(loserRow["times_logged"]) || 0),
    updated_at: new Date().toISOString(),
  };
  if (input.applyNutrition) {
    for (const column of [
      "kcal_100g",
      "protein_100g",
      "carbs_100g",
      "fat_100g",
      "fiber_100g",
      "sugar_100g",
      "sodium_100mg",
      "satfat_100g",
      "default_portion_g",
      "quality_score",
    ]) {
      if (loserRow[column] !== null && loserRow[column] !== undefined)
        patch[column] = loserRow[column];
    }
    if (!keepRow["gtin"] && loserRow["gtin"]) patch["gtin"] = loserRow["gtin"];
    if (!keepRow["external_id"] && loserRow["external_id"]) {
      patch["source"] = loserRow["source"];
      patch["external_id"] = loserRow["external_id"];
    }
    patch["verified"] = Boolean(keepRow["verified"]) || Boolean(loserRow["verified"]);
  }
  await admin
    .from("foods")
    .update(patch as never)
    .eq("id", input.keepId);

  return { ok: true, snapshot, keepName: String(keepRow["name"] ?? "") };
}

async function revertMerge(
  admin: Admin,
  snapshot: MergeSnapshot,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Remove the alias the merge created.
  if (snapshot.addedAliasIds.length) {
    await admin.from("food_aliases").delete().in("id", snapshot.addedAliasIds);
  }
  // Rows that moved to the winner go back with the losing food.
  if (snapshot.movedPortionIds.length) {
    await admin.from("food_portions").delete().in("id", snapshot.movedPortionIds);
  }
  if (snapshot.movedAliasIds.length) {
    await admin.from("food_aliases").delete().in("id", snapshot.movedAliasIds);
  }
  const restore = await admin.from("foods").insert(snapshot.loser.food as never);
  if (restore.error) return { ok: false, reason: restore.error.message };
  if (snapshot.loser.portions.length) {
    await admin.from("food_portions").insert(snapshot.loser.portions as never);
  }
  if (snapshot.loser.aliases.length) {
    await admin.from("food_aliases").insert(snapshot.loser.aliases as never);
  }
  if (snapshot.keepBefore) {
    await admin
      .from("foods")
      .update(snapshot.keepBefore as never)
      .eq("id", String(snapshot.keepBefore["id"]));
  }
  return { ok: true };
}

/**
 * Undo one audit entry.
 *
 * create → delete the row again; update → write the old row back;
 * delete → re-insert the food with its portions and aliases.
 */
export async function revertAudit(
  admin: Admin,
  auditId: string,
  actorId: string,
): Promise<{ ok: true; action: string } | { ok: false; reason: string }> {
  const { data: entry } = await admin
    .from("food_admin_audit")
    .select("*")
    .eq("id", auditId)
    .maybeSingle();
  if (!entry) return { ok: false, reason: "That history entry no longer exists." };
  if (entry.reverted_at) return { ok: false, reason: "That change was already undone." };

  const table = entry.target_table as "foods" | "food_portions" | "food_aliases";
  const before = entry.before as Record<string, unknown> | null;
  const action = entry.action as AuditAction;

  if (action === "food.merge") {
    const snap = before as MergeSnapshot | null;
    if (!snap?.loser?.food) return { ok: false, reason: "Nothing stored to restore." };
    const result = await revertMerge(admin, snap);
    if (!result.ok) return { ok: false, reason: result.reason };
    await admin
      .from("food_admin_audit")
      .update({ reverted_at: new Date().toISOString(), reverted_by: actorId })
      .eq("id", auditId);
    return { ok: true, action };
  }

  if (action === "food.delete") {
    const snap = before as {
      food?: Record<string, unknown>;
      portions?: Record<string, unknown>[];
      aliases?: Record<string, unknown>[];
    } | null;
    if (!snap?.food) return { ok: false, reason: "Nothing stored to restore." };
    const restore = await admin.from("foods").insert(snap.food as never);
    if (restore.error) return { ok: false, reason: restore.error.message };
    if (snap.portions?.length) await admin.from("food_portions").insert(snap.portions as never);
    if (snap.aliases?.length) await admin.from("food_aliases").insert(snap.aliases as never);
  } else if (action === "portion.delete" || action === "alias.delete") {
    if (!before) return { ok: false, reason: "Nothing stored to restore." };
    const restore = await admin.from(table).insert(before as never);
    if (restore.error) return { ok: false, reason: restore.error.message };
  } else if (before) {
    // update: put the previous row back exactly as it was
    const restore = await admin
      .from(table)
      .update(before as never)
      .eq("id", String(before["id"] ?? entry.target_id ?? ""));
    if (restore.error) return { ok: false, reason: restore.error.message };
  } else {
    // create / import: the row did not exist before, so remove it
    if (!entry.target_id) return { ok: false, reason: "Nothing to remove." };
    if (table === "foods") {
      await admin.from("food_portions").delete().eq("food_id", entry.target_id);
      await admin.from("food_aliases").delete().eq("food_id", entry.target_id);
    }
    const del = await admin.from(table).delete().eq("id", entry.target_id);
    if (del.error) return { ok: false, reason: del.error.message };
  }

  await admin
    .from("food_admin_audit")
    .update({ reverted_at: new Date().toISOString(), reverted_by: actorId })
    .eq("id", auditId);

  return { ok: true, action };
}
