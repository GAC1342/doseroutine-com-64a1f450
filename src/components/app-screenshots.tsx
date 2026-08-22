import checker from "@/assets/screen-checker.png.asset.json";
import calc from "@/assets/screen-calc.png.asset.json";
import library from "@/assets/screen-library.png.asset.json";
import checker440 from "@/assets/screen-checker-440.webp.asset.json";
import checker660 from "@/assets/screen-checker-660.webp.asset.json";
import calc440 from "@/assets/screen-calc-440.webp.asset.json";
import calc660 from "@/assets/screen-calc-660.webp.asset.json";
import library440 from "@/assets/screen-library-440.webp.asset.json";
import library660 from "@/assets/screen-library-660.webp.asset.json";

/**
 * Real, unretouched captures of DoseRoutine running on a phone-sized screen.
 *
 * This audience wants to see the actual product before creating an account —
 * so these are screenshots of live pages, not marketing mock-ups.
 *
 * They render at most 220 CSS px wide, so the PNG originals (~460KB combined)
 * are only the legacy fallback: modern browsers take the 440w/660w WebP
 * candidates below (~90KB combined at 2x) via <picture>.
 */
const SHOTS = [
  {
    src: calc.url,
    webpSrcSet: `${calc440.url} 440w, ${calc660.url} 660w`,
    alt: "DoseRoutine reconstitution calculator showing 10 units to draw on a U-100 syringe",
    caption: "Exact syringe units, doses per vial",
  },
  {
    src: checker.url,
    webpSrcSet: `${checker440.url} 440w, ${checker660.url} 660w`,
    alt: "DoseRoutine interaction checker showing a sourced result for two compounds",
    caption: "Pairwise checks with real sources",
  },
  {
    src: library.url,
    webpSrcSet: `${library440.url} 440w, ${library660.url} 660w`,
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
        Real screens, not mock-ups — try the calculator and checker yourself before you make an
        account.
      </p>

      <ul className="mt-8 grid gap-6 sm:grid-cols-3">
        {SHOTS.map((s) => (
          <li key={s.src} className="flex flex-col items-center">
            <div className="w-full max-w-[220px] overflow-hidden rounded-[2rem] border-[6px] border-foreground/85 bg-foreground/85 shadow-lg">
              <picture>
                <source type="image/webp" srcSet={s.webpSrcSet} sizes="220px" />
                <img
                  src={s.src}
                  alt={s.alt}
                  title={s.alt}
                  width={780}
                  height={1560}
                  sizes="220px"
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full rounded-[1.5rem] bg-background"
                />
              </picture>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">{s.caption}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
