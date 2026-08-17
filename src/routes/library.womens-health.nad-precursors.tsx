import { createFileRoute } from "@tanstack/react-router";
import { WomensCompoundArticle, womensCompoundHead } from "@/components/womens-compound-article";
import { WOMENS_META } from "@/lib/womens-health/meta";
import { NAD_PRECURSORS } from "@/lib/womens-health/longevity-content";

export const Route = createFileRoute("/library/womens-health/nad-precursors")({
  head: () => womensCompoundHead(WOMENS_META["nad-precursors"]),
  component: () => <WomensCompoundArticle c={NAD_PRECURSORS} />,
});
