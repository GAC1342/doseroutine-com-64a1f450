import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { formatDose, formatFrequency } from "@/lib/shared-protocol";
import { fetchSharedProtocol, type SharedProtocolRow } from "@/lib/shared-protocol.functions";
import { ArrowLeft, Share2, ShieldCheck, Pill } from "lucide-react";
import { Card } from "@/components/ui/card";

type Row = SharedProtocolRow;

export const sharedQuery = (token: string) =>
  queryOptions({
    queryKey: ["shared-protocol", token],
    queryFn: async (): Promise<Row | null> => {
      return await fetchSharedProtocol({ data: { token } });
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/p/$token")({
  loader: async ({ context, params }) => {
    const row = await context.queryClient.ensureQueryData(sharedQuery(params.token));
    if (!row) throw notFound();
    return null;
  },
  head: ({ params }) => {
    const title = "Shared stack — DoseRoutine";
    const desc =
      "A read-only view of a supplement, peptide, or medication stack shared from Dos… Check it against your full supplement, TRT, or peptide routine with DoseRoutine.";
    const url = `https://doseroutine.com/p/${params.token}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
    };
  },
  errorComponent: () => <NotAvailable />,
  notFoundComponent: () => <NotAvailable />,
  component: SharedProtocolPage,
});

export function NotAvailable() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="font-display text-2xl font-semibold">Link not available</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This shared stack may have been removed by its owner, or the link is incorrect.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Go to DoseRoutine
      </Link>
    </main>
  );
}

function SharedProtocolPage() {
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(sharedQuery(token));
  if (!data) return <NotAvailable />;

  const snapshot = data.snapshot;
  const items = (snapshot?.items ?? []).filter((i) => i && i.name);
  const created = new Date(data.created_at).toLocaleDateString();

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-xs font-semibold text-primary hover:underline">
            DoseRoutine
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Share2 className="h-3 w-3" /> Shared link · read-only
          </span>
        </div>

        <header className="mt-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {data.title || snapshot?.title || "Shared stack"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Shared on {created} · {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </header>

        <div
          role="note"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground/90"
        >
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              For information only — not medical advice.
            </p>
            <p className="mt-1 text-foreground/80">
              Someone else's stack is not a prescription. Talk to your own doctor or pharmacist
              before starting anything new.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="mt-8 rounded-2xl border-border p-8 text-center text-sm text-muted-foreground">
            This shared stack is empty.
          </Card>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((it, i) => (
              <li
                key={`${it.name}-${i}`}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <p className="truncate font-display text-base font-semibold">{it.name}</p>
                    </div>
                    {it.category && (
                      <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
                        {it.category}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-medium">{formatDose(it)}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{formatFrequency(it)}</p>
                {it.cycle_on_days ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cycle: {it.cycle_on_days} on / {it.cycle_off_days ?? 0} off
                  </p>
                ) : null}
                {it.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {it.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <Card className="mt-10 rounded-2xl border-border p-5 text-center">
          <p className="text-sm font-semibold">Build your own stack in DoseRoutine</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Free plan available. Track doses, get reminders, check interactions.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[color:var(--primary-hover)]"
          >
            Try DoseRoutine free
          </Link>
        </Card>
      </div>
    </main>
  );
}
