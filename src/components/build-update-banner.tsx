import { useBuildUpdateCheck } from "@/lib/build-update";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function BuildUpdateBanner() {
  const { updateAvailable, reload } = useBuildUpdateCheck();
  if (!updateAvailable) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur"
    >
      <RefreshCw className="h-4 w-4 text-primary" aria-hidden />
      <span className="text-sm">A new version of DoseRoutine is available.</span>
      <Button size="sm" onClick={reload} className="rounded-full">
        Reload
      </Button>
    </div>
  );
}
