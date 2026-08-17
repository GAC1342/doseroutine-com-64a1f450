import { supabase } from "@/integrations/supabase/client";
import { reportLovableError } from "@/lib/lovable-error-reporting";

// Client-side breadcrumb logging for the onboarding "Finish" flow.
// Every step of handleFinish writes a row so we can see exactly where a user
// stalls (and which page they end up stuck on) without asking them.

export type OnboardingEventName =
  | "finish_click"
  | "profile_update_ok"
  | "profile_update_error"
  | "gate_refresh_ok"
  | "gate_refresh_error"
  | "navigate_start"
  | "navigate_ok"
  | "navigate_error"
  | "landing_check"
  | "stuck"
  | "window_error"
  | "unhandled_rejection";

type LogInput = {
  userId: string;
  event: OnboardingEventName;
  step?: string | null;
  ok?: boolean | null;
  errorMessage?: string | null;
  elapsedMs?: number | null;
  landingPath?: string | null;
  details?: Record<string, unknown> | null;
};

function currentPath(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.pathname + window.location.search;
}

/**
 * Fire-and-forget. Never throws — telemetry must not break onboarding.
 */
export function logOnboardingEvent(input: LogInput): void {
  if (typeof window === "undefined") return;
  const row = {
    user_id: input.userId,
    event: input.event,
    step: input.step ?? null,
    path: currentPath(),
    landing_path: input.landingPath ?? null,
    ok: input.ok ?? null,
    error_message: input.errorMessage ? String(input.errorMessage).slice(0, 1000) : null,
    elapsed_ms: input.elapsedMs ?? null,
    user_agent: navigator.userAgent.slice(0, 500),
    details: (input.details ?? null) as never,
  };

  // Console breadcrumb so the editor/runtime log captures it too.
  console.info("[onboarding]", input.event, row);

  void supabase
    .from("onboarding_events")
    .insert(row)
    .then(({ error }) => {
      if (error) console.warn("[onboarding] telemetry insert failed:", error.message);
    });
}

/**
 * Captures window errors and unhandled promise rejections while the Finish
 * flow is running, and forwards them to both the DB log and Lovable capture.
 * Returns a cleanup function.
 */
export function captureOnboardingErrors(userId: string): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (e: ErrorEvent) => {
    logOnboardingEvent({
      userId,
      event: "window_error",
      ok: false,
      errorMessage: e.message,
      details: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
    reportLovableError(e.error ?? new Error(e.message), { source: "onboarding_finish" });
  };

  const onRejection = (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    logOnboardingEvent({
      userId,
      event: "unhandled_rejection",
      ok: false,
      errorMessage: reason instanceof Error ? reason.message : String(reason),
    });
    reportLovableError(reason, { source: "onboarding_finish" });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

/**
 * Watchdog: after navigation is requested, confirm the user actually landed
 * somewhere other than /onboarding and that the page rendered content.
 * Logs a "stuck" row (with the page they're stuck on) when it did not work.
 */
export function watchOnboardingLanding(
  userId: string,
  expectedPath: string,
  startedAt: number,
): void {
  if (typeof window === "undefined") return;

  const check = (delayMs: number, final: boolean) => {
    window.setTimeout(() => {
      const path = window.location.pathname;
      const bodyText = document.body?.innerText?.trim() ?? "";
      const blank = bodyText.length < 20;
      const arrived = path.startsWith(expectedPath);

      if (arrived && !blank) {
        if (!final) return;
        logOnboardingEvent({
          userId,
          event: "landing_check",
          ok: true,
          landingPath: path,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
        return;
      }

      if (!final) return;
      logOnboardingEvent({
        userId,
        event: "stuck",
        ok: false,
        landingPath: path,
        elapsedMs: Math.round(performance.now() - startedAt),
        errorMessage: blank ? "Blank screen after Finish" : `Did not reach ${expectedPath}`,
        details: { expectedPath, blank, bodyChars: bodyText.length },
      });
      reportLovableError(
        new Error(
          blank
            ? `Onboarding finish: blank screen at ${path}`
            : `Onboarding finish: stuck at ${path}, expected ${expectedPath}`,
        ),
        { source: "onboarding_finish", path, expectedPath },
      );
    }, delayMs);
  };

  check(1500, false);
  check(5000, true);
}
