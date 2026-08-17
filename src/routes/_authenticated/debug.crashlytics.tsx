import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Bug, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { forceCrashlyticsCrash, recordCrashlyticsError } from "@/lib/crashlytics";
import { isNative } from "@/lib/platform";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/debug/crashlytics")({
  head: () => ({
    meta: [
      { title: "Crashlytics Debug — DoseRoutine" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CrashlyticsDebug,
});

function CrashlyticsDebug() {
  const native = isNative();
  const [armed, setArmed] = useState(false);
  const [sentNonFatal, setSentNonFatal] = useState(false);

  async function handleNonFatal() {
    await recordCrashlyticsError("DoseRoutine test non-fatal event", {
      trigger: "debug_screen",
      timestamp: new Date().toISOString(),
    });
    setSentNonFatal(true);
    toast.success(
      native
        ? "Non-fatal event sent. Check Firebase → Crashlytics in ~5 minutes."
        : "Web build — call is a no-op. Run on a native TestFlight/Play build.",
    );
  }

  async function handleCrash() {
    if (!armed) {
      setArmed(true);
      toast.warning("Tap again to force the crash. The app will close.");
      return;
    }
    await forceCrashlyticsCrash();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold">Crashlytics Test</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Internal-only screen for confirming Firebase Crashlytics end-to-end reporting before real
          users are affected. Not linked from any menu.
        </p>
      </header>

      <section className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Native builds only</p>
            <p>
              Crashlytics reports come from the iOS/Android app. On the web preview both actions
              safely no-op.
            </p>
            <p>
              Current runtime: <strong>{native ? "Native app" : "Web browser"}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
          <h2 className="text-lg font-semibold">1. Send non-fatal event</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Safe first check — logs a handled error to Crashlytics without closing the app. Should
          appear in the dashboard within ~5 minutes.
        </p>
        <Button onClick={handleNonFatal} variant="outline" className="w-full sm:w-auto">
          Send test non-fatal
        </Button>
        {sentNonFatal ? (
          <p className="text-xs text-muted-foreground">
            Sent. If it does not appear in Firebase within 10 minutes, verify
            <code className="mx-1">GoogleService-Info.plist</code> /
            <code className="mx-1">google-services.json</code> are in the build.
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-destructive" aria-hidden />
          <h2 className="text-lg font-semibold">2. Force a fatal crash</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Terminates the app process on purpose. The crash uploads on the next launch, so{" "}
          <strong>reopen the app after tapping</strong>. Only run this from an internal test device.
        </p>
        <Button
          onClick={handleCrash}
          variant="destructive"
          className="w-full sm:w-auto"
          disabled={!native}
        >
          {armed ? "Tap again to crash the app" : "Arm test crash"}
        </Button>
        {!native ? (
          <p className="text-xs text-muted-foreground">
            Disabled on web. Install a TestFlight or Play internal build.
          </p>
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        Route: <code className="rounded bg-muted px-1 py-0.5">/debug/crashlytics</code> — hidden by
        design. Share the URL only with internal testers.
      </p>
    </div>
  );
}
