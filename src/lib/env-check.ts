import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EnvVarMeta = {
  key: string;
  category: "server" | "client";
  required: boolean;
  description: string;
};

export type EnvCheckResult = {
  key: string;
  category: "server" | "client";
  required: boolean;
  description: string;
  present: boolean;
  length: number;
};

/**
 * Environment variables the app depends on. Values are never returned — only
 * presence and length are exposed on the /debug/env page.
 */
export const EXPECTED_ENV_VARS: EnvVarMeta[] = [
  // Server
  {
    key: "SUPABASE_URL",
    category: "server",
    required: true,
    description: "Supabase project URL (server/SSR fallback)",
  },
  {
    key: "SUPABASE_PUBLISHABLE_KEY",
    category: "server",
    required: true,
    description: "Supabase publishable key (server/SSR fallback)",
  },
  {
    key: "USDA_FDC_API_KEY",
    category: "server",
    required: false,
    description: "USDA FoodData Central API key",
  },
  {
    key: "STRIPE_SANDBOX_API_KEY",
    category: "server",
    required: false,
    description: "Stripe sandbox secret key",
  },
  {
    key: "STRIPE_LIVE_API_KEY",
    category: "server",
    required: false,
    description: "Stripe live secret key",
  },
  {
    key: "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
    category: "server",
    required: false,
    description: "Stripe sandbox webhook endpoint secret",
  },
  {
    key: "PAYMENTS_LIVE_WEBHOOK_SECRET",
    category: "server",
    required: false,
    description: "Stripe live webhook endpoint secret",
  },
  {
    key: "LOVABLE_API_KEY",
    category: "server",
    required: false,
    description: "Lovable API key (used by Stripe connector gateway)",
  },

  // Client
  {
    key: "VITE_SUPABASE_URL",
    category: "client",
    required: true,
    description: "Supabase project URL (browser bundle)",
  },
  {
    key: "VITE_SUPABASE_PUBLISHABLE_KEY",
    category: "client",
    required: true,
    description: "Supabase publishable key (browser bundle)",
  },
  {
    key: "VITE_SUPABASE_PROJECT_ID",
    category: "client",
    required: false,
    description: "Supabase project ID (auth session helpers)",
  },
  {
    key: "VITE_PAYMENTS_CLIENT_TOKEN",
    category: "client",
    required: false,
    description: "Stripe Payments client token",
  },
  {
    key: "VITE_SENTRY_DSN",
    category: "client",
    required: false,
    description: "Sentry DSN",
  },
  {
    key: "VITE_CRASHLYTICS_ENABLED",
    category: "client",
    required: false,
    description: "Crashlytics enabled flag",
  },
];

/** Server-side env check. Never returns actual values. */
export const checkServerEnv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EnvCheckResult[]> => {
    // Admin-only: knowing which secrets are configured is reconnaissance.
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    return EXPECTED_ENV_VARS.filter((v) => v.category === "server").map((v) => {
      const value = process.env[v.key];
      const present = typeof value === "string" && value.length > 0;
      // Never expose secret length — presence only.
      return { ...v, present, length: 0 };
    });
  });

/** Client-side env check. Never returns actual values. */
export function checkClientEnv(): EnvCheckResult[] {
  return EXPECTED_ENV_VARS.filter((v) => v.category === "client").map((v) => {
    const raw = (import.meta.env as Record<string, string | undefined>)[v.key];
    const value = typeof raw === "string" ? raw : "";
    const present = value.length > 0;
    return {
      ...v,
      present,
      length: value.length,
    };
  });
}
