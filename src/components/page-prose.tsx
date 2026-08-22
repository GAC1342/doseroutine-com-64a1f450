import { PAGE_PROSE } from "@/content/page-prose";

/**
 * Renders the page-specific long-form copy defined in src/content/page-prose.ts.
 * Presentation only — headings, paragraphs and optional bullets in the same
 * type scale used by the rest of the marketing pages.
 */
export function PageProse({ id, className = "" }: { id: string; className?: string }) {
  const sections = PAGE_PROSE[id];
  if (!sections?.length) return null;

  return (
    <article
      data-page-prose={id}
      className={`mt-12 border-t border-border/60 pt-8 ${className}`}
      {...{ itemprop: "mainContentOfPage" }}
      {...{ itemscope: "" }}
      {...{ itemtype: "https://schema.org/WebPageElement" }}
    >
      <div {...{ itemprop: "text" }}>
        {sections.map((section) => (
          <div key={section.heading} className="mt-8 first:mt-0">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="mt-3 text-sm leading-relaxed text-foreground/90"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}
