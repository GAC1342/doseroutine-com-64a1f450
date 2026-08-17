import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { BLACK_COHOSH } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/black-cohosh")({
  head: () => womensCompoundHead(WOMENS_META["black-cohosh"]),
  component: () => <WomensCompoundArticle c={BLACK_COHOSH} />,
});
