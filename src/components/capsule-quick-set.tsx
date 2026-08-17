import { useEffect, useId, useState } from "react";
import { Calculator, ClipboardPaste } from "lucide-react";
import { fitLabelToUnit, parseSupplementLabel, type LabelUnit } from "@/lib/label-parse";
import {
  formatCapsuleSummary,
  validateCapsuleInput,
  validateParsedLabelDose,
  MAX_STRENGTH_PER_CAPSULE,
  type ParsedDoseCheck,
} from "@/lib/capsule-dose";

import { DecimalInput } from "@/components/decimal-input";

const STORAGE_PREFIX = "dr.capsule-strength.";

/**
 * Quick-set control: enter capsule (soft gel) strength + how many you take and
 * it fills the daily dose field. Strength is remembered per compound so the
 * next edit only needs the count. Inputs are validated so a zero, negative or
 * wildly out-of-range entry can never reach the daily dose field.
 */
export function CapsuleQuickSet({
  compoundId,
  unit,
  noun = "soft gel",
  defaultStrength,
  onApply,
  onUnitChange,
}: {
  compoundId: string;
  unit: string;
  noun?: string;
  defaultStrength?: number | null;
  onApply: (total: number) => void;
  /** Called when a pasted label uses a unit the current one can't represent. */
  onUnitChange?: (unit: LabelUnit) => void;
}) {
  const [strength, setStrength] = useState("");
  const [count, setCount] = useState("1");
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelText, setLabelText] = useState("");
  const [preview, setPreview] = useState<
    | {
        kind: "found";
        strength: number;
        count: number;
        unit: LabelUnit;
        noun: string;
        total: number;
        check: ParsedDoseCheck;
      }
    | { kind: "none" }
    | null
  >(null);

  const messageId = useId();

  // Restore the remembered per-capsule strength for this compound, ignoring
  // any previously stored value that would now fail validation.
  useEffect(() => {
    let remembered: string | null = null;
    try {
      remembered = window.localStorage.getItem(STORAGE_PREFIX + compoundId);
    } catch {
      remembered = null;
    }
    const n = remembered != null ? Number(remembered.trim()) : NaN;
    const usable =
      remembered != null &&
      remembered.trim() !== "" &&
      Number.isFinite(n) &&
      n > 0 &&
      n <= MAX_STRENGTH_PER_CAPSULE;
    setStrength(
      usable ? remembered!.trim() : defaultStrength != null ? String(defaultStrength) : "",
    );
    setCount("1");
  }, [compoundId]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = validateCapsuleInput({ strengthPerCapsule: strength, count }, unit, noun);
  const summary = result.ok
    ? formatCapsuleSummary({ strengthPerCapsule: strength, count }, unit, noun)
    : null;

  const invalidClass = "border-destructive focus:border-destructive";
  const baseInput =
    "tap-target mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none";

  const apply = () => {
    // Re-validate at apply time so nothing can slip through a stale render.
    const check = validateCapsuleInput({ strengthPerCapsule: strength, count }, unit, noun);
    if (!check.ok || check.total == null) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + compoundId, strength.trim());
    } catch {
      /* storage unavailable — quick-set still works for this session */
    }
    onApply(check.total);
  };

  const readLabel = () => {
    const parsed = parseSupplementLabel(labelText);
    if (!parsed) {
      setPreview({ kind: "none" });
      return;
    }
    const fitted = fitLabelToUnit(parsed, unit);
    // Run the parsed numbers through the same rules as manual entry, so a bad
    // parse is clamped where possible and blocked when it still isn't sane.
    const check = validateParsedLabelDose(
      fitted.strength,
      parsed.countPerServing,
      fitted.unit,
      parsed.noun,
    );
    setPreview({
      kind: "found",
      strength: check.strength,
      count: check.count,
      unit: fitted.unit,
      noun: parsed.noun,
      total: check.total,
      check,
    });
  };

  const useLabel = () => {
    if (!preview || preview.kind !== "found" || !preview.check.ok) return;
    setStrength(String(preview.strength));
    setCount(String(preview.count));
    if (preview.unit !== unit) onUnitChange?.(preview.unit);
    setPreview(null);
    setLabelOpen(false);
    setLabelText("");
  };

  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Calculator className="h-3.5 w-3.5" /> Quick-set from capsules
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="text-[11px] text-muted-foreground">
            Per {noun} ({unit})
          </span>
          <DecimalInput
            placeholder="900"
            value={strength}
            onValueChange={setStrength}
            aria-label={`Amount per ${noun} in ${unit}`}
            aria-invalid={result.field === "strength" || undefined}
            aria-describedby={messageId}
            className={`${baseInput} ${
              result.field === "strength" ? invalidClass : "border-border focus:border-primary"
            }`}
          />
        </label>
        <span className="pb-3 text-sm text-muted-foreground">×</span>
        <label className="w-24">
          <span className="text-[11px] text-muted-foreground">How many</span>
          <DecimalInput
            placeholder="2"
            value={count}
            onValueChange={setCount}
            aria-label={`Number of ${noun}s per day`}
            aria-invalid={result.field === "count" || undefined}
            aria-describedby={messageId}
            className={`${baseInput} ${
              result.field === "count" ? invalidClass : "border-border focus:border-primary"
            }`}
          />
        </label>
        <button
          type="button"
          onClick={apply}
          disabled={!result.ok}
          className="tap-target rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Use dose
        </button>
      </div>
      <p
        id={messageId}
        role={result.error ? "alert" : undefined}
        className={`mt-2 text-xs ${
          result.error
            ? "text-destructive"
            : result.warning
              ? "text-warning"
              : "text-muted-foreground"
        }`}
      >
        {result.error
          ? result.error
          : result.warning
            ? `${summary} · ${result.warning}`
            : summary
              ? summary
              : `Enter what one ${noun} contains and how many you take.`}
      </p>

      <div className="mt-2 border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={() => setLabelOpen((o) => !o)}
          aria-expanded={labelOpen}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          {labelOpen ? "Hide label reader" : "Paste label"}
        </button>

        {labelOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              value={labelText}
              onChange={(e) => {
                setLabelText(e.target.value);
                setPreview(null);
              }}
              rows={3}
              aria-label="Paste supplement label text"
              placeholder={`e.g. Serving size 2 soft gels · Omega-3 1,000 mg per soft gel`}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={readLabel}
                disabled={labelText.trim() === ""}
                className="tap-target rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                Read label
              </button>
              {labelText && (
                <button
                  type="button"
                  onClick={() => {
                    setLabelText("");
                    setPreview(null);
                  }}
                  className="text-xs text-muted-foreground underline"
                >
                  Clear
                </button>
              )}
            </div>

            {preview?.kind === "none" && (
              <p role="status" className="text-xs text-warning">
                Couldn't find an amount — look for a line like "1,000 mg per softgel".
              </p>
            )}

            {preview?.kind === "found" && (
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-xs text-foreground">
                  Found {preview.strength} {preview.unit} per {preview.noun}, {preview.count} per
                  serving = {preview.total} {preview.unit} daily.
                </p>
                {preview.check.error ? (
                  <p role="alert" className="mt-1 text-xs text-destructive">
                    {preview.check.error}
                  </p>
                ) : (
                  <>
                    {preview.check.clamped && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Rounded to the nearest usable amount — check it matches your label.
                      </p>
                    )}
                    {preview.check.warning && (
                      <p role="status" className="mt-1 text-xs text-warning">
                        {preview.check.warning}
                      </p>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={useLabel}
                  disabled={!preview.check.ok}
                  className="tap-target mt-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Use this
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
