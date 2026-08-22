import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { stripSvgXmlnsStream } from "./lib/strip-svg-xmlns";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Removes the redundant SVG xmlns attributes from streamed HTML documents so
// SEO audits stop counting them as insecure http:// references.
const htmlCleanupMiddleware = createMiddleware().server(async ({ next }) => {
  const result = (await next()) as unknown as { response?: Response } | Response;
  const response = result instanceof Response ? result : result?.response;
  if (!(response instanceof Response) || !response.body) return result as never;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return result as never;

  const piped = new Response(response.body.pipeThrough(stripSvgXmlnsStream()), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  if (result instanceof Response) return piped as never;
  return { ...(result as object), response: piped } as never;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, htmlCleanupMiddleware],
}));
