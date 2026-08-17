import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { VITEX } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/vitex")({
  head: () => womensCompoundHead(WOMENS_META["vitex"]),
  component: () => <WomensCompoundArticle c={VITEX} />,
});
