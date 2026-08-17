import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { FOLATE_VS_FOLIC_ACID } from "@/lib/womens-health/fertility-content";

export const Route = createFileRoute("/library/womens-health/folate-vs-folic-acid")({
  head: () => womensCompoundHead(WOMENS_META["folate-vs-folic-acid"]),
  component: () => <WomensCompoundArticle c={FOLATE_VS_FOLIC_ACID} />,
});
