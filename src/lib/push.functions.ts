import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Sends a test push to every push_subscription the caller owns so users can
// verify that background alerts actually reach their device. Uses the same
// web-push machinery as the reminders cron; a device that receives this test
// will receive real dose reminders when the cron fires.
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      return { sent: 0, message: "No push subscriptions found for this device." };
    }
    const vapidPub = process.env.VAPID_PUBLIC_KEY;
    const vapidPriv = process.env.VAPID_PRIVATE_KEY;
    const vapidSub = process.env.VAPID_SUBJECT || "mailto:support@doseroutine.com";
    if (!vapidPub || !vapidPriv) throw new Error("VAPID keys not configured");
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(vapidSub, vapidPub, vapidPriv);
    const payload = JSON.stringify({
      title: "DoseRoutine test alert 🔔",
      body: "Push is working. You'll get reminders like this at dose time.",
      url: "/today",
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let sent = 0;
    const deadIds: string[] = [];
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) deadIds.push(s.id);
      }
    }
    if (deadIds.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", deadIds);
    }
    return {
      sent,
      message: sent > 0 ? `Sent to ${sent} device(s).` : "All endpoints were stale and removed.",
    };
  });
