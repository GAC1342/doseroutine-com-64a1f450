import { AlertTriangle, Ban, Info, ShieldCheck } from "lucide-react";
import type { Severity } from "@/lib/interactions";

const MAP: Record<
  Severity,
  { label: string; Icon: React.ComponentType<{ className?: string }>; bg: string; fg: string }
> = {
  avoid: {
    label: "Avoid",
    Icon: Ban,
    bg: "bg-[color:var(--severity-avoid-bg)]",
    fg: "text-[color:var(--severity-avoid)]",
  },
  caution: {
    label: "Caution",
    Icon: AlertTriangle,
    bg: "bg-accent-warm-tint",
    fg: "text-accent-warm",
  },
  note: {
    label: "Note",
    Icon: Info,
    bg: "bg-[color:var(--severity-note-bg)]",
    fg: "text-[color:var(--severity-note)]",
  },
  synergy: {
    label: "Synergy",
    Icon: ShieldCheck,
    bg: "bg-[color:var(--severity-synergy-bg)]",
    fg: "text-[color:var(--severity-synergy)]",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = MAP[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${s.bg} ${s.fg}`}
    >
      <s.Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

export const severityStyles = MAP;
