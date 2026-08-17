import { Link, type LinkProps } from "@tanstack/react-router";
import { Fragment } from "react";

export type BlogCrumb = {
  label: string;
  /** Omit on the final crumb — the current page is never a link. */
  link?: LinkProps;
};

/**
 * Compact breadcrumb trail for the blog tag hub and tag archive pages.
 * The last crumb is always plain text and marked as the current page.
 */
export function BlogBreadcrumbs({ crumbs }: { crumbs: BlogCrumb[] }) {
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              <li className="min-w-0">
                {crumb.link && !isLast ? (
                  <Link {...crumb.link} className="font-medium text-primary hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className="block max-w-[60vw] truncate sm:max-w-none"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
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
