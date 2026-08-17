import { createFileRoute } from "@tanstack/react-router";
import {UseCasePage, buildUseCaseHead} from "@/components/app-roundup-page";

// The roundup/use-case copy is a large static dataset shared by several
// marketing pages. Loading it in the route loader (rather than importing it at
// module scope) keeps it out of the shared client entry bundle every page
// downloads, while SSR still renders the full page and head tags.
export const Route = createFileRoute("/for/glp-1")({
  loader: async () => (await import("@/lib/app-roundups")).USE_CASES["glp-1"],
  head: ({ loaderData }) => (loaderData ? buildUseCaseHead(loaderData) : {}),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <UseCasePage data={data} />;
}
