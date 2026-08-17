export declare function collectRouteAssets(
  routes: Record<
    string,
    { children?: string[]; preloads?: string[]; scripts?: { attrs?: { src?: string } }[] }
  >,
  routeId: string,
): string[];

export declare function evaluate(input: {
  gzip: number;
  baseline?: number;
  tolerancePct: number;
  slackBytes: number;
  hardMaxGzip?: number;
}): string[];
