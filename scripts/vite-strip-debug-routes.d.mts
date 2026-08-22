export declare function routePathForDebugFile(id: string): string;
export declare function stubModule(routePath: string): string;
export declare function isDebugRouteFile(id: string): boolean;
export declare function stripDebugRoutes(options?: { enabled?: boolean }): {
  name: string;
  enforce: "pre";
  apply: "build";
  transform(code: string, id: string): { code: string; map: null } | null;
};
declare const _default: typeof stripDebugRoutes;
export default _default;
