import checker from "@/assets/screen-checker.png.asset.json";
import calc from "@/assets/screen-calc.png.asset.json";
import library from "@/assets/screen-library.png.asset.json";

/**
 * Real, unretouched captures of DoseRoutine running on a phone-sized screen.
 *
 * This audience wants to see the actual product before creating an account —
 * so these are screenshots of live pages, not marketing mockups.
 */
const SHOTS = [
  {
    src: calc.url,
    alt: "DoseRoutine reconstitution calculator showing 10 units to draw on a U-100 syringe",
    caption: "Exact syringe units, doses per vial",
  },
  {
    src: checker.url,
    alt: "DoseRoutine interaction checker showing a sourced result for two compounds",
    caption: "Pairwise checks with real sources",
  },
  {
    src: library.url,
    alt: "DoseRoutine compound library page for BPC-157",
    caption: "475+ compounds, reviewed and cited",
  },
];

export function AppScreenshots() {
  return (
    <section aria-label="Screenshots of DoseRoutine" data-testid="app-screenshots">
      <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-foreground">
        This is the actual app
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
        Real screens, not mockups — try the calculator and checker yourself before you make an
        account.
      </p>

      <ul className="mt-8 grid gap-6 sm:grid-cols-3">
        {SHOTS.map((s) => (
          <li key={s.src} className="flex flex-col items-center">
            <div className="w-full max-w-[220px] overflow-hidden rounded-[2rem] border-[6px] border-foreground/85 bg-foreground/85 shadow-lg">
              <img
                src={s.src}
                alt={s.alt}
                width={780}
                height={1560}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full rounded-[1.5rem] bg-background"
              />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">{s.caption}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
