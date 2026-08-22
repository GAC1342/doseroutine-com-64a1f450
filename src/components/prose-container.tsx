import type { ReactNode } from "react";

/**
 * The one and only wrapper for long-form page copy.
 *
 * Every long-form block (`<PageProse />`) must render inside this component.
 * Hand-rolled wrappers are how the "text runs to the screen edge" bug shipped
 * repeatedly: each route invented its own `max-w`/padding combination, so a
 * single missing `px-4` produced edge-to-edge paragraphs on iPhone while every
 * neighbouring page looked fine.
 *
 * Centralising it means:
 *   • one measure (`max-w-3xl` ≈ 70 characters) across /articles, /calculators
 *     and every /vs/* page, so the reading experience is identical, and
 *   • one gutter (`px-4`) that can never be dropped on a single page.
 *
 * Enforced by `scripts/check-prose-container.mjs` (static lint) and the
 * `long-form-edge-padding` / `long-form-a11y` Playwright suites (runtime).
 */

/** Shared measure + gutter. Exported so tests can assert on the exact string. */
export const PROSE_CONTAINER_CLASS = "mx-auto w-full max-w-3xl px-4";

export function ProseContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-prose-container className={`${PROSE_CONTAINER_CLASS} ${className}`.trim()}>
      {children}
    </div>
  );
}
