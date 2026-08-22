import { createFileRoute } from "@tanstack/react-router";
import {
  extractOutrankArticles,
  normalizeOutrankPayload,
  toOutrankInsertRow,
  verifyOutrankBearer,
  verifyOutrankWebhookSignature,
} from "@/lib/outrank-webhook";

/**
 * Public webhook endpoint for outrank.so article publishing.
 *
 * outrank.so should be configured with:
 * - URL: https://doseroutine.com/api/public/webhooks/outrank
 * - Method: POST
 * - Content-Type: application/json
 * - Auth: Authorization: Bearer <OUTRANK_WEBHOOK_SECRET>
 * - Or signature header: X-Outrank-Signature (HMAC-SHA256 of the raw body)
 * - Secret: the value stored in OUTRANK_WEBHOOK_SECRET
 */
export const Route = createFileRoute("/api/public/webhooks/outrank")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature =
          request.headers.get("x-outrank-signature") ??
          request.headers.get("x-webhook-signature") ??
          request.headers.get("x-signature");
        const body = await request.text();
        const secret = process.env["OUTRANK_WEBHOOK_SECRET"];
        const altToken = process.env["OUTRANK_ACCESS_TOKEN"];

        if (!secret && !altToken) {
          console.error("OUTRANK_WEBHOOK_SECRET is not configured");
          return new Response("Webhook not configured", { status: 500 });
        }

        const candidates = [secret, altToken].filter(Boolean) as string[];
        const authorized = candidates.some(
          (candidate) =>
            verifyOutrankBearer(request.headers.get("authorization"), candidate) ||
            verifyOutrankWebhookSignature(body, signature, candidate),
        );

        if (!authorized) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        try {
          const articles = extractOutrankArticles(payload);
          if (articles.length === 0) {
            // Test pings with no article content are still a successful handshake.
            return Response.json({ received: true, articles: 0 });
          }

          const rows = articles.map((article) =>
            toOutrankInsertRow(normalizeOutrankPayload(article)),
          );

          // Load the admin client inside the handler so the service-role key
          // never enters the client bundle.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("outrank_articles").upsert(rows, {
            onConflict: "slug",
          });

          if (error) {
            console.error("Outrank upsert error:", error);
            return new Response("Failed to save article", { status: 500 });
          }

          return Response.json({ received: true, articles: rows.map((r) => r.slug) });
        } catch (e) {
          console.error("Outrank webhook processing error:", e);
          return new Response("Failed to process article", { status: 400 });
        }
      },
    },
  },
});
