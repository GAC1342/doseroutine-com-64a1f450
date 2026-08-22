import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearMealThumbCache } from "@/lib/meal-thumb-cache";

/**
 * Fully tears down the session — including sessions created through Apple /
 * Google OAuth, which persist tokens in both localStorage and cookies.
 *
 * Order matters: cancel in-flight queries before the token disappears, drop
 * cached protected data, revoke the session server-side, then purge any
 * leftover Supabase storage keys so a refresh can't resurrect it.
 */
export async function performSignOut(queryClient: QueryClient): Promise<void> {
  try {
    await queryClient.cancelQueries();
  } catch {
    /* ignore */
  }
  queryClient.clear();

  try {
    // 'global' revokes refresh tokens everywhere, not just this tab.
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) await supabase.auth.signOut({ scope: "local" });
  } catch {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* fall through to the storage purge below */
    }
  }

  // Signed photo URLs are capability links — never leave them for the next user.
  clearMealThumbCache();
  purgeSupabaseStorage();
}

/** Removes any residual `sb-*-auth-token` entries left by the OAuth flow. */
export function purgeSupabaseStorage(): void {
  if (typeof window === "undefined") return;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key && (key.startsWith("sb-") || key.startsWith("supabase.auth"))) keys.push(key);
      }
      keys.forEach((k) => store.removeItem(k));
    } catch {
      /* storage unavailable */
    }
  }
}
