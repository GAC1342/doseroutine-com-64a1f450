import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { RED_CLOVER } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/red-clover")({
  head: () => womensCompoundHead(WOMENS_META["red-clover"]),
  component: () => <WomensCompoundArticle c={RED_CLOVER} />,
});
