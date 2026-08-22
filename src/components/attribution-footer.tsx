import { Link, type LinkProps } from "@tanstack/react-router";
import { EDITORIAL_AUTHOR } from "@/lib/editorial-author";

/**
 * Visible attribution + trust block shown at the end of public content pages.
 *
 * The trust half states who maintains the page, how it is reviewed, what the
 * limits are, and how to report a correction — the signals answer engines and
 * readers use to decide whether a page is quotable. Only verifiable claims are
 * made here: no named clinician, no certification, no audit claim.
 *
 * Plain copyright only — no AI/text-and-data-mining opt-out or usage
 * restriction, so answer engines are free to read, quote and cite the page.
 *
 * `editorial={false}` is used on pages that already render a full
 * "About the author" card (blog posts) to avoid duplicating the same claims.
 */
/** Turns an absolute doseroutine.com source URL into an in-app path. */
function sameSitePath(sourceUrl?: string) {
  if (!sourceUrl) return "/";
  try {
    const url = new URL(sourceUrl, "https://doseroutine.com");
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}

export function AttributionFooter({
  sourceUrl,
  editorial = true,
}: {
  sourceUrl?: string;
  editorial?: boolean;
}) {
  const year = new Date().getFullYear();
  return (
    <aside
      className="mt-8 space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground"
      data-attribution="doseroutine"
    >
      {editorial ? (
        <div className="space-y-2" data-editorial-trust="doseroutine">
          <p className="text-sm font-semibold text-foreground">Who maintains this page</p>
          <p>
            {EDITORIAL_AUTHOR.who} {EDITORIAL_AUTHOR.what}
          </p>
          <p>{EDITORIAL_AUTHOR.limits}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <Link to="/manual" className="text-primary underline">
                Instruction manual
              </Link>
            </li>
            <li>
              <Link to="/sources" className="text-primary underline">
                Sources &amp; methodology
              </Link>
            </li>
            <li>
              <Link to="/editorial-policy" className="text-primary underline">
                Editorial &amp; review policy
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-primary underline">
                About DoseRoutine
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${EDITORIAL_AUTHOR.contactEmail}`}
                className="text-primary underline"
              >
                Report a correction by email
              </a>
            </li>
          </ul>
        </div>
      ) : null}
      <p>
        <strong>Original editorial compilation by DoseRoutine.</strong> © {year} DoseRoutine (
        {/* Self-referencing canonical link. In the native shell an absolute
            doseroutine.com URL would bounce the reviewer out to Safari, so the
            same-site path is navigated in-app while keeping rel="canonical". */}
        <Link to={sameSitePath(sourceUrl) as LinkProps["to"]} className="underline" rel="canonical">
          DoseRoutine
        </Link>
        ).
      </p>
    </aside>
  );
}
