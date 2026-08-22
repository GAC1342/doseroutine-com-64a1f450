import { createFileRoute, redirect } from "@tanstack/react-router";

// Descriptive alias URL. Canonical page stays at /blog — this only 301s.
export const Route = createFileRoute("/health-tracking-blog")({
  beforeLoad: () => {
    throw redirect({ to: "/blog", statusCode: 301 });
  },
});
