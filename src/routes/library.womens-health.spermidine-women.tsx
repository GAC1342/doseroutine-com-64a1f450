import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { SPERMIDINE_WOMEN } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/spermidine-women")({
  head: () => womensCompoundHead(WOMENS_META["spermidine-women"]),
  component: () => <WomensCompoundArticle c={SPERMIDINE_WOMEN} />,
});
