import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { RESVERATROL_WOMEN } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/resveratrol-women")({
  head: () => womensCompoundHead(WOMENS_META["resveratrol-women"]),
  component: () => <WomensCompoundArticle c={RESVERATROL_WOMEN} />,
});
