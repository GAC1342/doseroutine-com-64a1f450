import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { SOY_ISOFLAVONES } from "@/lib/womens-health/menopause-content";

export const Route = createFileRoute("/library/womens-health/soy-isoflavones")({
  head: () => womensCompoundHead(WOMENS_META["soy-isoflavones"]),
  component: () => <WomensCompoundArticle c={SOY_ISOFLAVONES} />,
});
