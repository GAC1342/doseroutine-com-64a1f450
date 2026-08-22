/**
 * Contextual tips strip shown at the top of a Fitness tab.
 *
 * Renders nothing when nothing is missing — the point is to guide a half-set-up
 * profile, not to decorate a finished one.
 */

import { Lightbulb } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import type { FitnessTip } from "@/lib/fitness-tips";

export function FitnessTipsCard({
  tips,
  onAction,
}: {
  tips: FitnessTip[];
  /** Handles in-page actions (log, plan-day, browse); tab links are routed. */
  onAction?: (kind: NonNullable<FitnessTip["action"]["kind"]>) => void;
}) {
  if (tips.length === 0) return null;

  return (
    <Card className="border-primary/30 p-3">
      <ul className="space-y-3">
        {tips.map((tip) => (
          <li key={tip.id} className="flex items-start gap-2.5">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{tip.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{tip.body}</p>
            </div>
            {tip.action.tab ? (
              <Link
                to="/fitness"
                search={{ view: tip.action.tab }}
                className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium"
              >
                {tip.action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => tip.action.kind && onAction?.(tip.action.kind)}
                className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
              >
                {tip.action.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
