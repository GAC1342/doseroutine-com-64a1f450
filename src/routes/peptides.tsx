import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for the /peptides education cluster. Children render themselves. */
export const Route = createFileRoute("/peptides")({
  component: () => <Outlet />,
});
