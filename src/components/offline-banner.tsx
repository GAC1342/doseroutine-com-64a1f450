import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { subscribeQueue, flushQueue, installOfflineFlusher } from "@/lib/offline-queue";

/**
 * Small pill that appears in the auth shell when we're offline or have
 * queued dose logs waiting to sync. Auto-hides when the queue drains.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    installOfflineFlusher();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const unsub = subscribeQueue(setQueued);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      unsub();
    };
  }, []);

  if (online && queued === 0) return null;

  async function retry() {
    setSyncing(true);
    try {
      await flushQueue();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="pointer-events-auto fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-40 mx-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-lg">
      <CloudOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="font-medium">
        {online
          ? `Syncing ${queued} dose${queued === 1 ? "" : "s"}…`
          : queued > 0
            ? `Offline · ${queued} queued`
            : "Offline"}
      </span>
      {online && queued > 0 && (
        <button
          type="button"
          onClick={retry}
          disabled={syncing}
          className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary disabled:opacity-50"
          aria-label="Retry sync now"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          Retry
        </button>
      )}
    </div>
  );
}
