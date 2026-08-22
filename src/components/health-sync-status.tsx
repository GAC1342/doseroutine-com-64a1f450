/**
 * In-app Apple Health / Health Connect sync status panel.
 *
 * Shows when the last sync ran, what each data type did, and — when something
 * failed — a plain-English explanation of the exact failure plus the fix.
 * Retryable failures are retried automatically with capped exponential
 * backoff, and the panel counts down to the next attempt so the user is never
 * left wondering whether anything is still happening.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isHealthAvailable, type HealthScope } from "@/lib/health-bridge";
import {
  getLastSyncResult,
  runHealthSync,
  syncErrors,
  type MetricSyncStatus,
  type SyncResult,
} from "@/lib/health-sync";
import {
  classifyHealthError,
  describeCountdown,
  MAX_AUTO_ATTEMPTS,
  nextRetryAt,
  shouldAutoRetry,
} from "@/lib/health-sync-retry";

const SCOPE_LABEL: Record<HealthScope, string> = {
  weight: "Body weight",
  steps: "Steps",
  activeEnergy: "Active energy",
  heartRate: "Heart rate",
  workouts: "Workouts",
  nutrition: "Nutrition",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Unknown";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function MetricRow({ metric }: { metric: MetricSyncStatus }) {
  const label = SCOPE_LABEL[metric.scope] ?? metric.scope;
  return (
    <li className="flex items-start justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0">
      <span className="flex items-center gap-2">
        {!metric.attempted ? (
          <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : metric.ok ? (
          <CheckCircle2
            className="h-4 w-4 text-[color:var(--severity-synergy)]"
            aria-hidden="true"
          />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
        )}
        <span>{label}</span>
      </span>
      <span className="text-right text-xs text-muted-foreground">
        {!metric.attempted
          ? "Not permitted"
          : metric.ok
            ? `${metric.count} item${metric.count === 1 ? "" : "s"}`
            : classifyHealthError(metric.reason).title}
      </span>
    </li>
  );
}

export function HealthSyncStatus({ className }: { className?: string }) {
  const [result, setResult] = useState<SyncResult | null>(null);
  const [running, setRunning] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryAt, setRetryAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setResult(getLastSyncResult());
    void isHealthAvailable().then(setAvailability);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Drives the countdown label.
  useEffect(() => {
    if (!retryAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [retryAt]);

  const sync = useCallback(async (attemptNumber: number) => {
    setRunning(true);
    setFatalError(null);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in again to sync your Health data.");
      const next = await runHealthSync(uid);
      setResult(next);
      const errors = syncErrors(next);
      const nextAttempt = attemptNumber + 1;
      setAttempt(errors.length ? nextAttempt : 0);
      if (errors.length && shouldAutoRetry(nextAttempt, errors)) {
        const at = nextRetryAt(nextAttempt);
        setRetryAt(at);
        if (at) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(
            () => {
              setRetryAt(null);
              void sync(nextAttempt);
            },
            Math.max(0, at.getTime() - Date.now()),
          );
        }
      } else {
        setRetryAt(null);
      }
    } catch (e) {
      setFatalError(e instanceof Error ? e.message : "Sync failed for an unknown reason.");
      setRetryAt(null);
    } finally {
      setRunning(false);
    }
  }, []);

  const retryNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRetryAt(null);
    setAttempt(0);
    void sync(0);
  }, [sync]);

  const errors = syncErrors(result);

  return (
    <Card className={`rounded-2xl border-border p-5 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Sync status</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {result ? `Last sync ${relativeTime(result.ranAt)}` : "Not synced yet on this device"}
          </p>
          {result && (
            <p className="text-xs text-muted-foreground">
              {new Date(result.ranAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button type="button" size="sm" onClick={retryNow} disabled={running}>
          {running ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
          )}
          {running ? "Syncing…" : "Retry sync"}
        </Button>
      </div>

      {running && (
        <p role="status" aria-live="polite" className="sr-only">
          Syncing Health data
        </p>
      )}

      {retryAt && !running && (
        <p
          role="status"
          aria-live="polite"
          data-testid="health-sync-retry-countdown"
          className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"
        >
          Attempt {attempt} of {MAX_AUTO_ATTEMPTS} failed. Retrying automatically{" "}
          {describeCountdown(retryAt.getTime() - now)} (
          {retryAt.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          })}
          ).
        </p>
      )}

      {availability && !availability.available && (
        <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          {availability.reason ?? "Health sync isn't available on this device."}
        </p>
      )}

      {fatalError && (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {fatalError}
        </div>
      )}

      {result && (
        <ul className="mt-3">
          {result.metrics.map((m) => (
            <MetricRow key={m.scope} metric={m} />
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <details className="mt-3 rounded-xl border border-border p-3 text-xs" open>
          <summary className="cursor-pointer font-medium">
            What went wrong ({errors.length})
          </summary>
          <ul className="mt-2 space-y-3">
            {errors.map((e) => {
              const info = classifyHealthError(e.reason);
              return (
                <li key={e.scope} className="space-y-0.5">
                  <p className="font-medium text-foreground">
                    {SCOPE_LABEL[e.scope] ?? e.scope}: {info.title}
                  </p>
                  <p className="text-muted-foreground">{info.explanation}</p>
                  <p className="text-muted-foreground">{info.fix}</p>
                  {info.raw && info.raw !== info.explanation && (
                    <p className="text-muted-foreground/80">Details: {info.raw}</p>
                  )}
                  {!info.retryable && (
                    <p className="text-muted-foreground/80">
                      Automatic retries won&apos;t help with this one.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </Card>
  );
}
