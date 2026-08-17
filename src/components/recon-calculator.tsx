import { useMemo, useState } from "react";
import { AlertTriangle, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardClassName } from "@/components/ui/card";
import type { CalcPreset, DoseUnit } from "@/lib/compound-calculators";

type SyringeType = "U-100" | "U-40";

interface Props {
  defaults: { vialMg: number; bacMl: number; doseValue: number; doseUnit: DoseUnit };
  presets: CalcPreset[];
  /** Label for the vial-size field — HCG pages relabel this to IU. */
  vialLabel?: string;
  className?: string;
}

/**
 * Shared reconstitution tool used by every per-compound calculator page.
 * Pure client-side arithmetic — no network, no auth, indexable page shell.
 */
export function ReconCalculator({
  defaults,
  presets,
  vialLabel = "Vial size (mg)",
  className,
}: Props) {
  const [vialMg, setVialMg] = useState<number>(defaults.vialMg);
  const [bacMl, setBacMl] = useState<number>(defaults.bacMl);
  const [doseValue, setDoseValue] = useState<number>(defaults.doseValue);
  const [doseUnit, setDoseUnit] = useState<DoseUnit>(defaults.doseUnit);
  const [syringe, setSyringe] = useState<SyringeType>("U-100");

  const result = useMemo(() => {
    if (!vialMg || !bacMl || !doseValue) return null;
    const doseMg = doseUnit === "mcg" ? doseValue / 1000 : doseValue;
    const mgPerMl = vialMg / bacMl;
    const mlPerDose = doseMg / mgPerMl;
    const unitsPerMl = syringe === "U-100" ? 100 : 40;
    const units = mlPerDose * unitsPerMl;
    return {
      mgPerMl,
      mlPerDose,
      units,
      dosesPerVial: vialMg / doseMg,
      overfull: units > unitsPerMl,
      tiny: units > 0 && units < 5,
    };
  }, [vialMg, bacMl, doseValue, doseUnit, syringe]);

  return (
    <div className={className}>
      <section aria-labelledby="calc-presets">
        <h2
          id="calc-presets"
          className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Common setups
        </h2>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setVialMg(p.vialMg);
                setBacMl(p.bacMl);
                setDoseValue(p.doseValue);
                setDoseUnit(p.doseUnit);
              }}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/60 hover:text-primary"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className={cn(cardClassName, "mt-5 rounded-2xl p-5")} aria-labelledby="calc-inputs">
        <h2 id="calc-inputs" className="sr-only">
          Calculator inputs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField
            label={vialLabel}
            value={vialMg}
            onChange={setVialMg}
            step={0.5}
            min={0.1}
            hint="Total compound in the vial."
          />
          <NumField
            label="BAC water added (mL)"
            value={bacMl}
            onChange={setBacMl}
            step={0.1}
            min={0.1}
            hint="Volume of bacteriostatic water you reconstitute with."
          />
          <div>
            <label className="text-sm font-medium text-foreground" htmlFor="calc-dose">
              Target dose
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="calc-dose"
                type="number"
                inputMode="decimal"
                min={0}
                step={doseUnit === "mcg" ? 10 : 0.1}
                value={Number.isFinite(doseValue) ? doseValue : ""}
                onChange={(e) => setDoseValue(parseFloat(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none"
              />
              <div className="flex rounded-md border border-border bg-background p-0.5 text-xs">
                {(["mcg", "mg"] as DoseUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDoseUnit(u)}
                    className={cn(
                      "rounded px-3 py-1.5 font-medium",
                      doseUnit === u
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Per-injection dose you want to draw.
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Syringe type</span>
            <div className="mt-1 flex rounded-md border border-border bg-background p-0.5 text-xs">
              {(["U-100", "U-40"] as SyringeType[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSyringe(s)}
                  className={cn(
                    "flex-1 rounded px-3 py-1.5 font-medium",
                    syringe === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              U-100 = 100 units per mL (standard). U-40 = 40 units per mL.
            </p>
          </div>
        </div>
      </section>

      {result && (
        <section
          className="mt-5 rounded-2xl border border-primary/40 bg-primary/5 p-5"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-primary">
            <Syringe className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Draw</span>
          </div>
          <div className="mt-2 font-display text-4xl font-semibold text-foreground">
            {result.units.toFixed(1)} <span className="text-xl text-muted-foreground">units</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            on a {syringe} insulin syringe ({result.mlPerDose.toFixed(3)} mL)
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Concentration" value={`${result.mgPerMl.toFixed(2)} mg/mL`} />
            <Stat
              label="Per dose"
              value={`${doseUnit === "mcg" ? doseValue.toFixed(0) : doseValue.toFixed(2)} ${doseUnit}`}
            />
            <Stat label="Doses / vial" value={`~${Math.floor(result.dosesPerVial)}`} />
          </div>

          {result.overfull && (
            <Callout>
              This dose is larger than one full {syringe} syringe. Use less BAC water, choose a
              higher-mg vial, or split into two draws.
            </Callout>
          )}
          {result.tiny && (
            <Callout>
              Under 5 units is very hard to measure accurately. Add more bacteriostatic water so the
              same dose becomes a bigger, more readable draw.
            </Callout>
          )}
        </section>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
  min,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
  min: number;
  hint?: string;
}) {
  const id = `calc-${label.replace(/[^a-z]+/gi, "-").toLowerCase()}`;
  return (
    <div>
      <label className="text-sm font-medium text-foreground" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
