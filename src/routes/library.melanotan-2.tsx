import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy/short URL alias. The canonical page lives at /library/melanotan-ii.
export const Route = createFileRoute("/library/melanotan-2")({
  beforeLoad: () => {
    throw redirect({ to: "/library/$slug", params: { slug: "melanotan-ii" }, statusCode: 301 });
  },
});
