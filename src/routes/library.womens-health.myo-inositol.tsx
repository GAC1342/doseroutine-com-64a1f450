import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { MYO_INOSITOL } from "@/lib/womens-health/fertility-content";

export const Route = createFileRoute("/library/womens-health/myo-inositol")({
  head: () => womensCompoundHead(WOMENS_META["myo-inositol"]),
  component: () => <WomensCompoundArticle c={MYO_INOSITOL} />,
});
