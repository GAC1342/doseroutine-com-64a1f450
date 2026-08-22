import { createFileRoute } from "@tanstack/react-router";
import { RoundupPage, roundupHead } from "@/components/app-roundup-page";

// Landing page for the "best medication reminder app" / "pill reminder app"
// cluster. Content lives in the shared roundup dataset and is loaded in the
// route loader so it stays out of the shared client entry bundle.
export const Route = createFileRoute("/best-medication-reminder-app")({
  loader: async () => (await import("@/lib/app-roundups")).ROUNDUPS["best-medication-reminder-app"],
  head: ({ loaderData }) => (loaderData ? roundupHead(loaderData) : {}),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <RoundupPage data={data} />;
}
