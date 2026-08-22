import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { redeemCompCode } from "@/lib/comp-access.functions";
import { TESTER_REWARD_MONTHS } from "@/lib/access";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/redeem")({
  errorComponent: routeErrorComponent("redeem"),
  component: RedeemPage,
  head: () => ({
    meta: [
      { title: "Redeem a tester reward code | DoseRoutine" },
      {
        name: "description",
        content:
          "Redeem your DoseRoutine tester reward code to unlock 3 months of Pro access — no payment required.",
      },
      { property: "og:title", content: "Redeem a tester reward code | DoseRoutine" },
      {
        property: "og:description",
        content: "Unlock 3 months of DoseRoutine Pro with your tester reward code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ERRORS: Record<string, string> = {
  invalid: "That code doesn't look right. Check for typos and try again.",
  already_used: "That code has already been redeemed.",
  expired: "That code has expired. Contact support@doseroutine.com and we\u2019ll sort it out.",
  server_error: "Something went wrong. Please try again in a moment.",
};

function RedeemPage() {
  const redeem = useServerFn(redeemCompCode);
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [until, setUntil] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const result = await redeem({ data: { code } });
      if (result.ok) {
        setStatus("success");
        setUntil(result.until ?? null);
        queryClient.invalidateQueries({ queryKey: ["profile-flags"] });
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      } else {
        setStatus("error");
        setMessage(ERRORS[result.error] ?? ERRORS.server_error);
      }
    } catch {
      setStatus("error");
      setMessage(ERRORS.server_error);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      <PageHeader title="Redeem a code" />

      <Card className="mt-6 p-6">
        {status === "success" ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">You&apos;re all set</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {TESTER_REWARD_MONTHS} months of DoseRoutine Pro are now on your account
              {until ? `, through ${new Date(until).toLocaleDateString()}` : ""}. Thank you for
              testing.
            </p>
            <Link
              to="/today"
              className="tap-target mt-5 inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Go to Today
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <p className="text-sm text-muted-foreground">
                Finished the 14-day closed test? Enter the code we emailed you to unlock{" "}
                {TESTER_REWARD_MONTHS} months of Pro — no card, no store purchase.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="redeem-code" className="text-sm font-medium text-foreground">
                Reward code
              </label>
              <Input
                id="redeem-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD-2345"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                required
                className="h-11 font-mono tracking-widest"
              />
            </div>

            {status === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || code.trim().length < 4}
              className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {status === "loading" && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Redeem code
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
