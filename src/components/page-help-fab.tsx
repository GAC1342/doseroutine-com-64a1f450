import { useRouterState } from "@tanstack/react-router";
import { HelpButton } from "@/components/help-button";
import { HELP } from "@/lib/help-articles";

// Map an authenticated route pathname → help-articles.ts key.
// Only routes listed here get the floating "How to use" button.
const ROUTE_TO_HELP: Record<string, keyof typeof HELP> = {
  "/today": "today",
  "/stack": "stack",
  "/timeline": "today",
  "/reminders": "reminders",
  "/chat": "aiCoach",
  "/labs": "labs",
  "/templates": "templates",
  "/injection-sites": "injectionSites",
  "/cycles": "cycles",
  "/costs": "costs",
  "/side-effects": "sideEffects",
  "/doctor-report": "doctorReport",
  "/progress-photos": "progressPhotos",
  "/export": "export",
  "/scan": "scan",
  "/plan": "aiCoach",
  "/interaction-checker": "interactions",
  "/peptide-interaction-checker": "interactions",
  "/reconstitution-calculator": "reconstitution",
  "/peptide-reconstitution-calculator": "reconstitution",
  "/peptide-dosage-calculator": "reconstitution",
  "/trt-dosage-calculator": "reconstitution",
  "/calculator": "reconstitution",
  "/calculators": "reconstitution",
};

export function PageHelpFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Prefer exact match; fall back to first segment prefix match.
  let key = ROUTE_TO_HELP[pathname];
  if (!key) {
    for (const [route, k] of Object.entries(ROUTE_TO_HELP)) {
      if (pathname.startsWith(route + "/")) {
        key = k;
        break;
      }
    }
  }
  if (!key) return null;
  return <HelpButton articleKey={key} variant="fab" />;
}
