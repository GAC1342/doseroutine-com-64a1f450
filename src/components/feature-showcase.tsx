import { FEATURE_VISUALS } from "@/lib/feature-visuals";

/**
 * Visual tour of the headline features, below the real-screenshot strip.
 *
 * These are rendered product visuals, not screenshots — the strip above keeps
 * the "real screens" claim honest, so this section is labeled as illustration.
 * Images are lazy-loaded with explicit intrinsic dimensions and a WebP srcSet
 * so phones fetch the 400w variant instead of the full-size file.
 */
export function FeatureShowcase() {
  return (
    <section
      id="feature-showcase"
      aria-labelledby="feature-showcase-heading"
      className="mx-auto max-w-5xl px-4 py-14"
    >
      <div className="text-center">
        <h2
          id="feature-showcase-heading"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          What the app actually does
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Six features, illustrated. Every one of them exists to stop the same thing: a dose that is
          missed, doubled, mistimed or measured wrong.
        </p>
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {FEATURE_VISUALS.map((visual, index) => (
          <figure key={visual.id} className="rounded-2xl bg-card p-4">
            <img
              src={visual.webp.w800}
              srcSet={`${visual.webp.w400} 400w, ${visual.webp.w800} 800w, ${visual.webp.w1200} 1200w`}
              sizes="(max-width: 640px) 92vw, 44vw"
              width={visual.width}
              height={visual.height}
              alt={visual.alt}
              title={visual.title}
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              className="w-full rounded-xl"
            />
            <figcaption className="mt-4">
              <h3 className="font-display text-lg font-semibold">{visual.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {visual.caption}
              </p>
              <a
                href={visual.href}
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                {`See how ${visual.title.toLowerCase()} works`}
              </a>
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        Illustrated product visuals. The strip above shows unedited screens from the live app.
      </p>
    </section>
  );
}
