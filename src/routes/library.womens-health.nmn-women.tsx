import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { NMN_WOMEN } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/nmn-women")({
  head: () => womensCompoundHead(WOMENS_META["nmn-women"]),
  component: () => <WomensCompoundArticle c={NMN_WOMEN} />,
});
