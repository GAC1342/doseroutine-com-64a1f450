/**
 * First-run permission onboarding state for refill-reminder alerts.
 *
 * We never fire the OS permission prompt cold: iOS/Android only allow one
 * chance, and a denied prompt is unrecoverable in-app. This module records
 * whether the explainer has been shown/answered so the card can prompt once,
 * clearly, and then stay out of the way.
 */

export type OnboardingStage = "pending" | "asked" | "granted" | "dismissed" | "blocked";

export type OnboardingState = {
  stage: OnboardingStage;
  updatedAt: string;
};

export const ONBOARDING_KEY = "dr.refill-alerts.onboarding.v1";

export function defaultOnboarding(): OnboardingState {
  return { stage: "pending", updatedAt: new Date(0).toISOString() };
}

export function loadOnboarding(): OnboardingState {
  if (typeof window === "undefined") return defaultOnboarding();
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return defaultOnboarding();
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    const stages: OnboardingStage[] = ["pending", "asked", "granted", "dismissed", "blocked"];
    const stage = stages.includes(parsed.stage as OnboardingStage)
      ? (parsed.stage as OnboardingStage)
      : "pending";
    return {
      stage,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return defaultOnboarding();
  }
}

export function saveOnboarding(stage: OnboardingStage): OnboardingState {
  const next: OnboardingState = { stage, updatedAt: new Date().toISOString() };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
  return next;
}

/**
 * Show the explainer until the user has either granted alerts or explicitly
 * dismissed it. "blocked" keeps showing, because that card carries the
 * Settings instructions they need.
 */
export function shouldShowOnboarding(state: OnboardingState, permissionGranted: boolean): boolean {
  if (permissionGranted) return false;
  return state.stage !== "dismissed" && state.stage !== "granted";
}
