import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ContentRouteError, ContentRouteNotFound } from "@/components/route-fallbacks";

// Layout only. The hub page itself lives in library.womens-health.index.tsx so
// its head() (canonical, og tags) does not leak into every child article and
// produce duplicate <link rel="canonical"> tags.
export const Route = createFileRoute("/library/womens-health")({
  component: () => <Outlet />,
  errorComponent: ContentRouteError,
  notFoundComponent: () => <ContentRouteNotFound label="Page" />,
});
