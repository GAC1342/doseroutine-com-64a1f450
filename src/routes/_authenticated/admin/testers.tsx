import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Gift, Mail, Send, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  listTesterSignups,
  markTesterInvited,
  sendTesterInviteEmail,
  getTesterFunnelBySource,
  setTesterMilestone,
} from "@/lib/tester-admin.functions";
import { issueCompCodes } from "@/lib/comp-access.functions";
import { getAppLaunchWaitlistCount } from "@/lib/app-launch.functions";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/admin/testers")({
  errorComponent: routeErrorComponent("admin-testers"),
  head: () => ({
    meta: [
      { title: "Closed testing signups — DoseRoutine admin" },
      { name: "description", content: "Admin view of DoseRoutine closed-testing tester signups." },
      { property: "og:title", content: "Closed testing signups — DoseRoutine admin" },
      { property: "og:description", content: "Admin view of DoseRoutine tester signups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TestersPage,
});

function TestersPage() {
  const fetchSignups = useServerFn(listTesterSignups);
  const fetchWaitlistCount = useServerFn(getAppLaunchWaitlistCount);
  const setInvited = useServerFn(markTesterInvited);
  const mintCodes = useServerFn(issueCompCodes);
  const sendInvite = useServerFn(sendTesterInviteEmail);
  const fetchFunnel = useServerFn(getTesterFunnelBySource);
  const setMilestone = useServerFn(setTesterMilestone);
  const queryClient = useQueryClient();
  const [codes, setCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tester-signups"],
    queryFn: () => fetchSignups({ data: { limit: 200 } }),
    enabled: !!isAdmin,
    staleTime: 30_000,
  });

  const { data: waitlistCount } = useQuery({
    queryKey: ["app-launch-waitlist-count"],
    queryFn: () => fetchWaitlistCount(),
    enabled: !!isAdmin,
    staleTime: 30_000,
  });

  const { data: funnel } = useQuery({
    queryKey: ["tester-funnel"],
    queryFn: () => fetchFunnel(),
    enabled: !!isAdmin,
    staleTime: 30_000,
  });

  const milestoneMutation = useMutation({
    mutationFn: (vars: { id: string; milestone: "installed" | "retained_14d"; value: boolean }) =>
      setMilestone({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tester-signups"] });
      queryClient.invalidateQueries({ queryKey: ["tester-funnel"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (vars: { id: string; invited: boolean }) => setInvited({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tester-signups"] }),
  });

  const sendInviteMutation = useMutation({
    mutationFn: (vars: { id: string }) => sendInvite({ data: vars }),
    onSuccess: (res) => {
      setSendResult(
        res.ok
          ? `Invite email sent to ${res.email}.`
          : res.error === "suppressed"
            ? "That address is blocked from receiving email (bounced or unsubscribed)."
            : res.error === "not_found"
              ? "Signup not found."
              : "Sending failed. Try again in a moment.",
      );
      queryClient.invalidateQueries({ queryKey: ["tester-signups"] });
    },
    onError: () => setSendResult("Sending failed. Try again in a moment."),
    onSettled: () => setSendingId(null),
  });

  const mintMutation = useMutation({
    mutationFn: () => mintCodes({ data: { count: 20, months: 3, reason: "closed_testing" } }),
    onSuccess: (res) => {
      setCodes(res.codes);
      setCopied(false);
    },
  });

  const stats = useMemo(() => {
    const rows = data?.rows ?? [];
    return {
      total: data?.total ?? rows.length,
      invited: rows.filter((r) => r.invited_at).length,
      android: rows.filter(
        (r) =>
          r.platform_preference === "android" ||
          r.platform_preference === "android_phone" ||
          r.platform_preference === "android_tablet" ||
          r.platform_preference === "both",
      ).length,
      waitlist: waitlistCount?.count ?? null,
    };
  }, [data, waitlistCount]);

  if (adminLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">You don&apos;t have access to this page.</p>
        <Link to="/today" className="mt-3 inline-block text-sm text-primary underline">
          Back to Today
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <Link to="/today" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold">Closed testing signups</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone who signed up at /closed-testing. Add their email to the Play Console tester list,
        then mark them invited.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total signups</p>
          <p className="mt-1 font-display text-2xl font-semibold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Invited</p>
          <p className="mt-1 font-display text-2xl font-semibold">{stats.invited}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Android-ready</p>
          <p className="mt-1 font-display text-2xl font-semibold">{stats.android}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">App launch waitlist</p>
          </div>
          <p className="mt-1 font-display text-2xl font-semibold">
            {stats.waitlist === null ? "—" : stats.waitlist}
          </p>
        </Card>
      </div>

      <Card className="mt-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-cta" aria-hidden="true" />
            <p className="text-sm font-medium">Reward codes — 3 months of Pro</p>
          </div>
          <button
            type="button"
            onClick={() => mintMutation.mutate()}
            disabled={mintMutation.isPending}
            className="tap-target rounded-xl bg-cta px-3 py-2 text-sm font-semibold text-cta-foreground disabled:opacity-60"
          >
            {mintMutation.isPending ? "Generating…" : "Generate 20 codes"}
          </button>
        </div>
        {codes.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Email one code per tester after their 14 days. They redeem it at /redeem.
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(codes.join("\n"));
                  setCopied(true);
                }}
                className="inline-flex items-center gap-1 text-xs text-primary"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
              {codes.join("\n")}
            </pre>
          </div>
        )}
      </Card>

      {sendResult && (
        <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{sendResult}</p>
      )}

      <Card className="mt-5 p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium">Funnel by source</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Page views come from UTM-tagged visits to /closed-testing. Install and 14-day columns
          reflect what you&apos;ve marked below.
        </p>
        {(funnel?.rows.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No attributed signups yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 font-medium">Source / medium / campaign</th>
                  <th className="py-1 pr-3 font-medium">Views</th>
                  <th className="py-1 pr-3 font-medium">Signups</th>
                  <th className="py-1 pr-3 font-medium">Signup rate</th>
                  <th className="py-1 pr-3 font-medium">Invited</th>
                  <th className="py-1 pr-3 font-medium">Installed</th>
                  <th className="py-1 pr-3 font-medium">14-day</th>
                  <th className="py-1 font-medium">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {funnel!.rows.map((r) => {
                  const signupRate = r.views ? Math.round((r.signups / r.views) * 100) : null;
                  const retention = r.signups ? Math.round((r.retained_14d / r.signups) * 100) : 0;
                  return (
                    <tr key={`${r.source}|${r.medium}|${r.campaign}`}>
                      <td className="py-1.5 pr-3 font-medium text-foreground">
                        {r.source}
                        <span className="text-muted-foreground">
                          {" "}
                          / {r.medium} / {r.campaign}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3">{r.views ?? "—"}</td>
                      <td className="py-1.5 pr-3">{r.signups}</td>
                      <td className="py-1.5 pr-3">
                        {signupRate === null ? "—" : `${signupRate}%`}
                      </td>
                      <td className="py-1.5 pr-3">{r.invited}</td>
                      <td className="py-1.5 pr-3">{r.installed}</td>
                      <td className="py-1.5 pr-3">{r.retained_14d}</td>
                      <td className="py-1.5">{retention}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-5 overflow-hidden">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading signups…</p>
        ) : (data?.rows.length ?? 0) === 0 ? (
          <div className="p-6 text-center">
            <Users className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">No signups yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data!.rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.name ? `${r.name} · ` : ""}
                    {r.platform_preference ?? "platform not set"} ·{" "}
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sequence:{" "}
                    {[
                      ["Welcome", r.welcome_email_at],
                      ["Install nudge", r.install_reminder_at],
                      ["Feedback", r.feedback_prompt_at],
                      ["Wrap-up", r.wrapup_email_at],
                    ]
                      .filter(([, at]) => at)
                      .map(([label]) => label)
                      .join(" · ") || "not started"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    via {r.utm_source || "direct"}
                    {r.utm_campaign ? ` · ${r.utm_campaign}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={sendInviteMutation.isPending && sendingId === r.id}
                  onClick={() => {
                    setSendingId(r.id);
                    sendInviteMutation.mutate({ id: r.id });
                  }}
                  className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  {sendInviteMutation.isPending && sendingId === r.id
                    ? "Sending…"
                    : r.invited_at
                      ? "Resend email"
                      : "Send invite email"}
                </button>
                <button
                  type="button"
                  onClick={() => inviteMutation.mutate({ id: r.id, invited: !r.invited_at })}
                  className={`tap-target rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    r.invited_at
                      ? "bg-primary/10 text-primary"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {r.invited_at ? "Invited" : "Mark invited"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    milestoneMutation.mutate({
                      id: r.id,
                      milestone: "installed",
                      value: !r.installed_at,
                    })
                  }
                  className={`tap-target rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    r.installed_at
                      ? "bg-primary/10 text-primary"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {r.installed_at ? "Installed" : "Mark installed"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    milestoneMutation.mutate({
                      id: r.id,
                      milestone: "retained_14d",
                      value: !r.retained_14d_at,
                    })
                  }
                  className={`tap-target rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    r.retained_14d_at
                      ? "bg-cta/10 text-cta"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {r.retained_14d_at ? "14 days ✓" : "Mark 14 days"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
