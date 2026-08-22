import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolJson } from "../supabase";
import { friendlyDbError, guardCall } from "../tool-guard";

export default defineTool({
  name: "log_dose",
  title: "Mark a dose taken or skipped",
  description:
    "Update a scheduled DoseRoutine dose for the signed-in user: mark it taken, skipped, or back to pending. Use `list_doses` first to get the dose id.",
  inputSchema: {
    dose_id: z.string().describe("The id of the scheduled dose, from `list_doses`."),
    status: z.enum(["taken", "skipped", "pending"]).describe("New status for the dose."),
    taken_at: z
      .string()
      .optional()
      .describe("ISO timestamp the dose was taken. Defaults to now when status is `taken`."),
    note: z.string().optional().describe("Optional note to store with the dose."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ dose_id, status, taken_at, note }, ctx) => {
    const gate = guardCall("log_dose", ctx, { kind: "write" });
    if (gate) return gate;
    const supabase = supabaseForUser(ctx);

    const when = status === "taken" ? (taken_at ?? new Date().toISOString()) : null;
    if (when && Number.isNaN(new Date(when).getTime())) {
      return toolError(`Could not read \`taken_at\` as a date: ${taken_at}`);
    }

    const { data, error } = await supabase
      .from("schedule_events")
      .update({
        status,
        taken_at: when,
        ...(note !== undefined ? { note } : {}),
      })
      .eq("id", dose_id)
      .select("id, scheduled_at, status, taken_at, note")
      .maybeSingle();

    if (error) return toolError(friendlyDbError(error, "update that dose"));
    if (!data)
      return toolError(
        "No dose found with that id on this account. What to do next: call `list_doses` for the day in question and use an id from that response.",
      );

    return toolJson(data, { dose: data });
  },
});
