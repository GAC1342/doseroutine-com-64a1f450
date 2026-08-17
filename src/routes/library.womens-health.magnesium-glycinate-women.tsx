import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { MAGNESIUM_GLYCINATE_WOMEN } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/magnesium-glycinate-women")({
  head: () => womensCompoundHead(WOMENS_META["magnesium-glycinate-women"]),
  component: () => <WomensCompoundArticle c={MAGNESIUM_GLYCINATE_WOMEN} />,
});
