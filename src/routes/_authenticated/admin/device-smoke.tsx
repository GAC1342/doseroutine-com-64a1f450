import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Smartphone, Tablet, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { routeErrorComponent } from "@/components/route-error-panel";
import results from "@/data/device-smoke-results.json";

export const Route = createFileRoute("/_authenticated/admin/device-smoke")({
  errorComponent: routeErrorComponent("admin-device-smoke"),
  head: () => ({
    meta: [
      { title: "Device smoke tests — DoseRoutine admin" },
      {
        name: "description",
        content:
          "Aggregated iOS and Android keyboard and navigation smoke-test results before hardware verification.",
      },
      { property: "og:title", content: "Device smoke tests — DoseRoutine admin" },
      { property: "og:description", content: "iOS and Android smoke-test results in one view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DeviceSmokePage,
});

type Assertion = (typeof results.assertions)[number];

/** GitHub-style deep link to the exact assertion so a failure is one click away. */
function sourceHref(a: Assertion) {
  return `/lovable/source?file=${encodeURIComponent(a.file)}&line=${a.line}`;
}

function PlatformIcon({ platform }: { platform: string }) {
  return platform === "android" ? (
    <Tablet className="h-4 w-4" aria-hidden />
  ) : (
    <Smartphone className="h-4 w-4" aria-hidden />
  );
}

function Group({ platform, items }: { platform: string; items: Assertion[] }) {
  const failed = items.filter((i) => !i.ok);
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <PlatformIcon platform={platform} />
        {platform === "android" ? "Android" : "iOS"}
        <span className="text-muted-foreground text-sm font-normal">
          {items.length - failed.length}/{items.length} passing
        </span>
      </h2>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={`${a.file}:${a.line}:${a.title}`}>
            <Card
              className={`p-3 ${a.ok ? "" : "border-destructive/60 bg-destructive/5"}`}
              data-assertion-status={a.ok ? "passed" : "failed"}
            >
              <div className="flex items-start gap-3">
                {a.ok ? (
                  <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <XCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">{a.title}</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs break-all">
                    <a className="hover:underline" href={sourceHref(a)}>
                      {a.file}:{a.line}
                    </a>
                    {a.durationMs ? ` · ${Math.round(a.durationMs)} ms` : ""}
                  </p>
                  {a.error ? (
                    <pre className="bg-muted text-destructive mt-2 overflow-x-auto rounded p-2 text-xs whitespace-pre-wrap">
                      {a.error}
                    </pre>
                  ) : null}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeviceSmokePage() {
  const all = results.assertions as Assertion[];
  const ios = all.filter((a) => a.platform === "ios");
  const android = all.filter((a) => a.platform === "android");
  const generated = new Date(results.generatedAt);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <Link to="/admin" className="text-muted-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Admin
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Device smoke tests</h1>
        <p className="text-muted-foreground text-sm">
          Emulated iOS and Android keyboard, bottom-control, and in-app navigation checks. Run{" "}
          <code className="font-mono">npm run smoke:devices</code> to refresh, then work through{" "}
          <code className="font-mono">docs/ios-device-smoke-checklist.md</code> on hardware.
        </p>
      </header>

      <Card className="flex flex-wrap items-center gap-4 p-4">
        <div>
          <p className="text-2xl font-bold">
            {results.passed}/{results.total}
          </p>
          <p className="text-muted-foreground text-xs">assertions passing</p>
        </div>
        <div>
          <p className={`text-2xl font-bold ${results.failed ? "text-destructive" : ""}`}>
            {results.failed}
          </p>
          <p className="text-muted-foreground text-xs">failing</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-medium">{generated.toLocaleString()}</p>
          <p className="text-muted-foreground text-xs">last collected</p>
        </div>
      </Card>

      <Group platform="ios" items={ios} />
      <Group platform="android" items={android} />

      <Card className="p-4">
        <h2 className="text-sm font-semibold">What emulation cannot prove</h2>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Real UIKit predictive-text resize loops and hardware keyboards.</li>
          <li>Edge-swipe back gestures and universal-link cold starts.</li>
          <li>Airplane-mode fresh install and first-run permission prompts.</li>
        </ul>
      </Card>
    </div>
  );
}
