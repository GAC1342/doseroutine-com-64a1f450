import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { VAGINAL_PROBIOTICS } from "@/lib/womens-health/sexual-health-content";

export const Route = createFileRoute("/library/womens-health/vaginal-probiotics")({
  head: () => womensCompoundHead(WOMENS_META["vaginal-probiotics"]),
  component: () => <WomensCompoundArticle c={VAGINAL_PROBIOTICS} />,
});
