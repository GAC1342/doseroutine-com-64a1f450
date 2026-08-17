import {
  READ_SOURCE_LABELS,
  READ_SOURCE_SKIPPED,
  provenanceFactors,
  type MealConfidence,
  type MealItem,
  type MealReadSource,
  type MealSource,
} from "@/lib/meal-nutrition";

const CHAIN: MealReadSource[] = ["barcode", "nutrition_label", "visual"];

const DOT_CLASS: Record<MealConfidence, string> = {
  high: "bg-[color:var(--severity-synergy)]",
  medium: "bg-[color:var(--accent-warm,#B45309)]",
  low: "bg-destructive",
};

/**
 * "Where these numbers came from" — the read source chain plus the factors
 * behind the confidence, so a scan never presents a guess as a fact.
 */
export function MealProvenance({
  source,
  readFrom,
  confidence,
  barcode,
  items,
  note,
  edited,
}: {
  source: MealSource;
  readFrom?: MealReadSource | null;
  confidence: MealConfidence | null;
  barcode?: string | null;
  items: MealItem[];
  note?: string;
  edited?: boolean;
}) {
  const manual = source === "manual";
  const active: MealReadSource = readFrom ?? (source === "barcode" ? "barcode" : "visual");
  const factors = provenanceFactors({ source, readFrom: active, items, note, edited });

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide">
        Where these numbers came from
      </h3>

      {manual ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Entered by hand — no scan was used for this meal.
        </p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CHAIN.map((step) => {
              const isActive = step === active;
              return (
                <span
                  key={step}
                  title={isActive ? "Used for these numbers" : READ_SOURCE_SKIPPED[step]}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    isActive
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground/70"
                  }`}
                >
                  {READ_SOURCE_LABELS[step]}
                  {!isActive && (
                    <span className="ml-1 text-[10px]">· {READ_SOURCE_SKIPPED[step]}</span>
                  )}
                </span>
              );
            })}
          </div>
          {active === "barcode" && barcode ? (
            <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
              Product code {barcode} — manufacturer's published panel.
            </p>
          ) : null}
        </>
      )}

      {confidence && (
        <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[confidence]}`} />
          {confidence} confidence
        </div>
      )}

      <ul className="mt-1.5 space-y-1">
        {factors.map((factor) => (
          <li key={factor} className="flex gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true">·</span>
            <span>{factor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
