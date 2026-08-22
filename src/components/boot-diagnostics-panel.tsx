import { useEffect, useState } from "react";
import { ChevronDown, Copy } from "lucide-react";
import {
  BOOT_STEP_LABELS,
  bootDiagnosticsSummary,
  getBootSteps,
  subscribeBootSteps,
  type BootStep,
} from "@/lib/boot-diagnostics";

const STATUS_TEXT: Record<BootStep["status"], string> = {
  ok: "Done",
  skipped: "Skipped",
  stalled: "No response",
  failed: "Failed",
};

const STATUS_CLASS: Record<BootStep["status"], string> = {
  ok: "text-emerald-700 dark:text-emerald-300",
  skipped: "text-muted-foreground",
  stalled: "text-amber-700 dark:text-amber-300",
  failed: "text-destructive",
};

/**
 * Shows the sanitized offline-boot trail on the recovery screen so the user
 * can see which step failed and why, without exposing stack traces or URLs.
 */
export function BootDiagnosticsPanel() {
  const [steps, setSteps] = useState<BootStep[]>(() => getBootSteps());
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSteps(getBootSteps());
    return subscribeBootSteps(() => setSteps(getBootSteps()));
  }, []);

  if (steps.length === 0) return null;

  return (
    <div data-testid="boot-diagnostics" className="mt-6 w-full text-left">
      <button
        type="button"
        data-testid="boot-diagnostics-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="tap-target flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium"
      >
        What happened?
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-border bg-muted/40 p-3">
          <ol data-testid="boot-diagnostics-steps" className="space-y-2">
            {steps.map((step, i) => (
              <li
                key={`${step.id}-${i}`}
                className="flex items-start justify-between gap-3 text-xs"
              >
                <span>
                  <span className="font-medium text-foreground">{BOOT_STEP_LABELS[step.id]}</span>
                  <span className="block text-muted-foreground">{step.message}</span>
                </span>
                <span className={`shrink-0 font-medium ${STATUS_CLASS[step.status]}`}>
                  {STATUS_TEXT[step.status]}
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            data-testid="boot-diagnostics-copy"
            onClick={() => {
              void navigator.clipboard?.writeText(bootDiagnosticsSummary());
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="tap-target mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {copied ? "Copied" : "Copy for support"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
