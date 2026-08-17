import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy/short URL alias. The canonical page lives at /library/testosterone-trt.
export const Route = createFileRoute("/library/testosterone")({
  beforeLoad: () => {
    throw redirect({ to: "/library/$slug", params: { slug: "testosterone-trt" }, statusCode: 301 });
  },
});
