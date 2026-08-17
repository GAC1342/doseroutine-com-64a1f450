import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy/short URL alias. The canonical page lives at
// /library/peptide-stacks-for-muscle-growth.
export const Route = createFileRoute("/library/peptide-stacks")({
  beforeLoad: () => {
    throw redirect({ to: "/library/peptide-stacks-for-muscle-growth", statusCode: 301 });
  },
});
