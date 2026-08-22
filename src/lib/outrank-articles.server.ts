/**
 * Server-only helpers for reading outrank.so articles from the database.
 *
 * These functions use the server publishable Supabase client so they can be
 * called from public routes and server functions without a user session.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type OutrankArticleRow = Database["public"]["Tables"]["outrank_articles"]["Row"];

function getSupabasePublic() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        // New-format sb_ publishable keys are opaque, not JWTs. PostgREST
        // fails with "Expected 3 parts in JWT; got 1" if we send them as a
        // Bearer token, so strip the default Authorization header and send
        // the key as apikey only.
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** All published outrank articles, newest first. */
export async function getOutrankArticles(): Promise<OutrankArticleRow[]> {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("outrank_articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("getOutrankArticles error:", error);
    throw new Error("Failed to load outrank articles");
  }
  return data ?? [];
}

/** A single published outrank article by slug, or null. */
export async function getOutrankArticle(slug: string): Promise<OutrankArticleRow | null> {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("outrank_articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    console.error("getOutrankArticle error:", error);
    throw new Error("Failed to load outrank article");
  }
  return data;
}
