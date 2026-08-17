import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for the /calculators subtree. The index page lives in
 * calculators.index.tsx; per-compound pages in calculators.$slug.tsx.
 */
export const Route = createFileRoute("/calculators")({
  component: () => <Outlet />,
});
