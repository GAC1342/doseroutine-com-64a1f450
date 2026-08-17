import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { COLLAGEN_PEPTIDES_WOMEN } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/collagen-peptides-women")({
  head: () => womensCompoundHead(WOMENS_META["collagen-peptides-women"]),
  component: () => <WomensCompoundArticle c={COLLAGEN_PEPTIDES_WOMEN} />,
});
