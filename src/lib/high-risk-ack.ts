/**
 * One-time acknowledgment for the high-risk cardiovascular medication
 * banner. Persisted per browser via localStorage, keyed by a signature
 * of the currently-flagged high-risk categories so that adding a new
 * class of high-risk medication re-requires acknowledgment.
 *
 * Signature examples:
 *   ""                                → no high-risk meds, ack not required
 *   "beta-blocker"                    → single class
 *   "anticoagulant|beta-blocker"      → sorted, "|"-joined
 */
import { useEffect, useMemo, useState } from "react";
import { classifyHighRiskCardioMed, type HighRiskCategory } from "@/lib/high-risk-meds";

const STORAGE_KEY = "doseroutine:high-risk-ack:v1";

type RowLike = { active?: boolean | null; compound?: { slug?: string; name?: string } | null };

export function highRiskSignature(rows: RowLike[]): string {
  const cats = new Set<HighRiskCategory>();
  for (const r of rows) {
    if (r.active === false) continue;
    if (!r.compound) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const cat = classifyHighRiskCardioMed(r.compound as any);
    if (cat) cats.add(cat);
  }
  return Array.from(cats).sort().join("|");
}

function readStoredSig(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function isHighRiskAcknowledged(sig: string): boolean {
  if (!sig) return true;
  return readStoredSig() === sig;
}

export function acknowledgeHighRisk(sig: string): void {
  if (!sig || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, sig);
    window.dispatchEvent(new CustomEvent("doseroutine:high-risk-ack", { detail: sig }));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function revokeHighRiskAck(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("doseroutine:high-risk-ack", { detail: "" }));
  } catch {
    // localStorage unavailable (private mode) — non-critical.
  }
}

/**
 * React hook: returns live acknowledgment state for the given rows.
 * `needsAck` is true when there are high-risk meds in the stack.
 * `acknowledged` is true when the stored signature matches the
 * current one (or when no ack is needed).
 */
export function useHighRiskAck(rows: RowLike[]) {
  const signature = useMemo(() => highRiskSignature(rows), [rows]);
  const [ackedSig, setAckedSig] = useState<string | null>(() => readStoredSig());

  useEffect(() => {
    function refresh() {
      setAckedSig(readStoredSig());
    }
    window.addEventListener("doseroutine:high-risk-ack", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("doseroutine:high-risk-ack", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const needsAck = signature !== "";
  const acknowledged = !needsAck || ackedSig === signature;

  return {
    signature,
    needsAck,
    acknowledged,
    acknowledge: () => {
      acknowledgeHighRisk(signature);
      setAckedSig(signature);
    },
    revoke: () => {
      revokeHighRiskAck();
      setAckedSig(null);
    },
  };
}

/**
 * Server-safe fetch of the current signature for the signed-in user.
 * Used by surfaces (like the Plan page) that don't already have rows
 * loaded and need to gate a "publish" action.
 */
export async function fetchCurrentHighRiskSignature(supabase: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  from: (t: string) => any;
}): Promise<string> {
  const { data } = await supabase
    .from("user_compounds")
    .select("active, compound:compounds(slug,name)")
    .eq("active", true);
  return highRiskSignature((data as RowLike[] | null) ?? []);
}
