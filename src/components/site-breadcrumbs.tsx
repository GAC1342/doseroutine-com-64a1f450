import { Fragment } from "react";
import { useRouterState } from "@tanstack/react-router";
import { resolveTrail } from "@/lib/site-breadcrumbs";

/**
 * Visible breadcrumb trail rendered for public pages that don't already have
 * one of their own. Plain links only — the BreadcrumbList JSON-LD lives in
 * each route's head(), so adding microdata here would duplicate it.
 */
export function SiteBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = resolveTrail(pathname);
  if (!crumbs) return null;

  const items = [{ label: "Home", path: "/" }, ...crumbs];

  return (
    <nav
      aria-label="Breadcrumb"
      data-site-breadcrumbs=""
      className="border-b border-border/50 bg-background/80"
    >
      <ol className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-5 py-2 text-xs text-muted-foreground">
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={crumb.path}>
              <li className="min-w-0">
                {isLast ? (
                  <span aria-current="page" className="block max-w-[70vw] truncate sm:max-w-none">
                    {crumb.label}
                  </span>
                ) : (
                  <a href={crumb.path} className="font-medium text-primary hover:underline">
                    {crumb.label}
                  </a>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="select-none">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
