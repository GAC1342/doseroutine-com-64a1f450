import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { EVENING_PRIMROSE } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/evening-primrose-oil")({
  head: () => womensCompoundHead(WOMENS_META["evening-primrose-oil"]),
  component: () => <WomensCompoundArticle c={EVENING_PRIMROSE} />,
});
