import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { COQ10_FERTILITY } from "@/lib/womens-health/fertility-content";

export const Route = createFileRoute("/library/womens-health/coq10-fertility")({
  head: () => womensCompoundHead(WOMENS_META["coq10-fertility"]),
  component: () => <WomensCompoundArticle c={COQ10_FERTILITY} />,
});
