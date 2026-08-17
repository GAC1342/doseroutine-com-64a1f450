/** Bundle entry so scripts/blog-seo-score-report.mjs can import the TS sources. */
export { BLOG_POSTS } from "@/lib/blog-posts";
export { PASSING_SCORE, failingPosts, scoreAllBlogPosts } from "@/lib/blog-seo-score";
export { loadSeoScoreConfig } from "@/lib/seo-score-config.load";
