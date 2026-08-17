import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { runReindex, recordReindex } from "@/lib/reindex.server";

// Post-publish hook: resubmit sitemap.xml to Search Console and push every
// sitemap URL to IndexNow. Call after a deploy (CI step, cron, or the admin
// button). Guarded by CRON_SECRET / SEO_MONITOR_SECRET.

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.SEO_MONITOR_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  const query = new URL(request.url).searchParams.get("secret");
  return header === secret || query === secret;
}

async function handle(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const result = await runReindex();
  await recordReindex(result, { source: "hook" });
  return Response.json({ ok: result.sitemapSubmitOk, ...result });
}

export const Route = createFileRoute("/api/public/hooks/reindex")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
