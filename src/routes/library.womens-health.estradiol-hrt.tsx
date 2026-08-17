import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { ESTRADIOL_HRT } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/estradiol-hrt")({
  head: () => womensCompoundHead(WOMENS_META["estradiol-hrt"]),
  component: () => <WomensCompoundArticle c={ESTRADIOL_HRT} />,
});
