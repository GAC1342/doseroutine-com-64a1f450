import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { dayKeyInZone } from "@/lib/day-key";
import { HELP_LIST } from "@/lib/help-articles";

// One-conversation-per-user AI chat. Persists to public.chat_messages via RLS.

type ChatRequestBody = { messages?: unknown };

// Rate limits: free/trial = 5 messages/day, pro = 30/day AND ~500/month.
const DAILY_LIMITS: Record<string, number> = { free: 5, pro: 30 };
const MONTHLY_LIMITS: Record<string, number> = { free: 5 * 31, pro: 500 };

const SYSTEM_PROMPT = `You are DoseRoutine Assistant, a safety-first educator for people
tracking supplements, peptides, hormones (including TRT/HRT), and prescription
medications. You ALSO teach users how to use the DoseRoutine app itself. Rules:
1. NEVER suggest a dose, range, or "low/high end" for any controlled item
   (peptides, hormones, TRT, anabolics, GLP-1s, prescription meds). Ask the
   user for their prescribed dose and reason from that.
2. Cite generally-accepted mechanisms. Say "no rule on file" or "consult your
   clinician" when unsure.
3. Personalize replies using the user context block below when present.
4. When the user asks "how do I..." or "where is..." about the app, use the
   APP GUIDE block below. Give plain grade-4 English steps and mention the
   feature's page name (e.g. "Stack tab", "Reminders", "Timeline"). Point
   them to /help/<slug> for the full guide.
5. Always end with: "This is educational, not medical advice." (skip this
   line for pure app-usage questions).
6. Keep replies concise. Use short markdown lists when helpful.`;

const APP_GUIDE_BLOCK = `APP GUIDE (how DoseRoutine features work — cite these when the user asks how to use the app):\n${HELP_LIST.map(
  (a) =>
    `• ${a.title} [/help/${a.slug}]: ${a.summary} Steps: ${a.steps
      .slice(0, 4)
      .map((s, i) => `${i + 1}) ${s.replace(/\s+/g, " ").slice(0, 140)}`)
      .join(" ")}`,
).join("\n")}`;

async function loadUserContext(supabase: any, userId: string) {
  const [{ data: stack }, { data: profile }] = await Promise.all([
    supabase
      .from("user_compounds")
      .select(
        "custom_name, dose_amount, dose_unit, times_of_day, with_food, notes, compound:compounds(name, category, is_controlled)",
      )
      .eq("user_id", userId)
      .eq("active", true)
      .limit(50),
    supabase.from("profiles").select("primary_goal, sex, timezone").eq("id", userId).maybeSingle(),
  ]);
  return { stack: stack ?? [], profile: profile ?? null };
}

/** Server-side tier resolution. Never trust a client header for entitlements —
 *  read the caller's own subscriptions row under RLS. */
async function resolveTier(supabase: any, userId: string): Promise<"free" | "pro"> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, tier, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return "free";
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const status = String(data.status ?? "").toLowerCase();
  const tier = String(data.tier ?? "").toLowerCase();
  const notExpired =
    !data.current_period_end || new Date(data.current_period_end).getTime() > Date.now();
  if (activeStatuses.has(status) && (tier === "pro" || tier === "paid") && notExpired) return "pro";
  return "free";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supaKey =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!key || !supaUrl || !supaKey) {
          return new Response("Server not configured", { status: 500 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        // Per-request Supabase client that respects RLS as the caller.
        const supabase = createClient(supaUrl, supaKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userRes.user) return new Response("Unauthorized", { status: 401 });
        const userId = userRes.user.id;

        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) return new Response("Messages are required", { status: 400 });

        // Entitlement + timezone come from the DB, not the client — the
        // previous `x-doseroutine-tier` header trust was a Pro-quota bypass.
        const [tier, { data: profileRow }] = await Promise.all([
          resolveTier(supabase, userId),
          supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
        ]);
        const zone = (profileRow?.timezone as string | undefined) || "UTC";
        const dailyLimit = DAILY_LIMITS[tier];
        const monthlyLimit = MONTHLY_LIMITS[tier];
        const today = dayKeyInZone(new Date(), zone); // YYYY-MM-DD in user zone
        const month = today.slice(0, 7);
        const { data: usageRows } = await supabase
          .from("chat_usage")
          .select("period, message_count")
          .eq("user_id", userId)
          .like("period", `${month}%`);
        const rows = usageRows ?? [];
        const usedToday =
          (rows.find((r) => r.period === today)?.message_count as number | undefined) ?? 0;
        const usedMonth = rows.reduce(
          (n, r) => n + ((r.message_count as number | undefined) ?? 0),
          0,
        );
        if (usedToday >= dailyLimit || usedMonth >= monthlyLimit) {
          return new Response(
            JSON.stringify({
              error: "limit_reached",
              usedToday,
              usedMonth,
              dailyLimit,
              monthlyLimit,
              tier,
            }),
            { status: 402, headers: { "content-type": "application/json" } },
          );
        }

        // Persist the user's latest message before streaming.
        const uiMessages = messages as UIMessage[];
        const latest = uiMessages[uiMessages.length - 1];
        if (latest?.role === "user") {
          const text = (latest.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
          if (text.trim()) {
            await supabase.from("chat_messages").insert({
              user_id: userId,
              role: "user",
              content: text,
            });
          }
        }

        // Build per-user context block.
        const ctx = await loadUserContext(supabase, userId);
        const contextBlock = `USER CONTEXT (respect controlled-item rules):\n${JSON.stringify(ctx).slice(0, 4000)}`;

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-2.5-flash");
        const result = streamText({
          model,
          // AI SDK v7 rejects role:"system" entries inside `messages`
          // ("System messages are not allowed…"); system text goes here.
          system: [SYSTEM_PROMPT, APP_GUIDE_BLOCK, contextBlock].join("\n\n"),
          messages: await convertToModelMessages(uiMessages),
          onError: ({ error }) => {
            console.error("[api/chat] model stream error", error);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onError: (error) => {
            console.error("[api/chat] stream response error", error);
            return error instanceof Error
              ? error.message
              : "The assistant hit an error. Please try again.";
          },
          onFinish: async ({ messages: finalMessages }) => {
            try {
              const assistant = finalMessages[finalMessages.length - 1];
              if (assistant?.role === "assistant") {
                const text = (assistant.parts ?? [])
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");
                if (text.trim()) {
                  await supabase.from("chat_messages").insert({
                    user_id: userId,
                    role: "assistant",
                    content: text,
                  });
                }
              }
              // Bump today's usage counter (user owns their row).
              await supabase.from("chat_usage").upsert(
                {
                  user_id: userId,
                  period: today,
                  message_count: usedToday + 1,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,period" },
              );
            } catch (err) {
              console.error("chat onFinish persist failed", err);
            }
          },
        });
      },
    },
  },
});
