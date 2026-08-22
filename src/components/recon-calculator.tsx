import { useId, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardClassName } from "@/components/ui/card";
import type { CalcPreset, DoseUnit } from "@/lib/compound-calculators";
import { errorFor, validateRecon, type SyringeType } from "@/lib/recon-validation";

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
 *
 * All input handling is delegated to `validateRecon`, so a blank field, a
 * typo, or a mg/mcg mix-up produces an explanation rather than a draw volume.
 */
export function ReconCalculator({
  defaults,
  presets,
  vialLabel = "Vial size (mg)",
  className,
}: Props) {
  const [vialMg, setVialMg] = useState<string>(String(defaults.vialMg));
  const [bacMl, setBacMl] = useState<string>(String(defaults.bacMl));
  const [doseValue, setDoseValue] = useState<string>(String(defaults.doseValue));
  const [doseUnit, setDoseUnit] = useState<DoseUnit>(defaults.doseUnit);
  const [syringe, setSyringe] = useState<SyringeType>("U-100");

  const validation = useMemo(
    () => validateRecon({ vialMg, bacMl, doseValue, doseUnit, syringe }),
    [vialMg, bacMl, doseValue, doseUnit, syringe],
  );

  const errors = validation.ok ? [] : validation.errors;
  const result = validation.ok ? validation.result : null;
  const doseError = errorFor(errors, "doseValue");

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
                setVialMg(String(p.vialMg));
                setBacMl(String(p.bacMl));
                setDoseValue(String(p.doseValue));
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
            error={errorFor(errors, "vialMg")}
          />
          <NumField
            label="BAC water added (mL)"
            value={bacMl}
            onChange={setBacMl}
            step={0.1}
            min={0.1}
            hint="Volume of bacteriostatic water you reconstitute with."
            error={errorFor(errors, "bacMl")}
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
                value={doseValue}
                aria-invalid={doseError ? true : undefined}
                aria-describedby="calc-dose-msg"
                onChange={(e) => setDoseValue(e.target.value)}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-base text-foreground focus:outline-none",
                  doseError
                    ? "border-destructive focus:border-destructive"
                    : "border-border focus:border-primary",
                )}
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
            <p
              id="calc-dose-msg"
              className={cn(
                "mt-1 text-xs",
                doseError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {doseError ?? "Per-injection dose you want to draw."}
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

      {!result && errors.length > 0 && (
        <section
          className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-5"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Nothing calculated yet
            </span>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
            {errors.map((e) => (
              <li key={`${e.field}-${e.message}`}>{e.message}</li>
            ))}
          </ul>
        </section>
      )}

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
              value={`${doseUnit === "mcg" ? (result.doseMg * 1000).toFixed(0) : result.doseMg.toFixed(2)} ${doseUnit}`}
            />
            <Stat label="Doses / vial" value={`~${Math.floor(result.dosesPerVial)}`} />
          </div>

          {validation.warnings.map((w) => (
            <Callout key={w}>{w}</Callout>
          ))}
        </section>
      )}

      {result && <InterpretResults syringe={syringe} units={result.units} />}
    </div>
  );
}

/**
 * Short cited explainer shown under a valid result.
 *
 * The numbers above are easy to misread — "units" is a volume marking, not a
 * quantity of peptide — so the meaning is spelled out on the page rather than
 * left to the reader.
 */
function InterpretResults({ syringe, units }: { syringe: SyringeType; units: number }) {
  const headingId = useId();
  const unitsPerMl = syringe === "U-100" ? 100 : 40;
  const readable = units >= 10 && units <= 30;

  return (
    <section className={cn(cardClassName, "mt-5 rounded-2xl p-5")} aria-labelledby={headingId}>
      <div className="flex items-center gap-2 text-primary">
        <BookOpen className="h-4 w-4" />
        <h2 id={headingId} className="text-xs font-semibold uppercase tracking-wide">
          How to interpret these results
        </h2>
      </div>

      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-foreground">Units are volume, not dose</dt>
          <dd className="text-muted-foreground">
            A {syringe} syringe is marked in insulin units, where {unitsPerMl} units is exactly 1
            mL. The marking measures liquid, not milligrams. The same {units.toFixed(1)}-unit draw
            carries a completely different amount of peptide if you reconstitute the next vial with
            a different volume of water, which is why the concentration has to be recorded
            somewhere.
            <Ref n={1} />
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Aim for a draw between 10 and 30 units</dt>
          <dd className="text-muted-foreground">
            {readable
              ? "This draw sits in the range that is easiest to read on the barrel."
              : "This draw sits outside the range that is easiest to read on the barrel — adjusting the diluent volume moves it back in."}{" "}
            Dosing accuracy with insulin syringes falls off sharply at very small volumes, where a
            half-unit misread is a large percentage of the dose.
            <Ref n={2} />
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Doses per vial is a ceiling</dt>
          <dd className="text-muted-foreground">
            It divides the vial strength by your dose and assumes nothing is lost. In practice the
            needle hub and barrel retain a small dead volume on every draw, so the real number of
            usable doses is lower — and low-dead-space syringes measurably reduce that loss.
            <Ref n={3} />
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">The clock starts when you mix</dt>
          <dd className="text-muted-foreground">
            Once reconstituted, the solution has a beyond-use date regardless of how many doses are
            left. Compounding standards assign much shorter in-use dating to preparations mixed
            outside a controlled environment than the unopened powder's expiry implies, so write the
            mixing date on the vial.
            <Ref n={4} />
          </dd>
        </div>
      </dl>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        <li>
          U.S. Food and Drug Administration. Insulin syringes and pen needles.{" "}
          <Cite href="https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/information-regarding-insulin-storage-and-switching-between-products-emergency" />
        </li>
        <li>
          Gnanalingham MG, Newland P, Smith CP. Accuracy and reproducibility of low dose insulin
          administration using pen-injectors and syringes. Arch Dis Child. 1998;79(1):59–62.{" "}
          <Cite href="https://pubmed.ncbi.nlm.nih.gov/9771254/" />
        </li>
        <li>
          World Health Organization. WHO guideline on the use of safety-engineered syringes.{" "}
          <Cite href="https://www.who.int/publications/i/item/9789241549820" />
        </li>
        <li>
          United States Pharmacopeia. USP General Chapter &lt;797&gt; Pharmaceutical Compounding —
          Sterile Preparations (beyond-use dating).{" "}
          <Cite href="https://www.usp.org/compounding/general-chapter-797" />
        </li>
      </ol>

      <p className="mt-3 text-xs text-muted-foreground">
        Educational reference only. Confirm any dose with the prescriber or clinician managing your
        protocol.
      </p>
    </section>
  );
}

function Ref({ n }: { n: number }) {
  return <sup className="ml-0.5 text-[0.65rem] text-primary">[{n}]</sup>;
}

function Cite({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-primary hover:underline"
    >
      {href}
    </a>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
  min,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  min: number;
  hint?: string;
  error?: string;
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
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-msg`}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-1 w-full rounded-md border bg-background px-3 py-2 text-base text-foreground focus:outline-none",
          error
            ? "border-destructive focus:border-destructive"
            : "border-border focus:border-primary",
        )}
      />
      <p
        id={`${id}-msg`}
        className={cn("mt-1 text-xs", error ? "text-destructive" : "text-muted-foreground")}
      >
        {error ?? hint}
      </p>
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
