import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolJson } from "../supabase";
import { friendlyDbError, guardCall } from "../tool-guard";

export default defineTool({
  name: "log_body_metric",
  title: "Log a body measurement",
  description:
    "Record a body check-in for the signed-in user in DoseRoutine: weight, body fat, and tape measurements. All fields are optional except the date.",
  inputSchema: {
    measured_at: z.string().optional().describe("ISO date for the measurement. Defaults to today."),
    weight_kg: z.number().optional().describe("Body weight in kilograms."),
    body_fat_pct: z.number().optional().describe("Body fat percentage."),
    waist_cm: z.number().optional().describe("Waist measurement in centimetres."),
    chest_cm: z.number().optional().describe("Chest measurement in centimetres."),
    arm_cm: z.number().optional().describe("Arm measurement in centimetres."),
    thigh_cm: z.number().optional().describe("Thigh measurement in centimetres."),
    notes: z.string().optional().describe("Optional note about this check-in."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (input, ctx) => {
    const gate = guardCall("log_body_metric", ctx, { kind: "write" });
    if (gate) return gate;
    const userId = ctx.getUserId();
    if (!userId)
      return toolError(
        "Could not read your DoseRoutine account id from the connection. What to do next: reconnect this MCP server and sign in again.",
      );

    const measured = input.measured_at ?? new Date().toISOString().slice(0, 10);
    if (Number.isNaN(new Date(measured).getTime())) {
      return toolError(`Could not read \`measured_at\` as a date: ${input.measured_at}`);
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("body_metrics")
      .insert({
        user_id: userId,
        measured_at: measured,
        weight_kg: input.weight_kg ?? null,
        body_fat_pct: input.body_fat_pct ?? null,
        waist_cm: input.waist_cm ?? null,
        chest_cm: input.chest_cm ?? null,
        arm_cm: input.arm_cm ?? null,
        thigh_cm: input.thigh_cm ?? null,
        notes: input.notes ?? null,
      })
      .select(
        "id, measured_at, weight_kg, body_fat_pct, waist_cm, chest_cm, arm_cm, thigh_cm, notes",
      )
      .maybeSingle();

    if (error) return toolError(friendlyDbError(error, "save that body measurement"));
    return toolJson(data, { metric: data ?? undefined });
  },
});
