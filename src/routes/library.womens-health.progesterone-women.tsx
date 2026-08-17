import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { PROGESTERONE_WOMEN } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/progesterone-women")({
  head: () => womensCompoundHead(WOMENS_META["progesterone-women"]),
  component: () => <WomensCompoundArticle c={PROGESTERONE_WOMEN} />,
});
