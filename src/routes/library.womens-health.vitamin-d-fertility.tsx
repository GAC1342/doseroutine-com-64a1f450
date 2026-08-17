import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { VITAMIN_D_FERTILITY } from "@/lib/womens-health/fertility-content";

export const Route = createFileRoute("/library/womens-health/vitamin-d-fertility")({
  head: () => womensCompoundHead(WOMENS_META["vitamin-d-fertility"]),
  component: () => <WomensCompoundArticle c={VITAMIN_D_FERTILITY} />,
});
