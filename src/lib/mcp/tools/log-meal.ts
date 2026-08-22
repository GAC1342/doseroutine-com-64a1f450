import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolJson } from "../supabase";
import { friendlyDbError, guardCall } from "../tool-guard";

export default defineTool({
  name: "log_meal",
  title: "Log a meal",
  description:
    "Log a meal for the signed-in user in DoseRoutine with calories and macros. Use this for text-described meals; photo scans happen in the app.",
  inputSchema: {
    label: z.string().describe("Short description of the meal, e.g. 'Chicken bowl with rice'."),
    meal_slot: z
      .enum(["breakfast", "lunch", "dinner", "snack"])
      .describe("Which part of the day this meal belongs to."),
    calories: z.number().optional().describe("Estimated calories for the whole meal."),
    protein_g: z.number().optional().describe("Grams of protein."),
    carbs_g: z.number().optional().describe("Grams of carbohydrate."),
    fat_g: z.number().optional().describe("Grams of fat."),
    logged_at: z.string().optional().describe("ISO timestamp for the meal. Defaults to now."),
    notes: z.string().optional().describe("Optional free-text note."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (
    { label, meal_slot, calories, protein_g, carbs_g, fat_g, logged_at, notes },
    ctx,
  ) => {
    const gate = guardCall("log_meal", ctx, { kind: "write" });
    if (gate) return gate;
    const userId = ctx.getUserId();
    if (!userId)
      return toolError(
        "Could not read your DoseRoutine account id from the connection. What to do next: reconnect this MCP server and sign in again.",
      );

    const when = logged_at ?? new Date().toISOString();
    if (Number.isNaN(new Date(when).getTime())) {
      return toolError(`Could not read \`logged_at\` as a date: ${logged_at}`);
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("meals")
      .insert({
        user_id: userId,
        label,
        meal_slot,
        logged_at: when,
        source: "mcp",
        ai_items: [],
        est_calories: calories ?? null,
        est_protein_g: protein_g ?? null,
        est_carbs_g: carbs_g ?? null,
        est_fat_g: fat_g ?? null,
        notes: notes ?? null,
      })
      .select(
        "id, label, meal_slot, logged_at, est_calories, est_protein_g, est_carbs_g, est_fat_g",
      )
      .maybeSingle();

    if (error) return toolError(friendlyDbError(error, "log that meal"));
    return toolJson(data, { meal: data ?? undefined });
  },
});
