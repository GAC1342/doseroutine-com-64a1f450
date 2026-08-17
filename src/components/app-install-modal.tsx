import { useEffect, useRef, useState } from "react";
import { X, Smartphone, Mail, ArrowRight, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { joinAppLaunchWaitlist } from "@/lib/app-launch.functions";
import { trackEvent } from "@/lib/analytics";

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac|win|linux/.test(ua)) return "desktop";
  return "unknown";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS standalone mode
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface AppInstallModalProps {
  onClose: () => void;
  source: string;
}

export function AppInstallModal({ onClose, source }: AppInstallModalProps) {
  const [platform] = useState<Platform>(detectPlatform());
  const [isStandaloneApp] = useState<boolean>(isStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [promptOutcome, setPromptOutcome] = useState<"accepted" | "dismissed" | null>(null);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "submitting" | "success" | "already" | "error"
  >("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const submitWaitlist = useServerFn(joinAppLaunchWaitlist);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackEvent("app_install_modal_shown", { source, platform });

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire beforeinstallprompt; the modal already shows manual steps.
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [source, platform]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInstall = async () => {
    trackEvent("app_install_modal_install_click", { source, platform });

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setPromptOutcome(choice.outcome);
      trackEvent("app_install_modal_prompt_outcome", {
        source,
        platform,
        outcome: choice.outcome,
      });
      if (choice.outcome === "accepted") {
        setTimeout(() => onClose(), 1200);
      }
      return;
    }

    // No native prompt available — scroll to the email section or copy link.
    if (platform === "desktop") {
      inputRef.current?.focus();
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email.");
      return;
    }

    setEmailStatus("submitting");
    try {
      const res = await submitWaitlist({
        data: {
          email: trimmed,
          platform: platform === "unknown" ? "other" : platform,
          utmSource: source,
        },
      });
      if (res.ok) {
        setEmailStatus("success");
        trackEvent("app_launch_waitlist_submit", { source, platform });
      } else if (res.error === "already_signed_up") {
        setEmailStatus("already");
      } else {
        setEmailStatus("error");
      }
    } catch {
      setEmailStatus("error");
    }
  };

  const dismiss = () => {
    trackEvent("app_install_modal_close", { source, platform });
    onClose();
  };

  if (isStandaloneApp) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <h3 className="font-display text-xl font-semibold">You&apos;re already in the app</h3>
            <button
              type="button"
              onClick={dismiss}
              className="tap-target rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            DoseRoutine is running from your home screen. You can close this and keep tracking.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="tap-target mt-6 w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">Get DoseRoutine on your phone</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              iPhone and Android apps are in final review. For now, add the web app to your home
              screen.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="tap-target -mr-2 -mt-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {platform === "ios" && "Add to Home Screen on iPhone"}
                {platform === "android" && "Add to Home Screen on Android"}
                {platform === "desktop" && "Open this page on your phone to install"}
                {platform === "unknown" && "Add to Home Screen"}
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                {platform === "ios" ? (
                  <>
                    <li>Tap the Share button in Safari.</li>
                    <li>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong>.
                    </li>
                  </>
                ) : platform === "android" ? (
                  <>
                    <li>Tap the ⋮ menu in Chrome.</li>
                    <li>
                      Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong>.
                    </li>
                  </>
                ) : (
                  <>
                    <li>On your phone, open doseroutine.com.</li>
                    <li>Use your browser&apos;s Share or ⋮ menu.</li>
                    <li>
                      Tap <strong>Add to Home Screen</strong>.
                    </li>
                  </>
                )}
              </ol>
            </div>
          </div>

          {platform !== "ios" && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={promptOutcome === "dismissed"}
              className="tap-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--primary-hover)] disabled:opacity-60"
            >
              {deferredPrompt ? (
                <>
                  Add DoseRoutine now <ArrowRight className="h-4 w-4" />
                </>
              ) : promptOutcome === "accepted" ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : (
                <>
                  Open install instructions <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-foreground">Get notified when store apps launch</p>
          <p className="text-xs text-muted-foreground">
            Be the first to know when DoseRoutine hits the App Store and Google Play.
          </p>

          {emailStatus === "success" || emailStatus === "already" ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
              <Check className="h-4 w-4" />
              {emailStatus === "already"
                ? "You're already on the list — we'll email you at launch."
                : "You're on the list — we'll email you at launch."}
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={emailStatus === "submitting"}
                className="tap-target inline-flex items-center justify-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-sm font-semibold text-cta-foreground transition-colors hover:bg-cta-hover disabled:opacity-60"
              >
                {emailStatus === "submitting" ? "Joining…" : "Notify me"}
              </button>
            </form>
          )}
          {emailError && <p className="mt-2 text-xs text-destructive">{emailError}</p>}
          {emailStatus === "error" && !emailError && (
            <p className="mt-2 text-xs text-destructive">Something went wrong. Please try again.</p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          No spam. Unsubscribe anytime.{" "}
          <a href="mailto:support@doseroutine.com" className="text-primary underline">
            support@doseroutine.com
          </a>
        </p>
      </div>
    </div>
  );
}
