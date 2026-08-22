import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { checkClientEnv, checkServerEnv, type EnvCheckResult } from "@/lib/env-check";

const TITLE = "Environment Debug — DoseRoutine";
export const DESC =
  "Internal diagnostics: verifies required environment variables are present without exposing secret values.";

export const Route = createFileRoute("/debug/env")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EnvDebugPage,
});

function statusIcon(present: boolean) {
  return present ? (
    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
  ) : (
    <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
  );
}

function Row({ item }: { item: EnvCheckResult }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-3 pr-4 align-top">
        <div className="flex items-center gap-2">
          {statusIcon(item.present)}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-medium text-foreground">
            {item.key}
          </code>
          {item.required && !item.present && (
            <span className="inline-flex items-center rounded-full bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
              required
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4 align-top text-sm text-muted-foreground">{item.description}</td>
      <td className="py-3 align-top text-right text-sm tabular-nums text-muted-foreground">
        {item.present ? `${item.length} chars` : "missing"}
      </td>
    </tr>
  );
}

function Section({ title, items }: { title: string; items: EnvCheckResult[] }) {
  const missingRequired = items.filter((i) => i.required && !i.present);
  const presentCount = items.filter((i) => i.present).length;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">
          {presentCount} / {items.length} present
          {missingRequired.length > 0 && ` · ${missingRequired.length} required missing`}
        </span>
      </div>
      <table className="w-full">
        <thead className="sr-only">
          <tr>
            <th>Variable</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y px-4">
          {items.map((item) => (
            <Row key={item.key} item={item} />
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function EnvDebugPage() {
  const fetchServerEnv = useServerFn(checkServerEnv);
  const serverQuery = useQuery({
    queryKey: ["debug-server-env"],
    queryFn: () => fetchServerEnv(),
    retry: false,
  });
  const serverItems: EnvCheckResult[] = serverQuery.data ?? [];
  const clientItems = useMemo(() => checkClientEnv(), []);

  const allMissingRequired = [...serverItems, ...clientItems].filter(
    (i) => i.required && !i.present,
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Environment Debug</h1>
          <p className="mt-2 text-sm text-muted-foreground">{DESC}</p>
        </header>

        {allMissingRequired.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">Required variables missing</p>
              <p className="mt-1 text-sm">{allMissingRequired.map((i) => i.key).join(", ")}</p>
            </div>
          </div>
        )}

        {serverQuery.isError ? (
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-muted-foreground">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              Server diagnostics are restricted to signed-in administrators.
            </p>
          </div>
        ) : (
          <Section title="Server / SSR" items={serverItems} />
        )}
        <Section title="Client (Vite build-time)" items={clientItems} />

        <p className="text-xs text-muted-foreground">
          Secret values and lengths are never shown on this page. Server diagnostics list only
          whether a variable is present, and are visible to administrators only.
        </p>
      </div>
    </div>
  );
}
