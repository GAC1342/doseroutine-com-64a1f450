import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { L_ARGININE_WOMEN } from "@/lib/womens-health/sexual-health-content";

export const Route = createFileRoute("/library/womens-health/l-arginine-women")({
  head: () => womensCompoundHead(WOMENS_META["l-arginine-women"]),
  component: () => <WomensCompoundArticle c={L_ARGININE_WOMEN} />,
});
