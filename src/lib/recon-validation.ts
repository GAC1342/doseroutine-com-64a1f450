/**
 * Strict input validation and unit handling for the peptide reconstitution
 * calculator.
 *
 * Kept as a pure module so every `/calculators/{slug}` page inherits the same
 * rules and so the rules can be unit-tested without rendering React. The
 * calculator must never show a number it cannot stand behind: a blank field, a
 * typo, or a mg/mcg mix-up produces an explanation, not a draw volume.
 */

export type DoseUnit = "mcg" | "mg";
export type SyringeType = "U-100" | "U-40";

/** Physical bounds. Outside these the input is a typo, not a protocol. */
export const LIMITS = {
  /** Vial strengths on the market run from ~0.1 mg (Semax) to 100 mg blends. */
  vialMg: { min: 0.1, max: 100 },
  /** Bacteriostatic water: below 0.1 mL cannot be measured, above 30 mL is a bag. */
  bacMl: { min: 0.1, max: 30 },
  /** A dose below 1 mcg is unmeasurable; 100 mg exceeds every peptide protocol. */
  doseMg: { min: 0.000_001, max: 100 },
  /** Concentration ceiling — above this the powder will not dissolve. */
  mgPerMl: { max: 200 },
} as const;

export type FieldName = "vialMg" | "bacMl" | "doseValue";

export type FieldError = { field: FieldName; message: string };

export type ReconResult = {
  /** mg of compound per mL of reconstituted solution. */
  mgPerMl: number;
  /** Volume to draw, in mL. */
  mlPerDose: number;
  /** Volume to draw, in syringe units. */
  units: number;
  /** Whole doses the vial yields, ignoring dead space. */
  dosesPerVial: number;
  /** The dose expressed in mg, after unit conversion. */
  doseMg: number;
  /** Draw exceeds one full barrel — needs a split or a stronger mix. */
  overfull: boolean;
  /** Under 5 units is hard to read on the barrel. */
  tiny: boolean;
};

export type ReconValidation =
  | { ok: true; result: ReconResult; warnings: string[] }
  | { ok: false; errors: FieldError[]; result: null; warnings: string[] };

/** Raw field input as it comes off a text/number field, before coercion. */
export type ReconInput = {
  vialMg: string | number | null | undefined;
  bacMl: string | number | null | undefined;
  doseValue: string | number | null | undefined;
  doseUnit: DoseUnit;
  syringe: SyringeType;
};

const UNITS_PER_ML: Record<SyringeType, number> = { "U-100": 100, "U-40": 40 };

/** Converts a dose in the chosen unit to milligrams. */
export function toMg(value: number, unit: DoseUnit): number {
  return unit === "mcg" ? value / 1000 : value;
}

/** Converts milligrams to the chosen display unit. */
export function fromMg(mg: number, unit: DoseUnit): number {
  return unit === "mcg" ? mg * 1000 : mg;
}

/**
 * Coerces a raw field value to a finite number.
 *
 * Returns `null` for anything that is not a real number — empty strings,
 * whitespace, letters, `NaN`, `Infinity`. Number inputs hand back an empty
 * string for "12e" and similar garbage, so this has to treat blank as invalid
 * rather than as zero.
 */
