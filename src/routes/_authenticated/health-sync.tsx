import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, CheckCircle2, Clock, Watch } from "lucide-react";
import { isNative } from "@/lib/platform";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/health-sync")({
  head: () => ({
    meta: [
      { title: "Health Sync — DoseRoutine" },
      {
        name: "description",
        content:
          "Connect DoseRoutine with Apple Health, Google Fit, and Health Connect. Sync weight, workouts, and dose events to your watch.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HealthSyncPage,
});

type Platform = "ios" | "android" | "web";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

function HealthSyncPage() {
  const [platform, setPlatform] = useState<Platform>("web");
  const [native, setNative] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setNative(isNative());
  }, []);

  const targetName =
    platform === "ios"
      ? "Apple Health"
      : platform === "android"
        ? "Health Connect / Google Fit"
        : "Apple Health & Health Connect";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <Link
        to="/more"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Health Sync</h1>
          <p className="text-sm text-muted-foreground">{targetName}</p>
        </div>
      </div>

      {/* Status */}
      <Card className="mb-6 rounded-2xl border-border p-5">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Available in the native app</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Apple Health and Google&apos;s Health Connect are phone-only APIs — they can&apos;t be
          reached from a web browser.
          {native
            ? " You're on the native app, and the bridge will light up in the next TestFlight / Play update."
            : " Once you install DoseRoutine from the App Store or Google Play, this page turns on automatically."}
        </p>
      </Card>

      {/* Watch alerts — already works */}
      <Card className="mb-6 rounded-2xl border-border p-5">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium">Watch alerts already work</span>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          Apple Watch, Wear OS, and Garmin devices already buzz for every scheduled dose — no extra
          setup. DoseRoutine writes each dose as a calendar event, and your phone mirrors those
          alerts to your watch.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Watch className="h-3.5 w-3.5" />
          <span>Add to calendar from Stack → any compound → &ldquo;Export .ics&rdquo;</span>
        </div>
      </Card>

      {/* What will sync */}
      <Card className="mb-6 rounded-2xl border-border p-5">
        <h2 className="mb-3 text-sm font-semibold">What will sync (native release)</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">→</span>{" "}
            <span>
              <b className="text-foreground">Body weight</b> from Check-ins → Health app
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">→</span>{" "}
            <span>
              <b className="text-foreground">Workouts</b> logged in DoseRoutine → Health app
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">→</span>{" "}
            <span>
              <b className="text-foreground">Waist / body-fat</b> check-ins → Health app
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">→</span>{" "}
            <span>
              <b className="text-foreground">Dose events</b> as medication records (iOS 16+ / Health
              Connect)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">←</span>{" "}
            <span>
              <b className="text-foreground">Read</b> steps, resting HR, sleep to enrich your
              consistency dashboard
            </span>
          </li>
        </ul>
      </Card>

      {/* Setup once available */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5">
        <h2 className="mb-2 text-sm font-semibold">When the native app ships</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Open DoseRoutine on your phone</li>
          <li>
            Tap <span className="font-medium text-foreground">More → Health Sync</span>
          </li>
          <li>Grant permissions (iOS asks per data type; Android via Health Connect)</li>
          <li>Data syncs on every save — no manual step</li>
        </ol>
      </div>
    </div>
  );
}
