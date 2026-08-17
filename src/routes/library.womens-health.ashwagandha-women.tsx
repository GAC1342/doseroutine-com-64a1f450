import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { ASHWAGANDHA_WOMEN } from "@/lib/womens-health/sexual-health-content";

export const Route = createFileRoute("/library/womens-health/ashwagandha-women")({
  head: () => womensCompoundHead(WOMENS_META["ashwagandha-women"]),
  component: () => <WomensCompoundArticle c={ASHWAGANDHA_WOMEN} />,
});
