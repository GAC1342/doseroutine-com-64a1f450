import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SharedProtocolSnapshot } from "@/lib/shared-protocol";

export type SharedProtocolRow = {
  token: string;
  title: string;
  snapshot: SharedProtocolSnapshot;
  created_at: string;
};

export const fetchSharedProtocol = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }): Promise<SharedProtocolRow | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc(
      "get_shared_protocol" as never,
      { _token: data.token } as never,
    );
    if (error) throw error;
    const list = (rows ?? []) as SharedProtocolRow[];
    return list[0] ?? null;
  });
