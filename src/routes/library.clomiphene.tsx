import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy/short URL alias. The canonical page lives at /library/clomiphene-citrate.
export const Route = createFileRoute("/library/clomiphene")({
  beforeLoad: () => {
    throw redirect({
      to: "/library/$slug",
      params: { slug: "clomiphene-citrate" },
      statusCode: 301,
    });
  },
});
