import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { B6_LUTEAL } from "@/lib/womens-health/fertility-content";

export const Route = createFileRoute("/library/womens-health/b6-luteal")({
  head: () => womensCompoundHead(WOMENS_META["b6-luteal"]),
  component: () => <WomensCompoundArticle c={B6_LUTEAL} />,
});
