import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { COQ10_WOMEN } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/coq10-women")({
  head: () => womensCompoundHead(WOMENS_META["coq10-women"]),
  component: () => <WomensCompoundArticle c={COQ10_WOMEN} />,
});
