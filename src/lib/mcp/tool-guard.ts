/**
 * Shared guard for MCP tool handlers.
 *
 * Every tool needs the same three things before it touches the database:
 * a verified caller, a rate-limit check, and errors that tell the assistant
 * (and through it, the user) what actually went wrong and what to do next.
 * Wrapping the handler keeps that consistent instead of re-implementing it
 * seven times.
 */

import type { ToolContext } from "@lovable.dev/mcp-js";
import {
  consumeRateLimit,
  rateLimitMessage,
  READ_RULE,
  WRITE_RULE,
  type RateLimitRule,
} from "./rate-limit";
import { toolError } from "./supabase";

export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

/**
 * Turn a Postgres/PostgREST error into a sentence a person can act on.
 * The raw text ("new row violates row-level security policy for table ...")
 * is accurate but tells the user nothing about their next move.
 */
export function friendlyDbError(error: SupabaseLikeError, action: string): string {
  const code = error.code ?? "";
  const raw = (error.message ?? "Unknown database error").trim();

  switch (code) {
    case "42501":
    case "PGRST301":
      return `Not allowed to ${action}. This usually means the connection signed in as a different DoseRoutine account, or the item belongs to someone else. What to do next: reconnect this MCP server and sign in as the account that owns the data.`;
    case "PGRST116":
      return `Nothing found to ${action}. What to do next: list the items first and use an id from that response.`;
    case "23505":
      return `That entry already exists, so nothing was changed while trying to ${action}. What to do next: read the existing entry and update it instead of creating a duplicate.`;
    case "23503":
      return `Could not ${action} because a referenced item no longer exists. What to do next: refresh the list and retry with a current id.`;
    case "22P02":
    case "22007":
      return `Could not ${action}: one of the values had the wrong format (a malformed id, number, or date). What to do next: check the input values and retry.`;
    case "57014":
      return `The request to ${action} took too long and was cancelled. What to do next: narrow the date range or ask for fewer items, then retry.`;
    default:
      return `Could not ${action}: ${raw}. What to do next: retry once; if it fails again, the user should open DoseRoutine and check the item directly.`;
  }
}

/** Message for an unexpected exception inside a handler. */
export function friendlyUnexpectedError(toolName: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const network = /fetch failed|network|ECONNRESET|timeout|abort/i.test(message);
  if (network) {
    return `\`${toolName}\` could not reach the DoseRoutine backend. What to do next: wait a few seconds and retry once; if it keeps failing, the service is likely temporarily unavailable.`;
  }
  return `\`${toolName}\` failed unexpectedly: ${message}. What to do next: do not retry in a loop — report this to the user and suggest they check the item in the DoseRoutine app.`;
}

export const NOT_AUTHENTICATED_TEXT =
  "Not signed in to DoseRoutine. What to do next: reconnect this MCP server and complete the sign-in prompt, then run the tool again. Tool calls will keep failing until the connection is authorized.";

export type GuardOptions = {
  /** Read tools get a larger budget than writes. Defaults to `read`. */
  kind?: "read" | "write";
  /** Override the sliding-window rule for this tool. */
  rule?: RateLimitRule;
};

/**
 * Gate a tool call: verify the caller and spend one unit of their budget.
 *
 * Returns `null` when the call may proceed, or the tool result to return
 * verbatim when it must be refused.
 */
export function guardCall(
  toolName: string,
  ctx: ToolContext,
  options: GuardOptions = {},
): ToolResult | null {
  if (!ctx.isAuthenticated()) return toolError(NOT_AUTHENTICATED_TEXT);

  const rule = options.rule ?? (options.kind === "write" ? WRITE_RULE : READ_RULE);
  const decision = consumeRateLimit(ctx.getUserId(), toolName, rule);
  if (!decision.allowed) return toolError(rateLimitMessage(toolName, decision));
  return null;
}
