import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { DHEA_WOMEN } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/dhea-women")({
  head: () => womensCompoundHead(WOMENS_META["dhea-women"]),
  component: () => <WomensCompoundArticle c={DHEA_WOMEN} />,
});
