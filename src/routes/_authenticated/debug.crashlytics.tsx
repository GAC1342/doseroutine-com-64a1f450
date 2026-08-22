import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Bug, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordCrashlyticsError } from "@/lib/crashlytics";
import { isNative } from "@/lib/platform";
import { toast } from "sonner";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/debug/crashlytics")({
  errorComponent: routeErrorComponent("debug-crashlytics"),
  head: () => ({
    meta: [
      { title: "Crash reporting debug — DoseRoutine" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CrashReportingDebug,
});

function CrashReportingDebug() {
  const native = isNative();
  const [sentNonFatal, setSentNonFatal] = useState(false);

  async function handleNonFatal() {
    await recordCrashlyticsError("DoseRoutine test non-fatal event", {
      trigger: "debug_screen",
      timestamp: new Date().toISOString(),
    });
    setSentNonFatal(true);
    toast.success("Non-fatal event sent. Check Admin → Health in a few minutes.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold">Crash reporting test</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Internal-only screen for confirming error reporting end to end. Not linked from any menu.
        </p>
      </header>

      <section className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Firebase Crashlytics has been removed</p>
            <p>
              The native Firebase plugins aborted the app at launch when no Firebase config file was
              bundled. Reporting now uses the first-party monitor shown in Admin → Health.
            </p>
            <p>
              Current runtime: <strong>{native ? "Native app" : "Web browser"}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h2 className="text-lg font-semibold">Send non-fatal event</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Logs a handled error without affecting the app. It should show up in the health dashboard
          shortly.
        </p>
        <Button onClick={handleNonFatal} variant="outline" className="w-full sm:w-auto">
          Send test non-fatal
        </Button>
        {sentNonFatal ? (
          <p className="text-xs text-muted-foreground">
            Sent. View it under Admin → Health → recent client errors.
          </p>
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        There is deliberately no “force a crash” action any more: shipping code must contain no path
        that intentionally terminates the app.
      </p>
    </div>
  );
}
