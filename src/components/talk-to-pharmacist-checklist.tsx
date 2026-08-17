import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Phone,
  Stethoscope,
  ClipboardList,
  ExternalLink,
} from "lucide-react";

type FlaggedPair = { a: string; b: string; severity: string };

const ITEMS: { id: string; label: string; hint?: string }[] = [
  { id: "list", label: "Bring a full list of every med, supplement, peptide, and dose I'm taking" },
  { id: "call-pharm", label: "Call my pharmacist and ask about the flagged interactions by name" },
  {
    id: "ask-doc",
    label: "Message or book my prescriber before adding, changing, or stopping anything",
  },
  { id: "symptoms", label: "Ask which warning symptoms mean I should stop and seek urgent care" },
  {
    id: "timing",
    label: "Confirm safe timing / spacing between doses (e.g. hours apart, with food)",
  },
  { id: "monitor", label: "Ask if any labs, BP checks, or heart-rate monitoring are needed" },
];

export function TalkToPharmacistChecklist({
  pairs,
  storageKey,
}: {
  pairs: FlaggedPair[];
  storageKey: string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      let raw = localStorage.getItem(storageKey);
      if (!raw && storageKey.startsWith("doseroutine:")) {
        // One-time migration from legacy "sw:" prefix.
        const legacyKey = storageKey.replace(/^doseroutine:/, "sw:");
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) {
          localStorage.setItem(storageKey, legacy);
          localStorage.removeItem(legacyKey);
          raw = legacy;
        }
      }
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {
      /* ignore */
    }
  }, [checked, storageKey]);

  const majorCount = useMemo(
    () => pairs.filter((p) => p.severity === "avoid" || p.severity === "caution").length,
    [pairs],
  );
  const doneCount = Object.values(checked).filter(Boolean).length;

  if (majorCount === 0) return null;

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const markAll = () => setChecked(Object.fromEntries(ITEMS.map((i) => [i.id, true])));

  return (
    <div className="mt-3 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={open}
      >
        <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div className="flex-1">
          <p className="font-display text-sm font-semibold text-foreground">
            Talk to your pharmacist or prescriber
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {majorCount} major interaction{majorCount === 1 ? "" : "s"} flagged with your
            prescriptions. One-tap checklist — {doneCount}/{ITEMS.length} done.
          </p>
        </div>
      </button>

      {open && (
        <>
          <ul className="mt-3 space-y-1.5">
            {ITEMS.map((item) => {
              const isChecked = !!checked[item.id];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="tap-target flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-amber-500/10 active:scale-[0.99]"
                    aria-pressed={isChecked}
                  >
                    {isChecked ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span
                      className={`text-sm ${isChecked ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="tel:"
              className="tap-target inline-flex h-10 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700"
            >
              <Phone className="h-4 w-4" /> Call pharmacist
            </a>
            <a
              href="https://www.pharmacy.ca.gov/consumers/ask_pharmacist.shtml"
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-card"
            >
              Find a pharmacist <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={markAll}
              className="tap-target inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-card"
            >
              <ClipboardList className="h-4 w-4" /> Mark all done
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Education only, not medical advice. In an emergency call your local emergency number.
          </p>
        </>
      )}
    </div>
  );
}
