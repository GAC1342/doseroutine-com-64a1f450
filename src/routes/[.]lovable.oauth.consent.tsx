import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * OAuth 2.1 consent screen. Supabase redirects here when an MCP client
 * (ChatGPT, Claude, Lovable, …) asks to act as the signed-in DoseRoutine user.
 */

type OAuthClient = { name?: string | null; client_name?: string | null; logo_uri?: string | null };
type AuthorizationDetails = {
  client?: OAuthClient | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scope?: string | null;
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

export function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the Supabase session lives in localStorage, which SSR can't read.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { authorization_id: string } => ({
    authorization_id:
      typeof search["authorization_id"] === "string" ? search["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Authorization request failed</CardTitle>
          <CardDescription>{String((error as Error)?.message ?? error)}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Close this window and start the connection again from your AI assistant.
        </CardContent>
      </Card>
    </main>
  ),
  head: () => ({
    meta: [
      { title: "Connect an app — DoseRoutine" },
      {
        name: "description",
        content: "Approve or deny an AI assistant's request to use DoseRoutine as you.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Connect an app — DoseRoutine" },
      {
        property: "og:description",
        content: "Approve or deny an AI assistant's request to use DoseRoutine as you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(null);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle>Connect {clientName} to DoseRoutine</CardTitle>
          <CardDescription>
            {clientName} is asking to use DoseRoutine as you. It will be able to read your stack,
            doses, meals and body measurements, and add entries on your behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button className="flex-1" disabled={busy !== null} onClick={() => void decide(true)}>
              {busy === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy !== null}
              onClick={() => void decide(false)}
            >
              {busy === "deny" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Deny
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can revoke this access at any time from your DoseRoutine account settings.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
