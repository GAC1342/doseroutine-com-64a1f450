import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { OMEGA_3_WOMEN } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/omega-3-women")({
  head: () => womensCompoundHead(WOMENS_META["omega-3-women"]),
  component: () => <WomensCompoundArticle c={OMEGA_3_WOMEN} />,
});
