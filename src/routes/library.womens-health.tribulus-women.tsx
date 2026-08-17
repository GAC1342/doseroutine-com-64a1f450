import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { TRIBULUS_WOMEN } from "@/lib/womens-health/sexual-health-content";

export const Route = createFileRoute("/library/womens-health/tribulus-women")({
  head: () => womensCompoundHead(WOMENS_META["tribulus-women"]),
  component: () => <WomensCompoundArticle c={TRIBULUS_WOMEN} />,
});
