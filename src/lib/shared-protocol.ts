// Snapshot shape stored in shared_protocols.snapshot
export type SharedProtocolItem = {
  name: string;
  category: string | null;
  brand?: string | null;
  dose_amount: number | null;
  dose_unit: string | null;
  frequency: string | null;
  times: string[] | null;
  days_of_week: number[] | null;
  cycle_on_days?: number | null;
  cycle_off_days?: number | null;
  notes?: string | null;
  active: boolean;
};

export type SharedProtocolSnapshot = {
  version: 1;
  title: string;
  createdAt: string;
  items: SharedProtocolItem[];
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatDays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) return "Every day";
  if (days.length === 7) return "Every day";
  // days stored as 0=Mon..6=Sun (matches DAYS in stack.tsx)
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d] ?? "")
    .filter(Boolean)
    .join(", ");
}

export function formatFrequency(item: SharedProtocolItem): string {
  const f = (item.frequency || "").toLowerCase();
  const times = item.times && item.times.length ? ` at ${item.times.join(", ")}` : "";
  switch (f) {
    case "daily":
      return `Daily${times}`;
    case "weekly":
      return `Weekly (${formatDays(item.days_of_week)})${times}`;
    case "custom":
      return `Custom (${formatDays(item.days_of_week)})${times}`;
    case "as_needed":
      return "As needed";
    default:
      return f ? `${f}${times}` : "No schedule";
  }
}

export function formatDose(item: SharedProtocolItem): string {
  if (item.dose_amount == null) return "—";
  const unit = item.dose_unit ?? "";
  return `${item.dose_amount}${unit ? ` ${unit}` : ""}`;
}

export function generateShareToken(): string {
  // 22 chars, url-safe, ~128 bits of entropy
  const uuid = (globalThis.crypto?.randomUUID?.() ?? "") as string;
  const stripped = uuid.replace(/-/g, "");
  if (stripped.length >= 22) return stripped.slice(0, 22);
  // Fallback
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
