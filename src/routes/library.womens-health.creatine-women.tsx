import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { CREATINE_WOMEN } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/creatine-women")({
  head: () => womensCompoundHead(WOMENS_META["creatine-women"]),
  component: () => <WomensCompoundArticle c={CREATINE_WOMEN} />,
});
