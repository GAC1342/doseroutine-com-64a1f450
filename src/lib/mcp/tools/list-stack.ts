import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolJson } from "../supabase";
import { friendlyDbError, guardCall } from "../tool-guard";

export default defineTool({
  name: "list_stack",
  title: "List my stack",
  description:
    "List the compounds, peptides, and supplements in the signed-in user's DoseRoutine stack, with dose, unit, frequency, and timing.",
  inputSchema: {
    include_inactive: z
      .boolean()
      .optional()
      .describe("Include items that have been paused or ended. Defaults to false."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_inactive }, ctx) => {
    const gate = guardCall("list_stack", ctx, { kind: "read" });
    if (gate) return gate;
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("user_compounds")
      .select(
        "id, custom_name, custom_category, dose_amount, dose_unit, frequency, times_of_day, days_of_week, with_food, post_workout, active, start_date, end_date, notes, compounds(name, slug, category)",
      )
      .order("created_at", { ascending: true });
    if (!include_inactive) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) return toolError(friendlyDbError(error, "list your stack"));

    const items = (data ?? []).map((row) => ({
      id: row.id,
      name: row.compounds?.name ?? row.custom_name ?? "Unnamed",
      category: row.compounds?.category ?? row.custom_category ?? null,
      dose: row.dose_amount != null ? `${row.dose_amount}${row.dose_unit ?? ""}` : null,
      frequency: row.frequency,
      times_of_day: row.times_of_day ?? [],
      days_of_week: row.days_of_week ?? [],
      with_food: row.with_food,
      post_workout: row.post_workout,
      active: row.active,
      start_date: row.start_date,
      end_date: row.end_date,
      notes: row.notes,
    }));

    return toolJson({ count: items.length, items }, { count: items.length, items });
  },
});
