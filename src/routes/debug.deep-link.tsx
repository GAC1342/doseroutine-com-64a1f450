import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Link2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isNative } from "@/lib/platform";
import {
  clearDeepLinkLog,
  describeDeepLink,
  readDeepLinkLog,
  recordDeepLink,
  type DeepLinkEntry,
} from "@/lib/deep-link-log";

const TITLE = "Deep Link Diagnostics — DoseRoutine";
const DESC =
  "Internal diagnostics: shows the URL that opened the app, whether it arrived as a universal link or custom scheme, and whether it was handled in-app.";

export const Route = createFileRoute("/debug/deep-link")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DeepLinkDebugPage,
});

function EntryRow({ entry }: { entry: DeepLinkEntry }) {
  return (
    <li className="border-b border-border py-3 last:border-b-0" data-testid="deep-link-entry">
      <div className="flex items-start gap-3">
        {entry.handled ? (
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <XCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium break-all text-foreground">{entry.url}</p>
          <p className="text-sm text-muted-foreground">
            {entry.handled ? "Handled in-app" : "Not handled"} ·{" "}
            {entry.universal ? "Universal link (https)" : "Custom scheme"} · source: {entry.source}
          </p>
          <p className="text-sm break-all text-muted-foreground">
            Resolved path: {entry.path ?? "—"}
          </p>
          {entry.reason && (
            <p className="text-sm break-words text-amber-700 dark:text-amber-400">{entry.reason}</p>
          )}
          <p className="text-xs text-muted-foreground">{new Date(entry.at).toLocaleString()}</p>
        </div>
      </div>
    </li>
  );
}

function DeepLinkDebugPage() {
  const [entries, setEntries] = useState<DeepLinkEntry[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [test, setTest] = useState("https://doseroutine.com/today");

  const refresh = useCallback(() => setEntries(readDeepLinkLog()), []);

  useEffect(() => {
    setCurrent(window.location.href);
    refresh();
  }, [refresh]);

  const preview = test.trim() ? describeDeepLink(test.trim(), "web") : null;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <Link2 className="h-6 w-6" aria-hidden="true" />
          Deep link diagnostics
        </h1>
        <p className="text-sm text-muted-foreground">
          Open any doseroutine.com link on the device, then come back here to see exactly what the
          app received and whether it was routed in-app.
        </p>
      </header>

      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-foreground">Current context</h2>
        <p className="text-sm break-all text-muted-foreground">URL: {current || "—"}</p>
        <p className="text-sm text-muted-foreground">
          Runtime: {isNative() ? "Native app shell" : "Web browser"}
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Test a URL</h2>
        <Input
          value={test}
          onChange={(e) => setTest(e.target.value)}
          aria-label="URL to classify"
          placeholder="https://doseroutine.com/today"
        />
        {preview && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Would be handled in-app: {preview.path ? "Yes" : "No"}</p>
            <p className="break-all">Resolved path: {preview.path ?? "—"}</p>
            <p>{preview.universal ? "Universal link (https)" : "Custom scheme"}</p>
            {preview.reason && (
              <p className="text-amber-700 dark:text-amber-400">{preview.reason}</p>
            )}
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!test.trim()) return;
            recordDeepLink(test.trim(), "web");
            refresh();
          }}
        >
          Log this URL
        </Button>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Recent opens ({entries.length})</h2>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={refresh}>
              Refresh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                clearDeepLinkLog();
                refresh();
              }}
            >
              Clear
            </Button>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="pt-3 text-sm text-muted-foreground">
            No links recorded yet on this device.
          </p>
        ) : (
          <ul className="pt-2">
            {entries.map((entry, i) => (
              <EntryRow key={`${entry.at}-${i}`} entry={entry} />
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
