import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { MACA_MENOPAUSE } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/maca-menopause")({
  head: () => womensCompoundHead(WOMENS_META["maca-menopause"]),
  component: () => <WomensCompoundArticle c={MACA_MENOPAUSE} />,
});
