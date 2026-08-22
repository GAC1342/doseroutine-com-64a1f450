import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { BootDiagnosticsPanel } from "@/components/boot-diagnostics-panel";
import { recordBootStep } from "@/lib/boot-diagnostics";

/**
 * Recovery screen for offline / network failures.
 *
 * A generic "something went wrong" boundary is the wrong answer when the only
 * problem is a dropped connection: it looks like a bug, and the retry has no
 * idea whether it can succeed. This screen states the real cause, tracks
 * connectivity live, and offers an explicit "Try again" that is disabled while
 * the device is still offline.
 */
export function NetworkRecoveryScreen({
  onRetry,
  title = "You're offline",
  detail,
}: {
  onRetry: () => void;
  title?: string;
  detail?: string;
}) {
  const [online, setOnline] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    recordBootStep(
      "recovery-shown",
      "ok",
      navigator.onLine
        ? "Showed the connection problem screen"
        : "Showed the offline recovery screen",
    );
  }, []);

  function retry() {
    setRetrying(true);
    recordBootStep(
      "retry",
      navigator.onLine ? "ok" : "skipped",
      navigator.onLine ? "Retried loading the screen" : "Still offline, retry not sent",
    );
    try {
      onRetry();
    } finally {
      // Give the loaders a beat before re-enabling, so double taps don't stack.
      window.setTimeout(() => setRetrying(false), 600);
    }
  }

  return (
    <div
      data-testid="network-recovery"
      data-online={online ? "true" : "false"}
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center"
    >
      <div className="rounded-full bg-muted p-4">
        {online ? (
          <Wifi className="h-6 w-6 text-muted-foreground" aria-hidden />
        ) : (
          <CloudOff className="h-6 w-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <h1 className="mt-4 font-display text-2xl font-semibold">
        {online ? "Connection problem" : title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {detail ??
          (online
            ? "We couldn't reach DoseRoutine. Your data is safe — this is a connection issue, not a lost entry."
            : "Your device isn't connected right now. Anything you logged offline is saved and will sync once you're back.")}
      </p>
      <button
        type="button"
        data-testid="network-recovery-retry"
        onClick={retry}
        disabled={retrying}
        className="tap-target mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} /> Try again
      </button>
      {!online ? (
        <p className="mt-3 text-xs text-muted-foreground">
          We'll keep checking — reconnect and tap Try again.
        </p>
      ) : null}
      <BootDiagnosticsPanel />
    </div>
  );
}
