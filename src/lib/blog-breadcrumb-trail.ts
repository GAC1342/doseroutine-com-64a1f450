import type { BlogCrumb } from "@/components/blog-breadcrumbs";
import type { Crumb } from "@/lib/breadcrumb-schema";
import { BLOG_TAG_KIND_LABEL, type BlogTagKind } from "@/lib/blog-posts";

export type BlogTrailItem = BlogCrumb & { path: string };

const HOME: BlogTrailItem = { label: "Home", path: "/", link: { to: "/" } };
const BLOG: BlogTrailItem = {
  label: "Research & Updates",
  path: "/blog",
  link: { to: "/blog" },
};
const TAGS: BlogTrailItem = { label: "Tags", path: "/blog/tag", link: { to: "/blog/tag" } };

/** Home / Research & Updates / Tags */
export function blogTagHubTrail(): BlogTrailItem[] {
  return [HOME, BLOG, TAGS];
}

/** Home / Research & Updates / Tags / <Kind> / <Tag> */
export function blogTagArchiveTrail(
  kind: BlogTagKind,
  label: string,
  slug: string,
): BlogTrailItem[] {
  return [
    HOME,
    BLOG,
    TAGS,
    {
      label: BLOG_TAG_KIND_LABEL[kind],
      path: `/blog/tag#${kind}`,
      link: { to: "/blog/tag", hash: kind },
    },
    { label, path: `/blog/tag/${kind}/${slug}` },
  ];
}

/**
 * Schema crumbs for `breadcrumbScript`, which prepends Home itself.
 * Order matches the visible trail exactly.
 */
export function trailToSchemaCrumbs(trail: BlogTrailItem[]): Crumb[] {
  return trail.slice(1).map((c) => ({ name: c.label, path: c.path }));
}
