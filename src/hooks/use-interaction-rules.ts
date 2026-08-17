import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InteractionRule = Database["public"]["Tables"]["interaction_rules"]["Row"];

/**
 * Shared cache for the `interaction_rules` table. This table barely changes,
 * so we keep it in memory for the whole session. Multiple components can call
 * this hook without triggering additional network requests.
 */
export function useInteractionRules() {
  return useQuery<InteractionRule[]>({
    queryKey: ["interaction_rules"],
    queryFn: async () => {
      const { data } = await supabase.from("interaction_rules").select("*");
      return data ?? [];
    },
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
}

export function useCompoundLibrary() {
  return useQuery({
    queryKey: ["compounds", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("compounds").select("*").order("category").order("name");
      return data ?? [];
    },
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
}
