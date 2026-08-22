import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStackTool from "./tools/list-stack";
import listDosesTool from "./tools/list-doses";
import logDoseTool from "./tools/log-dose";
import listMealsTool from "./tools/list-meals";
import logMealTool from "./tools/log-meal";
import logBodyMetricTool from "./tools/log-body-metric";
import searchCompoundsTool from "./tools/search-compounds";

// The OAuth issuer must be the direct Supabase host: on publish SUPABASE_URL is
// rewritten to the proxy form, which fails RFC 8414 issuer matching. The project
// ref is inlined by Vite at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "doseroutine",
  title: "DoseRoutine",
  version: "0.1.0",
  instructions:
    "Tools for DoseRoutine, a protocol tracker for peptides, GLP-1s, hormones and supplements. Read the signed-in user's stack and scheduled doses, mark doses taken or skipped, log meals with macros, record body measurements, and search the compound library. Always confirm dose changes with the user before writing. Nothing here is medical advice. Calls are rate limited per account (about 30 reads and 12 writes per tool per minute, 60 calls per minute overall): batch requests, prefer one date-range call over many single-item calls, and when a call reports a rate limit, wait the number of seconds it names instead of retrying immediately.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listStackTool,
    listDosesTool,
    logDoseTool,
    listMealsTool,
    logMealTool,
    logBodyMetricTool,
    searchCompoundsTool,
  ],
});
