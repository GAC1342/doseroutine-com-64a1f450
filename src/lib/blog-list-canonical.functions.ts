import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { buildBlogListCanonical, parseBlogListParams } from "./blog-list-canonical";

/**
 * Server-side canonical URL + list params for the blog list.
 *
 * Preserves `page`, strips `pageSize`/`sort`/other params so search engines
 * consolidate ranking signals on the clean list URL. The parsed params let
 * head() build page-aware titles, prev/next links and robots directives.
 */
export const getBlogListCanonicalUrl = createServerFn({ method: "GET" }).handler(() => {
  const req = getRequest();
  return {
    canonical: buildBlogListCanonical(req.url),
    ...parseBlogListParams(req.url),
  };
});
