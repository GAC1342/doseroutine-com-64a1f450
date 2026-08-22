import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { runSitemapResubmit } from "@/lib/sitemap-resubmit.server";

// Daily job (pg_cron 13:25 UTC): rebuild the sitemap, compare it with the last
// snapshot, and resubmit to Google Search Console + IndexNow only when the URL
// or image set actually changed. Missing article URLs or image entries come
// back as `regressions`. Guarded by CRON_SECRET / SEO_MONITOR_SECRET.
//
//   ?force=1    resubmit even when nothing changed
//   ?dry-run=1  report the diff without submitting or storing a snapshot

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.SEO_MONITOR_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  const query = new URL(request.url).searchParams.get("secret");
  return header === secret || query === secret;
}

async function handle(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const params = new URL(request.url).searchParams;
  const result = await runSitemapResubmit({
    force: params.get("force") === "1",
    dryRun: params.get("dry-run") === "1",
  });
  const ok = result.error === null && result.regressions.length === 0;
  return Response.json({ ok, ...result }, { status: ok ? 200 : 500 });
}

export const Route = createFileRoute("/api/public/hooks/sitemap-resubmit")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
