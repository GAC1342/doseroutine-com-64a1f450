import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bug } from "lucide-react";
import { getAttribution, attributionProperties, type Attribution } from "@/lib/utm";
import { lookupTesterAttribution } from "@/lib/tester-attribution-debug.functions";

function Row({ label, value }: { label: string; value: unknown }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="break-all text-right text-xs text-foreground">{display}</span>
    </div>
  );
}

/**
 * Admin-only debug panel: shows the attribution captured in this browser and
 * which closed-testing sign-up row it links to.
 */
export function AttributionDebugPanel() {
  const lookup = useServerFn(lookupTesterAttribution);
  const [attr, setAttr] = useState<Attribution | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState<{
    email?: string;
    utmSource?: string | null;
    utmCampaign?: string | null;
  } | null>(null);

  useEffect(() => {
    setAttr(getAttribution());
  }, []);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
    staleTime: 5 * 60_000,
  });

  const { data, isFetching, error } = useQuery({
    queryKey: ["tester-attribution-lookup", query],
    queryFn: () => lookup({ data: { ...query, limit: 10 } }),
    enabled: !!isAdmin && !!query,
  });

  if (!isAdmin) return null;

  const props = attr ? attributionProperties(attr) : null;

  return (
    <Card className="mt-10 p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bug className="h-4 w-4 text-primary" aria-hidden="true" />
          Attribution debug (admin only)
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Captured in this browser
            </h3>
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                First touch (localStorage, 90 days)
              </p>
              {attr?.first ? (
                Object.entries(attr.first).map(([k, v]) => <Row key={k} label={k} value={v} />)
              ) : (
                <p className="text-xs text-muted-foreground">No first touch stored.</p>
              )}
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                Last touch (session)
              </p>
              {attr?.last ? (
                Object.entries(attr.last).map(([k, v]) => <Row key={k} label={k} value={v} />)
              ) : (
                <p className="text-xs text-muted-foreground">No last touch stored.</p>
              )}
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                Fields sent with a sign-up
              </p>
              {props && Object.entries(props).map(([k, v]) => <Row key={k} label={k} value={v} />)}
            </div>
          </section>

          <section className="border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Linked sign-up row
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tester@example.com"
                className="h-9 max-w-xs"
                aria-label="Look up sign-up by email"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => setQuery({ email: email.trim() || undefined })}
                disabled={!email.trim() || isFetching}
              >
                Look up by email
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setQuery({
                    utmSource: props?.utm_source ?? null,
                    utmCampaign: props?.utm_campaign ?? null,
                  })
                }
                disabled={isFetching}
              >
                Match this visitor&apos;s attribution
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setQuery({})}
                disabled={isFetching}
              >
                Recent signups
              </Button>
            </div>

            {error && (
              <p className="mt-3 text-xs text-destructive">
                Lookup failed: {(error as Error).message}
              </p>
            )}
            {isFetching && <p className="mt-3 text-xs text-muted-foreground">Loading…</p>}

            {data && !isFetching && (
              <div className="mt-3 space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  Matched by: <span className="font-medium">{data.matchedBy}</span> ·{" "}
                  {data.rows.length} row{data.rows.length === 1 ? "" : "s"}
                </p>
                {data.rows.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No sign-up row matches — this visitor has not converted yet.
                  </p>
                )}
                {data.rows.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    <Row label="id" value={r.id} />
                    <Row label="email" value={r.email} />
                    <Row label="name" value={r.name} />
                    <Row label="source" value={r.source} />
                    <Row label="created_at" value={r.created_at} />
                    <Row label="utm_source" value={r.utm_source} />
                    <Row label="utm_medium" value={r.utm_medium} />
                    <Row label="utm_campaign" value={r.utm_campaign} />
                    <Row label="utm_content" value={r.utm_content} />
                    <Row label="utm_term" value={r.utm_term} />
                    <Row label="referrer" value={r.referrer} />
                    <Row label="landing_path" value={r.landing_path} />
                    <Row label="invited_at" value={r.invited_at} />
                    <Row label="installed_at" value={r.installed_at} />
                    <Row label="retained_14d_at" value={r.retained_14d_at} />
                    <Row label="attribution (raw)" value={r.attribution} />
                    {props && r.utm_source && r.utm_source !== props.utm_source && (
                      <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                        Mismatch: browser says “{props.utm_source}”, row says “{r.utm_source}”.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}
