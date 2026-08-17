import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, ChevronRight } from "lucide-react";
import { manualSectionsForRoute } from "@/lib/manual-route-links";

/**
 * Contextual "in the manual" card.
 *
 * Rendered once by the app shell: it looks up the manual sections that
 * document the current screen and links straight to those steps
 * (/manual#section-id), so help is one tap away from the feature itself.
 */
export function ManualRouteLinks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/manual")) return null;

  const links = manualSectionsForRoute(pathname).slice(0, 4);
  if (links.length === 0) return null;

  const chapter = links[0];

  return (
    <aside
      data-testid="manual-route-links"
      className="mx-auto mb-24 mt-8 max-w-2xl px-6 md:mb-10"
      aria-labelledby="manual-route-links-heading"
    >
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <h2
            id="manual-route-links-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            In the manual
          </h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Chapter {chapter.chapterNumber} — {chapter.chapterTitle}. Step-by-step instructions for
          this screen.
        </p>
        <ul className="mt-3 space-y-1">
          {links.map((link) => (
            <li key={link.section.id}>
              <Link
                to="/manual"
                hash={link.section.id}
                className="tap-target flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                <span className="flex-1">{link.section.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
