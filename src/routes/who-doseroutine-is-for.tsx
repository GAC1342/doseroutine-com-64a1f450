import { createFileRoute, redirect } from "@tanstack/react-router";

// Descriptive alias URL. Canonical page stays at /for — this only 301s.
export const Route = createFileRoute("/who-doseroutine-is-for")({
  beforeLoad: () => {
    throw redirect({ to: "/for", statusCode: 301 });
  },
});
