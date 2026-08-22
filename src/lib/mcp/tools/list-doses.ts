import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolJson } from "../supabase";
import { friendlyDbError, guardCall } from "../tool-guard";

export default defineTool({
  name: "list_doses",
  title: "List scheduled doses",
  description:
    "List the signed-in user's scheduled DoseRoutine doses in a date range, including whether each one was taken, skipped, or is still pending.",
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
    status: z
      .enum(["pending", "taken", "skipped", "missed"])
      .optional()
      .describe("Only return doses with this status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, status }, ctx) => {
    const gate = guardCall("list_doses", ctx, { kind: "read" });
    if (gate) return gate;

    const start = from
      ? new Date(from)
      : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    if (Number.isNaN(start.getTime()))
      return toolError(`Could not read \`from\` as a date: ${from}`);
    const end = to ? new Date(to) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(end.getTime())) return toolError(`Could not read \`to\` as a date: ${to}`);

    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("schedule_events")
      .select(
        "id, scheduled_at, status, taken_at, dose_amount, dose_unit, note, user_compounds(custom_name, compounds(name))",
      )
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(200);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return toolError(friendlyDbError(error, "list your scheduled doses"));

    const items = (data ?? []).map((row) => ({
      id: row.id,
      name: row.user_compounds?.compounds?.name ?? row.user_compounds?.custom_name ?? "Unnamed",
      scheduled_at: row.scheduled_at,
      status: row.status,
      taken_at: row.taken_at,
      dose: row.dose_amount != null ? `${row.dose_amount}${row.dose_unit ?? ""}` : null,
      note: row.note,
    }));

    return toolJson(
      { from: start.toISOString(), to: end.toISOString(), count: items.length, items },
      { count: items.length, items },
    );
  },
});
