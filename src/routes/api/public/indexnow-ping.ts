import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { GOALS } from "@/lib/goals";

const HOST = "doseroutine.com";
const KEY = "ff78cf5b72e80ee9f44cbdc91300d780";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const STATIC_PATHS = [
  "/",
  "/library",
  "/about",
  "/install",
  "/privacy",
  "/legal",
  "/medical-disclaimer",
  "/refund-policy",
  "/ai-policy",
  "/cookies",
  "/data-deletion",
];

async function collectUrls(): Promise<string[]> {
  const urls = new Set<string>();
  for (const p of STATIC_PATHS) urls.add(`https://${HOST}${p}`);
  for (const g of GOALS) urls.add(`https://${HOST}/goals/${g.slug}`);
  const { data: compounds } = await supabase.from("compounds").select("slug");
  for (const c of compounds ?? []) urls.add(`https://${HOST}/library/${c.slug}`);
  return Array.from(urls);
}

async function submitBatch(urlList: string[]) {
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });
  return { status: res.status, ok: res.ok };
}

export const Route = createFileRoute("/api/public/indexnow-ping")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const provided = new URL(request.url).searchParams.get("secret");
        const secret = process.env.CRON_SECRET;
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const urls = await collectUrls();
        const results: Array<{ status: number; ok: boolean; count: number }> = [];
        for (let i = 0; i < urls.length; i += 10000) {
          const batch = urls.slice(i, i + 10000);
          const r = await submitBatch(batch);
          results.push({ ...r, count: batch.length });
        }
        return Response.json({ submitted: urls.length, batches: results });
      },
    },
  },
});
