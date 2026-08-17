import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { MACA_LIBIDO } from "@/lib/womens-health/sexual-health-content";

export const Route = createFileRoute("/library/womens-health/maca-libido")({
  head: () => womensCompoundHead(WOMENS_META["maca-libido"]),
  component: () => <WomensCompoundArticle c={MACA_LIBIDO} />,
});
