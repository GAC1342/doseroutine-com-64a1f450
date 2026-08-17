import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { D_CHIRO_INOSITOL } from "@/lib/womens-health/fertility-content";

export const Route = createFileRoute("/library/womens-health/d-chiro-inositol")({
  head: () => womensCompoundHead(WOMENS_META["d-chiro-inositol"]),
  component: () => <WomensCompoundArticle c={D_CHIRO_INOSITOL} />,
});
