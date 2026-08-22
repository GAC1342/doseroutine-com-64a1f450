import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolJson } from "../supabase";
import { friendlyDbError, guardCall } from "../tool-guard";

export default defineTool({
  name: "list_meals",
  title: "List logged meals",
  description:
    "List the signed-in user's logged DoseRoutine meals in a date range with calories and macros, plus daily totals.",
  inputSchema: {
    from: z
      .string()
      .optional()
      .describe(
        "Start of the range as an ISO date or datetime. Defaults to the start of today (UTC).",
      ),
    to: z
      .string()
      .optional()
      .describe("End of the range as an ISO date or datetime. Defaults to 24 hours after `from`."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    const gate = guardCall("list_meals", ctx, { kind: "read" });
    if (gate) return gate;

    const start = from
      ? new Date(from)
      : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    if (Number.isNaN(start.getTime()))
      return toolError(`Could not read \`from\` as a date: ${from}`);
    const end = to ? new Date(to) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(end.getTime())) return toolError(`Could not read \`to\` as a date: ${to}`);

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("meals")
      .select(
        "id, label, meal_slot, logged_at, source, est_calories, est_protein_g, est_carbs_g, est_fat_g, adj_calories, adj_protein_g, adj_carbs_g, adj_fat_g",
      )
      .gte("logged_at", start.toISOString())
      .lt("logged_at", end.toISOString())
      .order("logged_at", { ascending: true })
      .limit(200);

    if (error) return toolError(friendlyDbError(error, "list your logged meals"));

    const items = (data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      slot: row.meal_slot,
      logged_at: row.logged_at,
      source: row.source,
      calories: row.adj_calories ?? row.est_calories ?? null,
      protein_g: row.adj_protein_g ?? row.est_protein_g ?? null,
      carbs_g: row.adj_carbs_g ?? row.est_carbs_g ?? null,
      fat_g: row.adj_fat_g ?? row.est_fat_g ?? null,
    }));

    const totals = items.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories ?? 0),
        protein_g: acc.protein_g + (m.protein_g ?? 0),
        carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
        fat_g: acc.fat_g + (m.fat_g ?? 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );

    return toolJson(
      { from: start.toISOString(), to: end.toISOString(), count: items.length, totals, items },
      { count: items.length, totals, items },
    );
  },
});
