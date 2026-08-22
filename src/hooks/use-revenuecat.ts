import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initRevenueCat, identifyRevenueCatUser, logOutRevenueCat } from "@/lib/revenuecat";
import { isNative } from "@/lib/platform";

/**
 * Wires RevenueCat to the current Supabase user on native platforms.
 * On web this is a no-op.
 *
 * Mount once at the app root (inside RootComponent).
 */
export function useRevenueCatIdentity() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id ?? null;
        if (cancelled) return;
        await initRevenueCat(userId);
      } catch (e) {
        console.warn("[revenuecat] identity bootstrap failed", e);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        try {
          if (event === "SIGNED_IN" && session?.user?.id) {
            await identifyRevenueCatUser(session.user.id);
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
          }
          if (event === "SIGNED_OUT") {
            await logOutRevenueCat();
          }
        } catch (e) {
          console.warn("[revenuecat] auth state sync failed", e);
        }
      })();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);
}
