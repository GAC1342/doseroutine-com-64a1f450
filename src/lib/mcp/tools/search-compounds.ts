import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, toolError, toolJson } from "../supabase";
import { friendlyDbError, guardCall } from "../tool-guard";

export default defineTool({
  name: "search_compounds",
  title: "Search the compound library",
  description:
    "Search DoseRoutine's library of peptides, hormones, GLP-1s, medications, vitamins and supplements by name, returning timing, food rules, and typical dose range.",
  inputSchema: {
    query: z
      .string()
      .describe("Name or partial name to search for, e.g. 'tirzepatide' or 'magnesium'."),
    limit: z
      .number()
      .int()
      .optional()
      .describe("Maximum number of results. Defaults to 10, capped at 25."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const gate = guardCall("search_compounds", ctx, { kind: "read" });
    if (gate) return gate;
    const term = query.trim();
    if (!term) return toolError("Provide a search term.");
    const max = Math.min(Math.max(Math.trunc(limit ?? 10), 1), 25);

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("compounds")
      .select(
        "name, slug, category, default_unit, typical_timing, food_rule, half_life_hours, rda_low, rda_high, upper_limit, is_injectable, goal_tags",
      )
      .ilike("name", `%${term.replace(/[%_]/g, "")}%`)
      .order("name", { ascending: true })
      .limit(max);

    if (error) return toolError(friendlyDbError(error, "search the compound library"));

    const items = (data ?? []).map((row) => ({
      name: row.name,
      category: row.category,
      url: `https://doseroutine.com/library/${row.slug}`,
      default_unit: row.default_unit,
      typical_timing: row.typical_timing,
      food_rule: row.food_rule,
      half_life_hours: row.half_life_hours,
      typical_range:
        row.rda_low != null || row.rda_high != null
          ? { low: row.rda_low, high: row.rda_high, upper_limit: row.upper_limit }
          : null,
      injectable: row.is_injectable,
      goal_tags: row.goal_tags,
    }));

    return toolJson({ query: term, count: items.length, items }, { count: items.length, items });
  },
});