export function parseNumeric(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  // Reject anything that is not a plain decimal number, so "1,5", "5mg" and
  // "1e5" never silently become a dose.
  if (!/^-?\d*\.?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function rangeError(
  field: FieldName,
  label: string,
  value: number,
  min: number,
  max: number,
  unit: string,
): FieldError | null {
  if (value <= 0) {
    return { field, message: `${label} must be greater than zero.` };
  }
  if (value < min) {
    return { field, message: `${label} is below ${min} ${unit} — check the number you entered.` };
  }
  if (value > max) {
    return { field, message: `${label} is above ${max} ${unit} — check the number you entered.` };
  }
  return null;
}

/**
 * Flags a dose that is almost certainly a milligram/microgram mix-up.
 *
 * Peptide doses live between roughly 1 mcg and 20 mg. A "500" typed while the
 * unit toggle says mg, or a "0.25" while it says mcg, is a unit error and is
 * refused rather than computed.
 */
export function detectUnitMistake(value: number, unit: DoseUnit): string | null {
  if (unit === "mcg" && value > 100_000) {
    return `${value} mcg is ${value / 1000} mg — that is far above any peptide dose. Did you mean milligrams?`;
  }
  if (unit === "mg" && value > 0 && value < 0.001) {
    return `${value} mg is under a microgram. Switch the unit to mcg and enter ${Math.round(value * 1000)} instead.`;
  }
  return null;
}

/**
 * Validates the four calculator inputs and, when every one is sound, returns
 * the reconstitution result.
 *
 * Errors are per-field so the UI can render them under the offending input.
 * Warnings are advisory: the maths is valid but the setup is awkward.
 */
export function validateRecon(input: ReconInput): ReconValidation {
  const errors: FieldError[] = [];
  const warnings: string[] = [];

  const vialMg = parseNumeric(input.vialMg);
  const bacMl = parseNumeric(input.bacMl);
  const doseValue = parseNumeric(input.doseValue);

  if (vialMg === null) {
    errors.push({ field: "vialMg", message: "Enter the vial strength as a number." });
  } else {
    const e = rangeError(
      "vialMg",
      "Vial strength",
      vialMg,
      LIMITS.vialMg.min,
      LIMITS.vialMg.max,
      "mg",
    );
    if (e) errors.push(e);
  }

  if (bacMl === null) {
    errors.push({ field: "bacMl", message: "Enter how much bacteriostatic water you added." });
  } else {
    const e = rangeError(
      "bacMl",
      "Diluent volume",
      bacMl,
      LIMITS.bacMl.min,
      LIMITS.bacMl.max,
      "mL",
    );
    if (e) errors.push(e);
  }

  if (doseValue === null) {
    errors.push({ field: "doseValue", message: "Enter your target dose as a number." });
  } else if (doseValue <= 0) {
    errors.push({ field: "doseValue", message: "Target dose must be greater than zero." });
  } else {
    const mixUp = detectUnitMistake(doseValue, input.doseUnit);
    if (mixUp) {
      errors.push({ field: "doseValue", message: mixUp });
    } else {
      const doseMg = toMg(doseValue, input.doseUnit);
      if (doseMg < LIMITS.doseMg.min) {
        errors.push({
          field: "doseValue",
          message: "That dose is smaller than a microgram and cannot be measured.",
        });
      } else if (doseMg > LIMITS.doseMg.max) {
        errors.push({
          field: "doseValue",
          message: `A ${doseMg} mg dose is above anything used with peptides — check the unit toggle.`,
        });
      }
    }
  }

  if (errors.length > 0 || vialMg === null || bacMl === null || doseValue === null) {
    return { ok: false, errors, result: null, warnings };
  }

  const doseMg = toMg(doseValue, input.doseUnit);

  // Cross-field checks: each input is individually fine but the combination is not.
  if (doseMg > vialMg) {
    return {
      ok: false,
      result: null,
      warnings,
      errors: [
        {
          field: "doseValue",
          message: `A ${fromMg(doseMg, input.doseUnit)} ${input.doseUnit} dose is more than the ${vialMg} mg the vial contains.`,
        },
      ],
    };
  }

  const mgPerMl = vialMg / bacMl;
  if (mgPerMl > LIMITS.mgPerMl.max) {
    return {
      ok: false,
      result: null,
      warnings,
      errors: [
        {
          field: "bacMl",
          message: `${mgPerMl.toFixed(0)} mg/mL will not go into solution. Add more bacteriostatic water.`,
        },
      ],
    };
  }

  const mlPerDose = doseMg / mgPerMl;
  const unitsPerMl = UNITS_PER_ML[input.syringe];
  const units = mlPerDose * unitsPerMl;
  const dosesPerVial = vialMg / doseMg;

  const overfull = units > unitsPerMl;
  const tiny = units < 5;

  if (overfull) {
    warnings.push(
      `This draw is larger than one full ${input.syringe} barrel. Use less bacteriostatic water, a higher-strength vial, or split it across two injections.`,
    );
  }
  if (tiny) {
    warnings.push(
      "Under 5 units is very hard to read accurately. Reconstituting with more bacteriostatic water makes the same dose a bigger, easier draw.",
    );
  }
  if (!overfull && !tiny && units > 60) {
    warnings.push(
      "Over 60 units is a large subcutaneous volume and can sting. A stronger mix would reduce it.",
    );
  }
  if (dosesPerVial < 1.5) {
    warnings.push(
      "This vial holds barely more than one dose at that strength — worth double-checking the vial size.",
    );
  }

  return {
    ok: true,
    warnings,
    result: { mgPerMl, mlPerDose, units, dosesPerVial, doseMg, overfull, tiny },
  };
}

/** Convenience lookup used by the UI to place an error under its field. */
export function errorFor(errors: FieldError[], field: FieldName): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}
