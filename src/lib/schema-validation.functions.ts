import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runSchemaValidation } from "@/lib/schema-validation.server";

// On-demand structured-data validation for the in-app admin report.
// Admin-gated server-side (client UI gate is not enough on its own).
export const runSchemaValidationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden — admin only");
    const report = await runSchemaValidation({ limit: data.limit });
    return report;
  });
