import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ContentRouteError, ContentRouteNotFound } from "@/components/route-fallbacks";

export const Route = createFileRoute("/library")({
  component: () => <Outlet />,
  errorComponent: ContentRouteError,
  notFoundComponent: () => <ContentRouteNotFound label="Page" />,
});
