import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryHistory, createRouter, createRootRoute, createRoute, RouterProvider } from "@tanstack/react-router";
import { BlogSources } from "@/components/blog-sources";
import { sourceKind } from "@/lib/editorial-author";
import { blogPostHead } from "@/lib/blog-seo";
import { BLOG_POSTS } from "@/lib/blog-posts";

async function renderWithRouter(node: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => <>{node}</> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToStaticMarkup(<RouterProvider router={router as any} />);
}

describe("sourceKind", () => {
  it("labels known publishers", () => {
    expect(sourceKind("https://pubmed.ncbi.nlm.nih.gov/12345/")).toBe("Peer-reviewed");
    expect(sourceKind("https://www.fda.gov/news")).toBe("Regulatory");
    expect(sourceKind("https://clinicaltrials.gov/study/NCT1")).toBe("Trial registry");
    expect(sourceKind("not a url")).toBe("Reference");
  });
});

describe("BlogSources", () => {
  it("renders nothing without refs", async () => {
    const html = await renderWithRouter(<BlogSources refs={[]} updated="2026-08-10" />);
    expect(html).not.toContain("Sources &amp; references");
  });

  it("labels each source and uses nofollow noopener on external links", async () => {
    const html = await renderWithRouter(
      <BlogSources
        refs={[{ cite: "Trial A (2026)", url: "https://pubmed.ncbi.nlm.nih.gov/1/" }]}
        updated="2026-08-10"
      />,
    );
    expect(html).toContain("Peer-reviewed");
    expect(html).toContain('rel="nofollow noopener"');
    expect(html).not.toContain('rel="noopener noreferrer"');
    expect(html).toContain("pubmed.ncbi.nlm.nih.gov");
  });
});

describe("blog post structured data", () => {
  it("carries citations, reviewedBy and lastReviewed", () => {
    const post = BLOG_POSTS[0];
    const head = blogPostHead(post);
    const article = JSON.parse(String(head.scripts[0].children));
    expect(article.citation).toHaveLength(post.refs.length);
    expect(article.reviewedBy["@id"]).toBe("https://doseroutine.com/#organization");
    expect(article.lastReviewed).toBe(post.updated);
  });
});
