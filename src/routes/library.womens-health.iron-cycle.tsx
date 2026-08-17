import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { IRON_CYCLE } from "@/lib/womens-health/fertility-content";

export const Route = createFileRoute("/library/womens-health/iron-cycle")({
  head: () => womensCompoundHead(WOMENS_META["iron-cycle"]),
  component: () => <WomensCompoundArticle c={IRON_CYCLE} />,
});
