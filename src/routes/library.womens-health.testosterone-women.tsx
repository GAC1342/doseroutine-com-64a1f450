import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { TESTOSTERONE_WOMEN } from "@/lib/womens-health/sexual-health-content";

export const Route = createFileRoute("/library/womens-health/testosterone-women")({
  head: () => womensCompoundHead(WOMENS_META["testosterone-women"]),
  component: () => <WomensCompoundArticle c={TESTOSTERONE_WOMEN} />,
});
